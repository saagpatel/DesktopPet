use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::{
    events::{EVENT_PET_STATE_CHANGED, EVENT_SETTINGS_CHANGED},
    models::{Settings, SettingsPatch},
};

const ALLOWED_PRESETS: &[&str] = &["short", "standard", "long"];
const ALLOWED_THEMES: &[&str] = &["sunrise", "dusk", "mint", "mono"];
const ALLOWED_SKINS: &[&str] = &["classic", "neon", "pixel", "plush"];
const ALLOWED_SCENES: &[&str] = &["meadow", "forest", "space", "cozy_room"];
const ALLOWED_ANIMATION_BUDGETS: &[&str] = &["low", "medium", "high"];
const ALLOWED_NOTIFICATION_EVENTS: &[&str] = &[
    "session_start",
    "break_start",
    "session_complete",
    "timer_idle",
    "guardrail_alert",
];
const MAX_FOCUS_LIST_ITEMS: usize = 50;
const MAX_FOCUS_LIST_ENTRY_CHARS: usize = 120;
const MAX_SEASONAL_PACKS: usize = 12;
const MAX_SEASONAL_PACK_ID_CHARS: usize = 64;
const MIN_TYPING_THRESHOLD_CPM: u32 = 80;
const MAX_TYPING_THRESHOLD_CPM: u32 = 420;

fn is_allowed(value: &str, allowed: &[&str]) -> bool {
    allowed.contains(&value)
}

fn normalize_host_pattern(value: &str) -> Option<String> {
    let mut normalized = value.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return None;
    }
    normalized = normalized
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .split('/')
        .next()
        .unwrap_or_default()
        .split('?')
        .next()
        .unwrap_or_default()
        .split('#')
        .next()
        .unwrap_or_default()
        .trim()
        .trim_matches('.')
        .to_string();
    if normalized.is_empty() {
        return None;
    }
    if normalized.chars().count() > MAX_FOCUS_LIST_ENTRY_CHARS {
        return None;
    }
    if !normalized
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '.' || ch == '-')
    {
        return None;
    }
    Some(normalized)
}

fn normalize_host_list(input: Vec<String>) -> Vec<String> {
    let mut output = Vec::new();
    for host in input {
        if output.len() >= MAX_FOCUS_LIST_ITEMS {
            break;
        }
        let Some(normalized) = normalize_host_pattern(&host) else {
            continue;
        };
        if !output.contains(&normalized) {
            output.push(normalized);
        }
    }
    output
}

pub(crate) fn sanitize_settings(settings: &mut Settings) {
    if !is_allowed(&settings.timer_preset, ALLOWED_PRESETS) {
        settings.timer_preset = "standard".to_string();
    }
    if !is_allowed(&settings.ui_theme, ALLOWED_THEMES) {
        settings.ui_theme = "sunrise".to_string();
    }
    if !is_allowed(&settings.pet_skin, ALLOWED_SKINS) {
        settings.pet_skin = "classic".to_string();
    }
    if !is_allowed(&settings.pet_scene, ALLOWED_SCENES) {
        settings.pet_scene = "meadow".to_string();
    }
    if !is_allowed(&settings.animation_budget, ALLOWED_ANIMATION_BUDGETS) {
        settings.animation_budget = "medium".to_string();
    }
    settings.sound_volume = if settings.sound_volume.is_finite() {
        settings.sound_volume.clamp(0.0, 1.0)
    } else {
        0.7
    };
    settings.notification_whitelist =
        normalize_notification_whitelist(std::mem::take(&mut settings.notification_whitelist));
    settings.meeting_hosts = normalize_host_list(std::mem::take(&mut settings.meeting_hosts));
    settings.heavy_typing_threshold_cpm = settings
        .heavy_typing_threshold_cpm
        .clamp(MIN_TYPING_THRESHOLD_CPM, MAX_TYPING_THRESHOLD_CPM);
    settings.enabled_seasonal_packs =
        normalize_pack_ids(std::mem::take(&mut settings.enabled_seasonal_packs));
    settings.validated_species_packs =
        normalize_pack_ids(std::mem::take(&mut settings.validated_species_packs));
    if settings.validated_species_packs.is_empty() {
        settings.validated_species_packs.push("penguin".to_string());
    }
    settings.focus_allowlist = normalize_host_list(std::mem::take(&mut settings.focus_allowlist));
    settings.focus_blocklist = normalize_host_list(std::mem::take(&mut settings.focus_blocklist));
}

fn normalize_notification_whitelist(input: Vec<String>) -> Vec<String> {
    let mut output = Vec::new();
    for event in input {
        let normalized = event.trim().to_ascii_lowercase();
        if normalized.is_empty() {
            continue;
        }
        if !ALLOWED_NOTIFICATION_EVENTS
            .iter()
            .any(|candidate| *candidate == normalized)
        {
            continue;
        }
        if !output.contains(&normalized) {
            output.push(normalized);
        }
    }

    if output.is_empty() {
        vec![
            "session_complete".to_string(),
            "guardrail_alert".to_string(),
        ]
    } else {
        output
    }
}

