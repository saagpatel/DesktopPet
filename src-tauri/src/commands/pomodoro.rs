use chrono::Timelike;
use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::events::{EVENT_COINS_CHANGED, EVENT_PET_STATE_CHANGED};
use crate::models::{CoinBalance, PetState, PomodoroSession, UserProgress};

const COINS_PER_POMODORO: u32 = 10;
const DEFAULT_STAGE_1_THRESHOLD: u32 = 5;
const DEFAULT_STAGE_2_THRESHOLD: u32 = 15;
const MIN_WORK_DURATION_SECS: u32 = 5 * 60;
const MAX_WORK_DURATION_SECS: u32 = 2 * 60 * 60;
const MIN_BREAK_DURATION_SECS: u32 = 60;
const MAX_BREAK_DURATION_SECS: u32 = 30 * 60;

fn clamp_work_duration(seconds: u32) -> u32 {
    seconds.clamp(MIN_WORK_DURATION_SECS, MAX_WORK_DURATION_SECS)
}

fn clamp_break_duration(seconds: u32) -> u32 {
    seconds.clamp(MIN_BREAK_DURATION_SECS, MAX_BREAK_DURATION_SECS)
}

fn normalized_thresholds(raw: &[u32]) -> [u32; 3] {
    if raw.len() < 3 {
        return [0, DEFAULT_STAGE_1_THRESHOLD, DEFAULT_STAGE_2_THRESHOLD];
    }
    let stage1 = raw[1].max(1);
    let stage2 = raw[2].max(stage1.saturating_add(1));
    [0, stage1, stage2]
}

fn stage_for_total_pomodoros(total_pomodoros: u32, thresholds: &[u32]) -> u32 {
    let normalized = normalized_thresholds(thresholds);
    if total_pomodoros >= normalized[2] {
        2
    } else if total_pomodoros >= normalized[1] {
        1
    } else {
        0
    }
}

#[tauri::command]
pub fn start_pomodoro(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    work_duration: u32,
    break_duration: u32,
) -> Result<PomodoroSession, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let work_duration = clamp_work_duration(work_duration);
    let break_duration = clamp_break_duration(break_duration);

    let session = PomodoroSession {
        id: uuid::Uuid::new_v4().to_string(),
        started_at: chrono::Utc::now().to_rfc3339(),
        completed_at: None,
        work_duration,
        break_duration,
    };

    let mut sessions: Vec<PomodoroSession> = store
        .get("sessions")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    sessions.push(session.clone());
    store.set("sessions", json!(sessions));

    let mut pet: PetState = store
        .get("pet")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    pet.animation_state = "working".to_string();
    store.set("pet", json!(pet));
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);

    Ok(session)
}

