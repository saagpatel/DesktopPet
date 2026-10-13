use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::events::{EVENT_COINS_CHANGED, EVENT_PET_STATE_CHANGED};
use crate::models::{CoinBalance, PetEvent, PetQuest, PetState};

const MAX_PET_EVENTS: usize = 30;
const MAX_SPECIES_ID_CHARS: usize = 48;
const QUEST_ROLL_COOLDOWN_SECS: i64 = 20 * 60;
const QUEST_LAST_KIND_KEY: &str = "pet_last_quest_kind";
const QUEST_LAST_ROLL_KEY: &str = "pet_last_quest_roll_at";
const QUEST_RECENT_FOCUS_KEY: &str = "pet_recent_focus_progress";
const QUEST_RECENT_CARE_KEY: &str = "pet_recent_care_progress";
const ALLOWED_ANIMATIONS: &[&str] = &[
    "idle",
    "working",
    "break",
    "celebrating",
    "evolving",
    "clicked",
];
const ALLOWED_SKINS: &[&str] = &["classic", "neon", "pixel", "plush"];
const ALLOWED_SCENES: &[&str] = &["meadow", "forest", "space", "cozy_room"];

fn validate_variant(value: String, allowed: &[&str], label: &str) -> Result<String, String> {
    if allowed.iter().any(|candidate| *candidate == value) {
        Ok(value)
    } else {
        Err(format!("Invalid {}: {}", label, value))
    }
}

fn normalize_species_id(value: String) -> Result<String, String> {
    let normalized = value.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return Err("Species id cannot be empty".to_string());
    }
    if normalized.chars().count() > MAX_SPECIES_ID_CHARS {
        return Err("Species id is too long".to_string());
    }
    if !normalized
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err("Species id has invalid characters".to_string());
    }
    Ok(normalized)
}

fn normalize_evolution_thresholds(input: Option<Vec<u32>>) -> Vec<u32> {
    let mut values = input.unwrap_or_else(|| vec![0, 5, 15]);
    if values.len() < 3 {
        values = vec![0, 5, 15];
    }
    let stage1 = values[1].max(1);
    let stage2 = values[2].max(stage1.saturating_add(1));
    vec![0, stage1, stage2]
}

fn stage_for_total_pomodoros(total_pomodoros: u32, thresholds: &[u32]) -> u32 {
    if thresholds.len() < 3 {
        if total_pomodoros >= 15 {
            2
        } else if total_pomodoros >= 5 {
            1
        } else {
            0
        }
    } else if total_pomodoros >= thresholds[2] {
        2
    } else if total_pomodoros >= thresholds[1] {
        1
    } else {
        0
    }
}

fn clamp_metric(value: i64) -> u32 {
    value.clamp(0, 100) as u32
}

fn apply_care_decay(mut pet: PetState) -> PetState {
    let elapsed_hours = chrono::DateTime::parse_from_rfc3339(&pet.last_care_update_at)
        .ok()
        .and_then(|last| {
            let now = chrono::Utc::now();
            let diff = now.signed_duration_since(last.with_timezone(&chrono::Utc));
            i32::try_from(diff.num_hours()).ok()
        })
        .unwrap_or(0);

    if elapsed_hours <= 0 {
        return pet;
    }

    let elapsed_hours = i64::from(elapsed_hours);
    pet.energy = clamp_metric(pet.energy as i64 - elapsed_hours * 2);
    pet.hunger = clamp_metric(pet.hunger as i64 + elapsed_hours * 3);
    pet.cleanliness = clamp_metric(pet.cleanliness as i64 - elapsed_hours);
    pet.affection = clamp_metric(pet.affection as i64 - elapsed_hours / 2);
    pet.last_care_update_at = chrono::Utc::now().to_rfc3339();

    pet.mood = if pet.energy < 25 {
        "sleepy".to_string()
    } else if pet.hunger > 75 {
        "hungry".to_string()
    } else if pet.affection > 75 {
        "happy".to_string()
    } else if pet.cleanliness < 30 {
        "messy".to_string()
    } else {
        "content".to_string()
    };

    pet
}

