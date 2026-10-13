use serde::de::DeserializeOwned;
use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::{
    events::{
        EVENT_ANALYTICS_CHANGED, EVENT_COINS_CHANGED, EVENT_GOALS_CHANGED, EVENT_PET_STATE_CHANGED,
        EVENT_PROFILE_CHANGED, EVENT_SETTINGS_CHANGED, EVENT_TIMER_RUNTIME_CHANGED,
    },
    models::{AppDiagnostics, AppSnapshot, CURRENT_SCHEMA_VERSION},
};

fn sanitize_snapshot(mut snapshot: AppSnapshot) -> AppSnapshot {
    // Backups preserve domain values exactly; validation belongs at mutation boundaries.
    snapshot.schema_version = CURRENT_SCHEMA_VERSION;
    snapshot
}

fn validate_snapshot(snapshot: &AppSnapshot) -> Result<(), String> {
    if snapshot.schema_version > CURRENT_SCHEMA_VERSION {
        return Err(format!(
            "Backup schema {} is newer than supported schema {}",
            snapshot.schema_version, CURRENT_SCHEMA_VERSION
        ));
    }
    if snapshot.schema_version < CURRENT_SCHEMA_VERSION.saturating_sub(1) {
        return Err(format!(
            "Unsupported backup schema {}; expected {} or {}",
            snapshot.schema_version,
            CURRENT_SCHEMA_VERSION - 1,
            CURRENT_SCHEMA_VERSION
        ));
    }
    if snapshot.schema_version == CURRENT_SCHEMA_VERSION && snapshot.format != "desktop-pet-backup"
    {
        return Err("Backup format identity is invalid".to_string());
    }
    if snapshot.schema_version == CURRENT_SCHEMA_VERSION - 1
        && !snapshot.format.is_empty()
        && snapshot.format != "desktop-pet-backup"
    {
        return Err("Backup format identity is invalid".to_string());
    }
    chrono::DateTime::parse_from_rfc3339(&snapshot.exported_at)
        .map_err(|_| "Backup exportedAt must be an RFC 3339 timestamp".to_string())?;
    Ok(())
}

fn decode_store_value<T: DeserializeOwned + Default>(
    value: Option<serde_json::Value>,
    key: &str,
) -> Result<T, String> {
    value
        .map(|value| {
            serde_json::from_value(value)
                .map_err(|error| format!("Stored {key} data is malformed: {error}"))
        })
        .unwrap_or_else(|| Ok(T::default()))
}

fn load_snapshot(app: &AppHandle) -> Result<AppSnapshot, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;

    let schema_version = match store.get("schema_version") {
        None => CURRENT_SCHEMA_VERSION,
        Some(value) => u32::try_from(
            value
                .as_u64()
                .ok_or_else(|| "Stored schema version is malformed".to_string())?,
        )
        .map_err(|_| "Stored schema version is out of range".to_string())?,
    };

    Ok(AppSnapshot {
        format: "desktop-pet-backup".to_string(),
        schema_version,
        exported_at: chrono::Utc::now().to_rfc3339(),
        pet: decode_store_value(store.get("pet"), "pet")?,
        coins: decode_store_value(store.get("coins"), "coins")?,
        tasks: decode_store_value(store.get("tasks"), "tasks")?,
        goals: decode_store_value(store.get("goals"), "goals")?,
        sessions: decode_store_value(store.get("sessions"), "sessions")?,
        settings: decode_store_value(store.get("settings"), "settings")?,
        timer_runtime: decode_store_value(store.get("timer_runtime"), "timer_runtime")?,
        progress: decode_store_value(store.get("user_progress"), "user_progress")?,
        summaries: decode_store_value(store.get("daily_summaries"), "daily_summaries")?,
        customization_loadouts: decode_store_value(
            store.get("customization_loadouts"),
            "customization_loadouts",
        )?,
        pet_events: decode_store_value(store.get("pet_events"), "pet_events")?,
        pet_active_quest: decode_store_value(store.get("pet_active_quest"), "pet_active_quest")?,
        focus_guardrail_events: decode_store_value(
            store.get("focus_guardrail_events"),
            "focus_guardrail_events",
        )?,
        achievement_state: decode_store_value(store.get("achievement_state"), "achievement_state")?,
        quest_recent_focus: decode_store_value(
            store.get("pet_recent_focus_progress"),
            "pet_recent_focus_progress",
        )?,
        quest_recent_care: decode_store_value(
            store.get("pet_recent_care_progress"),
            "pet_recent_care_progress",
        )?,
        quest_last_kind: decode_store_value(
            store.get("pet_last_quest_kind"),
            "pet_last_quest_kind",
        )?,
        quest_last_roll_at: decode_store_value(
            store.get("pet_last_quest_roll_at"),
            "pet_last_quest_roll_at",
        )?,
        break_events: decode_store_value(store.get("break_events"), "break_events")?,
    })
}