#[tauri::command]
pub async fn complete_pomodoro(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    session_id: String,
) -> Result<PetState, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let store = app.store("store.json").map_err(|e| e.to_string())?;

    // Mark session complete
    let mut sessions: Vec<PomodoroSession> = store
        .get("sessions")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    let session = sessions
        .iter_mut()
        .find(|s| s.id == session_id)
        .ok_or_else(|| "Session not found".to_string())?;
    if session.completed_at.is_some() {
        return store
            .get("pet")
            .ok_or_else(|| "Completed session exists but pet state is missing".to_string())
            .and_then(|value| {
                serde_json::from_value(value)
                    .map_err(|error| format!("Stored pet data is malformed: {error}"))
            });
    }
    session.completed_at = Some(chrono::Utc::now().to_rfc3339());
    let completed_work_duration = session.work_duration;
    store.set("sessions", json!(sessions));

    // Award coins
    let mut coins: CoinBalance = store
        .get("coins")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    coins.total = coins.total.saturating_add(COINS_PER_POMODORO);
    store.set("coins", json!(coins));
    let _ = app.emit(EVENT_COINS_CHANGED, &coins);

    // Update pet: increment pomodoros, check evolution
    let mut pet: PetState = store
        .get("pet")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    pet.total_pomodoros = pet.total_pomodoros.saturating_add(1);
    pet.energy = pet.energy.saturating_sub(3);
    pet.hunger = pet.hunger.saturating_add(4).min(100);
    pet.affection = pet.affection.saturating_add(2).min(100);
    pet.animation_state = "celebrating".to_string();

    let new_stage = stage_for_total_pomodoros(pet.total_pomodoros, &pet.evolution_thresholds);

    if new_stage > pet.current_stage {
        pet.current_stage = new_stage;
        pet.animation_state = "evolving".to_string();
    }

    let progress: UserProgress = store
        .get("user_progress")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    let focus_bias = progress
        .total_focus_minutes
        .saturating_add(completed_work_duration / 60);
    let task_bias = progress.total_tasks_completed.saturating_mul(20);
    pet.evolution_path = if focus_bias > task_bias.saturating_add(120) {
        "scholar".to_string()
    } else if task_bias > focus_bias {
        "guardian".to_string()
    } else {
        "companion".to_string()
    };
    pet.personality = match pet.evolution_path.as_str() {
        "scholar" => "focused".to_string(),
        "guardian" => "steady".to_string(),
        _ => "playful".to_string(),
    };

    store.set("pet", json!(pet));
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);

    // Update daily goal for pomodoros
    crate::commands::goals::increment_goal_progress(&app, "pomodoros")
        .map_err(|error| format!("Session completed, but pomodoro goal update failed: {error}"))?;
    crate::commands::goals::add_goal_progress(&app, "focus_minutes", completed_work_duration / 60)
        .map_err(|error| {
            format!("Session completed, but focus-minute goal update failed: {error}")
        })?;
    crate::progression::record_focus_session(&app, completed_work_duration, COINS_PER_POMODORO)
        .map_err(|error| format!("Session completed, but progression reward failed: {error}"))?;
    crate::commands::pet::advance_focus_quest(&app, 1)
        .map_err(|error| format!("Session completed, but quest progress update failed: {error}"))?;

    // Release the store lock before invoking nested commands that lock the store.
    drop(_guard);

    // Check for achievement unlocks
    let completion_hour = chrono::Local::now().hour();
    let _ =
        crate::commands::achievements::check_achievement_progress(app.clone(), store_lock.clone())
            .await;
    let _ = crate::commands::achievements::check_time_achievement(app, store_lock, completion_hour)
        .await;

    Ok(pet)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evolution_thresholds_ordering() {
        assert_eq!(
            normalized_thresholds(&[]),
            [0, DEFAULT_STAGE_1_THRESHOLD, DEFAULT_STAGE_2_THRESHOLD]
        );
        assert_eq!(
            stage_for_total_pomodoros(u32::MAX, &[0, u32::MAX, u32::MAX]),
            2
        );
    }

    #[test]
    fn evolution_stage1_at_5() {
        assert_eq!(DEFAULT_STAGE_1_THRESHOLD, 5);
    }

    #[test]
    fn evolution_stage2_at_15() {
        assert_eq!(DEFAULT_STAGE_2_THRESHOLD, 15);
    }

    #[test]
    fn coins_per_pomodoro_is_10() {
        assert_eq!(COINS_PER_POMODORO, 10);
    }

    #[test]
    fn work_duration_is_clamped() {
        assert_eq!(clamp_work_duration(60), MIN_WORK_DURATION_SECS);
        assert_eq!(clamp_work_duration(25 * 60), 25 * 60);
        assert_eq!(clamp_work_duration(24 * 60 * 60), MAX_WORK_DURATION_SECS);
    }

    #[test]
    fn break_duration_is_clamped() {
        assert_eq!(clamp_break_duration(0), MIN_BREAK_DURATION_SECS);
        assert_eq!(clamp_break_duration(5 * 60), 5 * 60);
        assert_eq!(clamp_break_duration(3 * 60 * 60), MAX_BREAK_DURATION_SECS);
    }

    #[test]
    fn evolution_logic_stage0_to_stage1() {
        let total_pomodoros = DEFAULT_STAGE_1_THRESHOLD;
        let new_stage = stage_for_total_pomodoros(total_pomodoros, &[0, 5, 15]);
        assert_eq!(new_stage, 1);
    }

    #[test]
    fn evolution_logic_stage1_to_stage2() {
        let total_pomodoros = DEFAULT_STAGE_2_THRESHOLD;
        let new_stage = stage_for_total_pomodoros(total_pomodoros, &[0, 5, 15]);
        assert_eq!(new_stage, 2);
    }

    #[test]
    fn evolution_logic_below_stage1() {
        let total_pomodoros = DEFAULT_STAGE_1_THRESHOLD - 1;
        let new_stage = stage_for_total_pomodoros(total_pomodoros, &[0, 5, 15]);
        assert_eq!(new_stage, 0);
    }

    #[test]
    fn evolution_logic_between_stages() {
        let total_pomodoros = DEFAULT_STAGE_1_THRESHOLD + 3;
        let new_stage = stage_for_total_pomodoros(total_pomodoros, &[0, 5, 15]);
        assert_eq!(new_stage, 1);
    }

    #[test]
    fn evolution_logic_above_stage2() {
        let total_pomodoros = DEFAULT_STAGE_2_THRESHOLD + 100;
        let new_stage = stage_for_total_pomodoros(total_pomodoros, &[0, 5, 15]);
        assert_eq!(new_stage, 2);
    }

    #[test]
    fn evolution_logic_supports_species_thresholds() {
        assert_eq!(stage_for_total_pomodoros(9, &[0, 8, 20]), 1);
        assert_eq!(stage_for_total_pomodoros(20, &[0, 8, 20]), 2);
        assert_eq!(stage_for_total_pomodoros(2, &[0, 8, 20]), 0);
    }
}