fn load_pet(app: &AppHandle) -> Result<PetState, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let pet: PetState = match store.get("pet") {
        None => PetState::default(),
        Some(value) => serde_json::from_value(value)
            .map_err(|error| format!("Stored pet data is malformed: {error}"))?,
    };
    Ok(apply_care_decay(pet))
}

fn save_pet(app: &AppHandle, pet: &PetState) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set("pet", json!(pet));
    Ok(())
}

fn quest_target_for_stage(stage: u32) -> u32 {
    match stage {
        0 => 1,
        1 => 2,
        _ => 3,
    }
}

fn quest_reward_for_stage(stage: u32) -> u32 {
    12 + (stage * 4)
}

#[derive(Clone, Copy)]
enum QuestProgressKind {
    Focus,
    Care,
}

#[derive(Clone, Copy)]
struct QuestTemplate {
    kind: &'static str,
    title: &'static str,
    description: &'static str,
}

const QUEST_TEMPLATES: [QuestTemplate; 4] = [
    QuestTemplate {
        kind: "focus_sessions",
        title: "Steady Focus",
        description: "Complete calm focus sessions with your companion.",
    },
    QuestTemplate {
        kind: "care_actions",
        title: "Hydration Habit",
        description: "Use gentle care actions to keep your companion nourished.",
    },
    QuestTemplate {
        kind: "balanced_routine",
        title: "Balanced Rhythm",
        description: "Mix focus sessions and care actions for a calm routine.",
    },
    QuestTemplate {
        kind: "mindful_reset",
        title: "Mindful Reset",
        description: "Use short care resets between work blocks to recharge calmly.",
    },
];

fn quest_accepts_progress(kind: &str, progress_kind: QuestProgressKind) -> bool {
    match kind {
        "focus_sessions" => matches!(progress_kind, QuestProgressKind::Focus),
        "care_actions" | "mindful_reset" => matches!(progress_kind, QuestProgressKind::Care),
        "balanced_routine" => true,
        _ => false,
    }
}

fn create_quest_for_pet(
    pet: &PetState,
    last_quest_kind: Option<&str>,
    recent_focus: u32,
    recent_care: u32,
) -> PetQuest {
    let template = select_quest_template_for_pet(pet, last_quest_kind, recent_focus, recent_care);
    let stage_target = quest_target_for_stage(pet.current_stage);
    build_quest_from_template(template, pet.current_stage, stage_target)
}

fn build_quest_from_template(template: QuestTemplate, stage: u32, stage_target: u32) -> PetQuest {
    let target_sessions = match template.kind {
        "care_actions" => stage_target + 1,
        "balanced_routine" => stage_target + 1,
        "mindful_reset" => stage_target + 2,
        _ => stage_target,
    };
    let reward = match template.kind {
        "care_actions" => quest_reward_for_stage(stage).saturating_sub(2).max(8),
        "balanced_routine" => quest_reward_for_stage(stage).saturating_add(2),
        "mindful_reset" => quest_reward_for_stage(stage).saturating_add(1),
        _ => quest_reward_for_stage(stage),
    };

    PetQuest {
        id: uuid::Uuid::new_v4().to_string(),
        kind: template.kind.to_string(),
        title: template.title.to_string(),
        description: template.description.to_string(),
        target_sessions,
        completed_sessions: 0,
        reward_coins: reward,
        created_at: chrono::Utc::now().to_rfc3339(),
    }
}

fn quest_stage_score(kind: &str, stage: u32) -> i32 {
    match (kind, stage) {
        ("focus_sessions", 0) => 4,
        ("focus_sessions", 1) => 3,
        ("focus_sessions", _) => 2,
        ("care_actions", 0) => 3,
        ("care_actions", 1) => 3,
        ("care_actions", _) => 4,
        ("balanced_routine", 0) => 3,
        ("balanced_routine", 1) => 4,
        ("balanced_routine", _) => 4,
        ("mindful_reset", 0) => 2,
        ("mindful_reset", 1) => 3,
        ("mindful_reset", _) => 4,
        _ => 2,
    }
}