fn normalize_pack_ids(input: Vec<String>) -> Vec<String> {
    let mut output = Vec::new();
    for id in input {
        if output.len() >= MAX_SEASONAL_PACKS {
            break;
        }
        let normalized = id.trim().to_ascii_lowercase();
        if normalized.is_empty() || normalized.chars().count() > MAX_SEASONAL_PACK_ID_CHARS {
            continue;
        }
        if !normalized
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
        {
            continue;
        }
        if !output.contains(&normalized) {
            output.push(normalized);
        }
    }
    output
}

fn sanitize_patch(mut patch: SettingsPatch) -> Result<SettingsPatch, String> {
    if let Some(preset) = patch.timer_preset.as_deref() {
        if !is_allowed(preset, ALLOWED_PRESETS) {
            return Err(format!("Invalid timer preset: {}", preset));
        }
    }
    if let Some(theme) = patch.ui_theme.as_deref() {
        if !is_allowed(theme, ALLOWED_THEMES) {
            return Err(format!("Invalid UI theme: {}", theme));
        }
    }
    if let Some(animation_budget) = patch.animation_budget.as_deref() {
        if !is_allowed(animation_budget, ALLOWED_ANIMATION_BUDGETS) {
            return Err(format!("Invalid animation budget: {}", animation_budget));
        }
    }
    if let Some(skin) = patch.pet_skin.as_deref() {
        if !is_allowed(skin, ALLOWED_SKINS) {
            return Err(format!("Invalid pet skin: {}", skin));
        }
    }
    if let Some(scene) = patch.pet_scene.as_deref() {
        if !is_allowed(scene, ALLOWED_SCENES) {
            return Err(format!("Invalid pet scene: {}", scene));
        }
    }
    if let Some(volume) = patch.sound_volume {
        patch.sound_volume = Some(if volume.is_finite() {
            volume.clamp(0.0, 1.0)
        } else {
            0.7
        });
    }
    if let Some(whitelist) = patch.notification_whitelist.take() {
        patch.notification_whitelist = Some(normalize_notification_whitelist(whitelist));
    }
    if let Some(meeting_hosts) = patch.meeting_hosts.take() {
        patch.meeting_hosts = Some(normalize_host_list(meeting_hosts));
    }
    if let Some(threshold) = patch.heavy_typing_threshold_cpm {
        patch.heavy_typing_threshold_cpm =
            Some(threshold.clamp(MIN_TYPING_THRESHOLD_CPM, MAX_TYPING_THRESHOLD_CPM));
    }
    if let Some(enabled_seasonal_packs) = patch.enabled_seasonal_packs.take() {
        patch.enabled_seasonal_packs = Some(normalize_pack_ids(enabled_seasonal_packs));
    }
    if let Some(validated_species_packs) = patch.validated_species_packs.take() {
        patch.validated_species_packs = Some(normalize_pack_ids(validated_species_packs));
    }
    if let Some(allowlist) = patch.focus_allowlist.take() {
        patch.focus_allowlist = Some(normalize_host_list(allowlist));
    }
    if let Some(blocklist) = patch.focus_blocklist.take() {
        patch.focus_blocklist = Some(normalize_host_list(blocklist));
    }

    Ok(patch)
}

fn load_settings(app: &AppHandle) -> Result<Settings, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let mut settings = store
        .get("settings")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    sanitize_settings(&mut settings);
    Ok(settings)
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    load_settings(&app)
}

#[tauri::command]
pub fn update_settings(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    patch: SettingsPatch,
) -> Result<Settings, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let patch = sanitize_patch(patch)?;
    let patch_copy = patch.clone();
    let mut settings = load_settings(&app)?;
    patch.apply_to(&mut settings);
    sanitize_settings(&mut settings);

    store.set("settings", json!(settings));
    let _ = app.emit(EVENT_SETTINGS_CHANGED, &settings);

    if patch_copy.pet_skin.is_some() || patch_copy.pet_scene.is_some() {
        let mut pet: crate::models::PetState = store
            .get("pet")
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();
        if let Some(skin) = patch_copy.pet_skin {
            pet.skin = skin;
        }
        if let Some(scene) = patch_copy.pet_scene {
            pet.scene = scene;
        }
        store.set("pet", json!(pet));
        let _ = app.emit(EVENT_PET_STATE_CHANGED, pet);
    }

    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::{normalize_host_list, normalize_host_pattern, normalize_pack_ids};

    #[test]
    fn normalize_host_pattern_handles_url_and_case() {
        let host = normalize_host_pattern("https://Docs.YouTube.com/watch?v=1").unwrap();
        assert_eq!(host, "docs.youtube.com");
    }

    #[test]
    fn normalize_host_pattern_rejects_invalid_chars() {
        assert!(normalize_host_pattern("exa mple.com").is_none());
        assert!(normalize_host_pattern("exa*mple.com").is_none());
    }

    #[test]
    fn normalize_host_list_deduplicates() {
        let hosts = normalize_host_list(vec![
            "youtube.com".to_string(),
            "https://youtube.com".to_string(),
            "docs.youtube.com".to_string(),
        ]);
        assert_eq!(
            hosts,
            vec!["youtube.com".to_string(), "docs.youtube.com".to_string()]
        );
    }

    #[test]
    fn normalize_pack_ids_deduplicates_and_filters_invalid() {
        let packs = normalize_pack_ids(vec![
            "SPRING-BLOSSOM".to_string(),
            "spring-blossom".to_string(),
            "bad id".to_string(),
        ]);
        assert_eq!(packs, vec!["spring-blossom".to_string()]);
    }
}