fn save_snapshot(app: &AppHandle, snapshot: AppSnapshot) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let snapshot = sanitize_snapshot(snapshot);

    // Persist all domain keys and flush immediately for explicit import/reset flows.
    store.clear();
    store.set("schema_version", json!(CURRENT_SCHEMA_VERSION));
    store.set("pet", json!(snapshot.pet));
    store.set("coins", json!(snapshot.coins));
    store.set("tasks", json!(snapshot.tasks));
    store.set("goals", json!(snapshot.goals));
    store.set("sessions", json!(snapshot.sessions));
    store.set("settings", json!(snapshot.settings));
    store.set("timer_runtime", json!(snapshot.timer_runtime));
    store.set("user_progress", json!(snapshot.progress));
    store.set("daily_summaries", json!(snapshot.summaries));
    store.set(
        "customization_loadouts",
        json!(snapshot.customization_loadouts),
    );
    store.set("pet_events", json!(snapshot.pet_events));
    store.set("pet_active_quest", json!(snapshot.pet_active_quest));
    store.set(
        "focus_guardrail_events",
        json!(snapshot.focus_guardrail_events),
    );
    store.set("achievement_state", json!(snapshot.achievement_state));
    store.set(
        "pet_recent_focus_progress",
        json!(snapshot.quest_recent_focus),
    );
    store.set(
        "pet_recent_care_progress",
        json!(snapshot.quest_recent_care),
    );
    store.set("pet_last_quest_kind", json!(snapshot.quest_last_kind));
    store.set("pet_last_quest_roll_at", json!(snapshot.quest_last_roll_at));
    store.set("break_events", json!(snapshot.break_events));
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

fn save_with_rollback<F>(
    next: &AppSnapshot,
    previous: &AppSnapshot,
    mut persist: F,
) -> Result<(), String>
where
    F: FnMut(&AppSnapshot) -> Result<(), String>,
{
    if let Err(error) = persist(next) {
        return match persist(previous) {
            Ok(()) => Err(format!(
                "Import save failed; previous data restored: {error}"
            )),
            Err(rollback_error) => Err(format!(
                "Import save failed: {error}; rollback also failed: {rollback_error}"
            )),
        };
    }
    Ok(())
}

fn emit_snapshot_refresh_events(app: &AppHandle, snapshot: &AppSnapshot) {
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &snapshot.pet);
    let _ = app.emit(EVENT_COINS_CHANGED, &snapshot.coins);
    let _ = app.emit(EVENT_GOALS_CHANGED, &snapshot.goals);
    let _ = app.emit(EVENT_SETTINGS_CHANGED, &snapshot.settings);
    let _ = app.emit(EVENT_TIMER_RUNTIME_CHANGED, &snapshot.timer_runtime);
    let _ = app.emit(EVENT_PROFILE_CHANGED, &snapshot.progress);
    let _ = app.emit(EVENT_ANALYTICS_CHANGED, &snapshot.summaries);
}

#[tauri::command]
pub fn export_app_snapshot(app: AppHandle) -> Result<AppSnapshot, String> {
    load_snapshot(&app)
}

#[tauri::command]
pub fn import_app_snapshot(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    snapshot: AppSnapshot,
) -> Result<String, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    validate_snapshot(&snapshot)?;
    let mut snapshot = snapshot;
    if snapshot.schema_version == CURRENT_SCHEMA_VERSION - 1 {
        if snapshot.pet.owned_accessories.is_empty() {
            snapshot.pet.owned_accessories = snapshot.pet.accessories.clone();
        }
        snapshot.format = "desktop-pet-backup".to_string();
    }
    let snapshot = sanitize_snapshot(snapshot);
    let previous = load_snapshot(&app)?;
    save_with_rollback(&snapshot, &previous, |candidate| {
        save_snapshot(&app, candidate.clone())
    })?;
    emit_snapshot_refresh_events(&app, &snapshot);
    Ok("Import complete".to_string())
}