fn quest_mix_score(kind: &str, recent_focus: u32, recent_care: u32) -> i32 {
    if recent_focus > recent_care.saturating_add(1) {
        match kind {
            "care_actions" | "mindful_reset" => 2,
            "balanced_routine" => 1,
            "focus_sessions" => -1,
            _ => 0,
        }
    } else if recent_care > recent_focus.saturating_add(1) {
        match kind {
            "focus_sessions" => 2,
            "balanced_routine" => 1,
            "care_actions" => -1,
            _ => 0,
        }
    } else {
        0
    }
}

fn quest_accessory_score(kind: &str, accessories: &[String]) -> i32 {
    let mut score = 0;
    for accessory in accessories {
        score += match accessory.as_str() {
            "apple" | "cookie" => match kind {
                "care_actions" | "mindful_reset" => 1,
                _ => 0,
            },
            "party_hat" | "bow_tie" => match kind {
                "focus_sessions" | "balanced_routine" => 1,
                _ => 0,
            },
            "scarf" | "sunglasses" => match kind {
                "mindful_reset" | "balanced_routine" => 1,
                _ => 0,
            },
            _ => 0,
        };
    }
    score.min(3)
}

fn quest_total_score(
    template: QuestTemplate,
    pet: &PetState,
    last_quest_kind: Option<&str>,
    recent_focus: u32,
    recent_care: u32,
) -> i32 {
    let mut score = quest_stage_score(template.kind, pet.current_stage)
        + quest_mix_score(template.kind, recent_focus, recent_care)
        + quest_accessory_score(template.kind, &pet.accessories);
    if Some(template.kind) == last_quest_kind {
        score -= 3;
    }
    score.max(1)
}

fn select_quest_template_for_pet(
    pet: &PetState,
    last_quest_kind: Option<&str>,
    recent_focus: u32,
    recent_care: u32,
) -> QuestTemplate {
    let offset = (pet.total_pomodoros + pet.current_stage + recent_focus + recent_care) as usize
        % QUEST_TEMPLATES.len();
    let mut ranked = Vec::with_capacity(QUEST_TEMPLATES.len());
    for step in 0..QUEST_TEMPLATES.len() {
        let candidate = QUEST_TEMPLATES[(offset + step) % QUEST_TEMPLATES.len()];
        ranked.push((
            candidate,
            quest_total_score(candidate, pet, last_quest_kind, recent_focus, recent_care),
        ));
    }
    ranked.sort_by(
        |(left_template, left_score), (right_template, right_score)| {
            right_score
                .cmp(left_score)
                .then_with(|| left_template.kind.cmp(right_template.kind))
        },
    );
    if let Some(last_kind) = last_quest_kind {
        if let Some((template, score)) = ranked.first().copied() {
            if template.kind == last_kind {
                if let Some((alternative, alternative_score)) = ranked
                    .iter()
                    .copied()
                    .find(|(candidate, _)| candidate.kind != last_kind)
                {
                    if alternative_score >= score - 1 {
                        return alternative;
                    }
                }
            }
            return template;
        }
    }
    ranked
        .first()
        .map(|(template, _)| *template)
        .unwrap_or(QUEST_TEMPLATES[0])
}

fn load_recent_quest_progress(app: &AppHandle) -> Result<(u32, u32), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let focus: u32 = store
        .get(QUEST_RECENT_FOCUS_KEY)
        .and_then(|value| serde_json::from_value(value).ok())
        .unwrap_or(0);
    let care: u32 = store
        .get(QUEST_RECENT_CARE_KEY)
        .and_then(|value| serde_json::from_value(value).ok())
        .unwrap_or(0);
    Ok((focus.min(12), care.min(12)))
}

fn save_recent_quest_progress(app: &AppHandle, focus: u32, care: u32) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set(QUEST_RECENT_FOCUS_KEY, json!(focus.min(12)));
    store.set(QUEST_RECENT_CARE_KEY, json!(care.min(12)));
    Ok(())
}

fn record_recent_quest_progress(
    app: &AppHandle,
    progress_kind: QuestProgressKind,
    delta: u32,
) -> Result<(), String> {
    if delta == 0 {
        return Ok(());
    }
    let (mut focus, mut care) = load_recent_quest_progress(app)?;
    let bump = delta.min(3);
    match progress_kind {
        QuestProgressKind::Focus => {
            focus = focus.saturating_add(bump).min(12);
            care = care.saturating_sub(1);
        }
        QuestProgressKind::Care => {
            care = care.saturating_add(bump).min(12);
            focus = focus.saturating_sub(1);
        }
    }
    save_recent_quest_progress(app, focus, care)
}

fn apply_quest_progress(
    mut quest: PetQuest,
    progress_kind: QuestProgressKind,
    delta: u32,
) -> (PetQuest, bool, bool) {
    if !quest_accepts_progress(&quest.kind, progress_kind) {
        return (quest, false, false);
    }
    quest.completed_sessions = quest.completed_sessions.saturating_add(delta);
    let completed = quest.completed_sessions >= quest.target_sessions;
    (quest, true, completed)
}

fn load_last_quest_kind(app: &AppHandle) -> Result<Option<String>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    Ok(store
        .get(QUEST_LAST_KIND_KEY)
        .and_then(|value| serde_json::from_value(value).ok()))
}

fn save_last_quest_kind(app: &AppHandle, quest_kind: &str) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set(QUEST_LAST_KIND_KEY, json!(quest_kind));
    Ok(())
}

fn load_last_quest_roll_at(
    app: &AppHandle,
) -> Result<Option<chrono::DateTime<chrono::Utc>>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let raw: Option<String> = store
        .get(QUEST_LAST_ROLL_KEY)
        .and_then(|value| serde_json::from_value(value).ok());
    Ok(raw.and_then(|timestamp| {
        chrono::DateTime::parse_from_rfc3339(&timestamp)
            .ok()
            .map(|parsed| parsed.with_timezone(&chrono::Utc))
    }))
}

fn save_last_quest_roll_at(app: &AppHandle, timestamp: &str) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set(QUEST_LAST_ROLL_KEY, json!(timestamp));
    Ok(())
}

fn cooldown_remaining_secs(
    last_roll: Option<chrono::DateTime<chrono::Utc>>,
    now: chrono::DateTime<chrono::Utc>,
) -> i64 {
    let Some(last) = last_roll else {
        return 0;
    };
    let elapsed = now.signed_duration_since(last).num_seconds();
    (QUEST_ROLL_COOLDOWN_SECS - elapsed).max(0)
}

fn quest_roll_cooldown_remaining(
    app: &AppHandle,
    now: chrono::DateTime<chrono::Utc>,
) -> Result<i64, String> {
    let last_roll = load_last_quest_roll_at(app)?;
    Ok(cooldown_remaining_secs(last_roll, now))
}

fn load_events(app: &AppHandle) -> Result<Vec<PetEvent>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    Ok(store
        .get("pet_events")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

fn save_events(app: &AppHandle, events: &[PetEvent]) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set("pet_events", json!(events));
    Ok(())
}

fn save_bounded_events(
    app: &AppHandle,
    mut events: Vec<PetEvent>,
) -> Result<Vec<PetEvent>, String> {
    events.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    if events.len() > MAX_PET_EVENTS {
        events.truncate(MAX_PET_EVENTS);
    }
    save_events(app, &events)?;
    Ok(events)
}

fn append_event(
    app: &AppHandle,
    kind: &str,
    description: String,
    resolved: bool,
) -> Result<(), String> {
    let mut events = load_events(app)?;
    events.push(PetEvent {
        id: uuid::Uuid::new_v4().to_string(),
        kind: kind.to_string(),
        description,
        created_at: chrono::Utc::now().to_rfc3339(),
        resolved,
    });
    let _ = save_bounded_events(app, events)?;
    Ok(())
}