#[tauri::command]
pub fn reset_app_state(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
) -> Result<String, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let snapshot = AppSnapshot::default();
    save_snapshot(&app, snapshot.clone())?;
    emit_snapshot_refresh_events(&app, &snapshot);
    Ok("App data reset to defaults".to_string())
}

#[tauri::command]
pub fn get_app_diagnostics(app: AppHandle) -> Result<AppDiagnostics, String> {
    let snapshot = load_snapshot(&app)?;

    Ok(AppDiagnostics {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: snapshot.schema_version,
        current_schema_version: CURRENT_SCHEMA_VERSION,
        exported_at: snapshot.exported_at,
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        tasks_count: u32::try_from(snapshot.tasks.len()).unwrap_or(u32::MAX),
        sessions_count: u32::try_from(snapshot.sessions.len()).unwrap_or(u32::MAX),
        summaries_count: u32::try_from(snapshot.summaries.len()).unwrap_or(u32::MAX),
        guardrail_events_count: u32::try_from(snapshot.focus_guardrail_events.len())
            .unwrap_or(u32::MAX),
        has_active_quest: snapshot.pet_active_quest.is_some(),
    })
}

#[cfg(test)]
mod tests {
    use super::{sanitize_snapshot, save_with_rollback, validate_snapshot};
    use crate::models::{AchievementState, AppSnapshot, Task, CURRENT_SCHEMA_VERSION};

    #[test]
    fn snapshot_round_trip_preserves_persisted_state_and_long_collections() {
        let snapshot = AppSnapshot {
            tasks: (0..2_100)
                .map(|index| Task {
                    id: index.to_string(),
                    title: format!(" task {index} "),
                    completed: false,
                    reward_claimed: false,
                    created_at: "2026-01-01T00:00:00Z".to_string(),
                })
                .collect(),
            quest_recent_focus: 7,
            achievement_state: AchievementState {
                total_unlocked: 3,
                ..AchievementState::default()
            },
            ..AppSnapshot::default()
        };
        let serialized = serde_json::to_value(&snapshot).unwrap();
        let restored: AppSnapshot = serde_json::from_value(serialized.clone()).unwrap();
        assert_eq!(serde_json::to_value(restored).unwrap(), serialized);
        assert_eq!(sanitize_snapshot(snapshot.clone()).tasks.len(), 2_100);
    }

    #[test]
    fn rejects_empty_malformed_and_future_schema_backups() {
        assert!(serde_json::from_str::<AppSnapshot>("{}").is_err());
        assert!(serde_json::from_str::<AppSnapshot>("not json").is_err());
        let future = AppSnapshot {
            schema_version: CURRENT_SCHEMA_VERSION + 1,
            ..AppSnapshot::default()
        };
        assert!(validate_snapshot(&future).is_err());
    }

    #[test]
    fn validates_backup_identity_and_supported_schema() {
        assert!(validate_snapshot(&AppSnapshot::default()).is_ok());
        let snapshot = AppSnapshot {
            exported_at: "invalid".to_string(),
            ..AppSnapshot::default()
        };
        assert!(validate_snapshot(&snapshot).is_err());
        let invalid_identity = AppSnapshot {
            format: "another-app".to_string(),
            ..AppSnapshot::default()
        };
        assert!(validate_snapshot(&invalid_identity).is_err());
    }

    #[test]
    fn failed_snapshot_save_restores_previous_value() {
        let previous = AppSnapshot::default();
        let next = AppSnapshot {
            pet: crate::models::PetState {
                total_pomodoros: 10,
                ..crate::models::PetState::default()
            },
            ..AppSnapshot::default()
        };
        let mut persisted = serde_json::to_value(&previous).unwrap();
        let result = save_with_rollback(&next, &previous, |candidate| {
            persisted = serde_json::to_value(candidate).unwrap();
            if candidate.pet.total_pomodoros == 10 {
                Err("simulated persistence failure".to_string())
            } else {
                Ok(())
            }
        });
        assert!(result.is_err());
        assert_eq!(persisted, serde_json::to_value(previous).unwrap());
    }
}