fn load_active_quest(app: &AppHandle) -> Result<Option<PetQuest>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    Ok(store
        .get("pet_active_quest")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or(None))
}

fn save_active_quest(app: &AppHandle, quest: Option<&PetQuest>) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set("pet_active_quest", json!(quest));
    Ok(())
}

#[tauri::command]
pub fn get_pet_state(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
) -> Result<PetState, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let pet = load_pet(&app)?;
    save_pet(&app, &pet)?;
    Ok(pet)
}

#[tauri::command]
pub fn set_pet_animation(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    animation: String,
) -> Result<PetState, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let animation = validate_variant(animation, ALLOWED_ANIMATIONS, "animation state")?;
    let mut pet = load_pet(&app)?;
    pet.animation_state = animation;
    save_pet(&app, &pet)?;
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);
    Ok(pet)
}

#[tauri::command]
pub fn pet_interact(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    action: String,
) -> Result<PetState, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let mut pet = load_pet(&app)?;

    match action.as_str() {
        "pet" => {
            pet.affection = clamp_metric(pet.affection as i64 + 8);
            pet.energy = clamp_metric(pet.energy as i64 - 1);
            pet.animation_state = "clicked".to_string();
        }
        "feed" => {
            pet.hunger = clamp_metric(pet.hunger as i64 - 25);
            pet.affection = clamp_metric(pet.affection as i64 + 4);
            pet.animation_state = "celebrating".to_string();
        }
        "play" => {
            pet.affection = clamp_metric(pet.affection as i64 + 10);
            pet.energy = clamp_metric(pet.energy as i64 - 8);
            pet.cleanliness = clamp_metric(pet.cleanliness as i64 - 4);
            pet.animation_state = "celebrating".to_string();
        }
        "nap" => {
            pet.energy = clamp_metric(pet.energy as i64 + 20);
            pet.hunger = clamp_metric(pet.hunger as i64 + 8);
            pet.animation_state = "break".to_string();
        }
        "clean" => {
            pet.cleanliness = clamp_metric(pet.cleanliness as i64 + 22);
            pet.affection = clamp_metric(pet.affection as i64 + 3);
            pet.animation_state = "idle".to_string();
        }
        "train" => {
            pet.energy = clamp_metric(pet.energy as i64 - 12);
            pet.hunger = clamp_metric(pet.hunger as i64 + 12);
            pet.affection = clamp_metric(pet.affection as i64 + 6);
            pet.animation_state = "working".to_string();
        }
        _ => return Err("Unknown pet interaction".to_string()),
    }

    pet.last_interaction = Some(action.clone());
    pet.last_care_update_at = chrono::Utc::now().to_rfc3339();
    pet = apply_care_decay(pet);

    let event_message = format!(
        "Action '{}' -> mood {}, energy {}%, hunger {}%, affection {}%",
        action, pet.mood, pet.energy, pet.hunger, pet.affection
    );
    let _ = append_event(&app, "interaction", event_message, true);

    save_pet(&app, &pet)?;
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);
    let _ = advance_care_quest(&app, 1);
    Ok(pet)
}

#[tauri::command]
pub fn set_pet_customization(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    skin: Option<String>,
    scene: Option<String>,
) -> Result<PetState, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let mut pet = load_pet(&app)?;
    if let Some(skin) = skin {
        pet.skin = validate_variant(skin, ALLOWED_SKINS, "pet skin")?;
    }
    if let Some(scene) = scene {
        pet.scene = validate_variant(scene, ALLOWED_SCENES, "pet scene")?;
    }
    save_pet(&app, &pet)?;
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);
    Ok(pet)
}

#[tauri::command]
pub fn set_pet_species(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    species_id: String,
    evolution_thresholds: Option<Vec<u32>>,
) -> Result<PetState, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let mut pet = load_pet(&app)?;
    pet.species_id = normalize_species_id(species_id)?;
    pet.evolution_thresholds = normalize_evolution_thresholds(evolution_thresholds);
    pet.current_stage = stage_for_total_pomodoros(pet.total_pomodoros, &pet.evolution_thresholds);
    pet.last_interaction = Some("species_switch".to_string());
    save_pet(&app, &pet)?;
    let _ = append_event(
        &app,
        "species",
        format!("Switched species to '{}'.", pet.species_id),
        true,
    );
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);
    Ok(pet)
}

#[tauri::command]
pub fn get_pet_events(app: AppHandle) -> Result<Vec<PetEvent>, String> {
    load_events(&app)
}

#[tauri::command]
pub fn get_pet_active_quest(app: AppHandle) -> Result<Option<PetQuest>, String> {
    load_active_quest(&app)
}

#[tauri::command]
pub fn resolve_pet_event(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    event_id: String,
) -> Result<Vec<PetEvent>, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let mut events = load_events(&app)?;
    if let Some(event) = events.iter_mut().find(|item| item.id == event_id) {
        event.resolved = true;
    }
    save_bounded_events(&app, events)
}

pub fn advance_focus_quest(
    app: &AppHandle,
    completed_sessions: u32,
) -> Result<Option<PetEvent>, String> {
    progress_active_quest(app, QuestProgressKind::Focus, completed_sessions)
}

pub fn advance_care_quest(
    app: &AppHandle,
    completed_actions: u32,
) -> Result<Option<PetEvent>, String> {
    progress_active_quest(app, QuestProgressKind::Care, completed_actions)
}

fn progress_active_quest(
    app: &AppHandle,
    progress_kind: QuestProgressKind,
    delta: u32,
) -> Result<Option<PetEvent>, String> {
    let quest = match load_active_quest(app)? {
        Some(quest) => quest,
        None => return Ok(None),
    };

    let (quest, progressed, completed) = apply_quest_progress(quest, progress_kind, delta);
    if !progressed {
        return Ok(None);
    }
    let _ = record_recent_quest_progress(app, progress_kind, delta);

    if !completed {
        save_active_quest(app, Some(&quest))?;
        let _ = append_event(
            app,
            "quest_progress",
            format!(
                "Quest progress: {} ({}/{})",
                quest.title, quest.completed_sessions, quest.target_sessions
            ),
            true,
        );
        return Ok(None);
    }

    save_active_quest(app, None)?;

    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let mut coins: CoinBalance = store
        .get("coins")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    coins.total = coins.total.saturating_add(quest.reward_coins);
    store.set("coins", json!(coins));
    let _ = app.emit(EVENT_COINS_CHANGED, &coins);

    let mut pet = load_pet(app)?;
    pet.affection = clamp_metric(pet.affection as i64 + 12);
    pet.energy = clamp_metric(pet.energy as i64 + 4);
    pet.mood = "proud".to_string();
    pet.animation_state = "celebrating".to_string();
    pet.last_interaction = Some("quest_complete".to_string());
    save_pet(app, &pet)?;
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);

    let mut events = load_events(app)?;
    for event in events.iter_mut() {
        if event.kind == "quest" && !event.resolved {
            event.resolved = true;
        }
    }

    let completion = PetEvent {
        id: uuid::Uuid::new_v4().to_string(),
        kind: "quest_complete".to_string(),
        description: format!(
            "Quest complete: {} (+{} coins)",
            quest.title, quest.reward_coins
        ),
        created_at: chrono::Utc::now().to_rfc3339(),
        resolved: false,
    };
    events.push(completion.clone());
    let _ = save_bounded_events(app, events)?;
    Ok(Some(completion))
}

#[tauri::command]
pub fn roll_pet_event(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
) -> Result<PetEvent, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let pet = load_pet(&app)?;
    let now = chrono::Utc::now();
    let active_quest = load_active_quest(&app)?;
    let event = if pet.hunger > 70 {
        PetEvent {
            id: uuid::Uuid::new_v4().to_string(),
            kind: "need".to_string(),
            description: "Your pet looks peckish. A snack would help.".to_string(),
            created_at: now.to_rfc3339(),
            resolved: false,
        }
    } else if pet.energy < 30 {
        PetEvent {
            id: uuid::Uuid::new_v4().to_string(),
            kind: "rest".to_string(),
            description: "Your pet seems low-energy. A short nap would help.".to_string(),
            created_at: now.to_rfc3339(),
            resolved: false,
        }
    } else if pet.affection < 40 {
        PetEvent {
            id: uuid::Uuid::new_v4().to_string(),
            kind: "bond".to_string(),
            description: "Your pet would enjoy a small moment of attention.".to_string(),
            created_at: now.to_rfc3339(),
            resolved: false,
        }
    } else if let Some(quest) = active_quest {
        PetEvent {
            id: uuid::Uuid::new_v4().to_string(),
            kind: "quest".to_string(),
            description: format!(
                "Quest in progress: {} ({}/{}) [{}]",
                quest.title, quest.completed_sessions, quest.target_sessions, quest.kind
            ),
            created_at: now.to_rfc3339(),
            resolved: false,
        }
    } else {
        let cooldown_remaining = quest_roll_cooldown_remaining(&app, now)?;
        if cooldown_remaining > 0 {
            let minutes = ((cooldown_remaining as f64) / 60.0).ceil() as i64;
            return Ok(PetEvent {
                id: uuid::Uuid::new_v4().to_string(),
                kind: "quiet".to_string(),
                description: format!(
                    "Quiet mode: next new quest available in about {} min.",
                    minutes
                ),
                created_at: now.to_rfc3339(),
                resolved: true,
            });
        }
        let (recent_focus, recent_care) = load_recent_quest_progress(&app)?;
        let quest = create_quest_for_pet(
            &pet,
            load_last_quest_kind(&app)?.as_deref(),
            recent_focus,
            recent_care,
        );
        save_active_quest(&app, Some(&quest))?;
        save_last_quest_kind(&app, &quest.kind)?;
        save_last_quest_roll_at(&app, &now.to_rfc3339())?;
        PetEvent {
            id: uuid::Uuid::new_v4().to_string(),
            kind: "quest".to_string(),
            description: format!(
                "Quest started: {} (0/{}) [{}] for +{} coins.",
                quest.title, quest.target_sessions, quest.kind, quest.reward_coins
            ),
            created_at: now.to_rfc3339(),
            resolved: false,
        }
    };

    let mut events = load_events(&app)?;
    let duplicate_unresolved = events.iter().any(|existing| {
        !existing.resolved
            && existing.kind == event.kind
            && existing.description == event.description
    });
    if !duplicate_unresolved {
        events.push(event.clone());
        let _ = save_bounded_events(&app, events)?;
    }
    Ok(event)
}

#[cfg(test)]
mod tests {
    use super::{
        apply_quest_progress, cooldown_remaining_secs, create_quest_for_pet,
        normalize_evolution_thresholds, normalize_species_id, quest_reward_for_stage,
        quest_target_for_stage, select_quest_template_for_pet, validate_variant, QuestProgressKind,
        ALLOWED_ANIMATIONS,
    };
    use crate::models::{PetQuest, PetState};

    #[test]
    fn quest_target_scales_by_stage() {
        assert_eq!(quest_target_for_stage(0), 1);
        assert_eq!(quest_target_for_stage(1), 2);
        assert_eq!(quest_target_for_stage(2), 3);
        assert_eq!(quest_target_for_stage(4), 3);
    }

    #[test]
    fn quest_reward_scales_by_stage() {
        assert_eq!(quest_reward_for_stage(0), 12);
        assert_eq!(quest_reward_for_stage(1), 16);
        assert_eq!(quest_reward_for_stage(2), 20);
    }

    #[test]
    fn validate_variant_rejects_unknown() {
        let err =
            validate_variant("unknown".to_string(), ALLOWED_ANIMATIONS, "animation").unwrap_err();
        assert!(err.contains("Invalid animation"));
    }

    #[test]
    fn normalize_species_id_accepts_slug() {
        let normalized = normalize_species_id(" Axolotl-Blue ".to_string()).unwrap();
        assert_eq!(normalized, "axolotl-blue");
    }

    #[test]
    fn normalize_evolution_thresholds_repairs_invalid_input() {
        assert_eq!(
            normalize_evolution_thresholds(Some(vec![0, 0, 0])),
            vec![0, 1, 2]
        );
        assert_eq!(
            normalize_evolution_thresholds(Some(vec![0, 8, 4])),
            vec![0, 8, 9]
        );
    }

    #[test]
    fn apply_quest_progress_ignores_other_kinds() {
        let quest = PetQuest {
            id: "q1".to_string(),
            kind: "care_actions".to_string(),
            title: "Gentle Care".to_string(),
            description: "Do care actions".to_string(),
            target_sessions: 2,
            completed_sessions: 0,
            reward_coins: 10,
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };

        let (updated, progressed, completed) =
            apply_quest_progress(quest, QuestProgressKind::Focus, 1);
        assert_eq!(updated.completed_sessions, 0);
        assert!(!progressed);
        assert!(!completed);
    }

    #[test]
    fn apply_quest_progress_marks_completion() {
        let quest = PetQuest {
            id: "q2".to_string(),
            kind: "focus_sessions".to_string(),
            title: "Steady Focus".to_string(),
            description: "Do focus sessions".to_string(),
            target_sessions: 2,
            completed_sessions: 1,
            reward_coins: 10,
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };

        let (updated, progressed, completed) =
            apply_quest_progress(quest, QuestProgressKind::Focus, 1);
        assert!(progressed);
        assert!(completed);
        assert_eq!(updated.completed_sessions, 2);
    }

    #[test]
    fn apply_quest_progress_balanced_routine_accepts_care_and_focus() {
        let quest = PetQuest {
            id: "q3".to_string(),
            kind: "balanced_routine".to_string(),
            title: "Balanced Rhythm".to_string(),
            description: "Mix focus and care".to_string(),
            target_sessions: 3,
            completed_sessions: 1,
            reward_coins: 14,
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        let (after_focus, progressed_focus, _) =
            apply_quest_progress(quest, QuestProgressKind::Focus, 1);
        assert!(progressed_focus);
        assert_eq!(after_focus.completed_sessions, 2);

        let (after_care, progressed_care, completed) =
            apply_quest_progress(after_focus, QuestProgressKind::Care, 1);
        assert!(progressed_care);
        assert!(completed);
        assert_eq!(after_care.completed_sessions, 3);
    }

    #[test]
    fn create_quest_for_pet_avoids_recent_kind_when_possible() {
        let pet = PetState {
            total_pomodoros: 4,
            ..PetState::default()
        };
        let quest = create_quest_for_pet(&pet, Some("focus_sessions"), 2, 1);
        assert_ne!(quest.kind, "focus_sessions");
    }

    #[test]
    fn quest_selection_prefers_care_when_recent_focus_is_high() {
        let pet = PetState {
            current_stage: 2,
            ..PetState::default()
        };
        let template = select_quest_template_for_pet(&pet, Some("focus_sessions"), 6, 1);
        assert!(template.kind == "care_actions" || template.kind == "mindful_reset");
    }

    #[test]
    fn quest_selection_accounts_for_accessory_bias() {
        let pet = PetState {
            current_stage: 2,
            accessories: vec!["apple".to_string(), "cookie".to_string()],
            ..PetState::default()
        };
        let quest = create_quest_for_pet(&pet, None, 1, 1);
        assert!(quest.kind == "care_actions" || quest.kind == "mindful_reset");
    }

    #[test]
    fn cooldown_remaining_is_zero_without_last_roll() {
        let now = chrono::Utc::now();
        assert_eq!(cooldown_remaining_secs(None, now), 0);
    }

    #[test]
    fn cooldown_remaining_tracks_future_window() {
        let now = chrono::Utc::now();
        let last_roll = now - chrono::Duration::minutes(5);
        let remaining = cooldown_remaining_secs(Some(last_roll), now);
        assert!(remaining > 0);
        assert!(remaining <= 15 * 60);
    }
}
