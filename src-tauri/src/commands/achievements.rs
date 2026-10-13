use crate::achievements::{
    check_daily_achievements, check_pet_achievements, check_progress_achievements,
    check_time_achievements, initialize_achievements,
};
use crate::models::{
    Achievement, AchievementState, CoinBalance, DailySummary, PetState, UserProgress,
};
use crate::StoreLock;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_store::StoreExt;

/// Get all achievements with current progress
#[tauri::command]
pub async fn get_achievements(
    app: AppHandle,
    lock: State<'_, StoreLock>,
) -> Result<Vec<Achievement>, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;

    let store = app.store("store.json").map_err(|e| e.to_string())?;

    let achievement_state: AchievementState = store
        .get("achievement_state")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    // Initialize achievements if not present
    let achievements = if achievement_state.achievements.is_empty() {
        let initialized = initialize_achievements();
        let new_state = AchievementState {
            achievements: initialized.clone(),
            total_unlocked: 0,
            last_unlocked_id: None,
        };
        store.set("achievement_state", serde_json::json!(new_state));
        store.save().map_err(|e| e.to_string())?;
        initialized
    } else {
        achievement_state.achievements
    };

    Ok(achievements)
}

/// Get achievement statistics
#[tauri::command]
pub async fn get_achievement_stats(
    app: AppHandle,
    lock: State<'_, StoreLock>,
) -> Result<HashMap<String, u32>, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;

    let store = app.store("store.json").map_err(|e| e.to_string())?;

    let achievement_state: AchievementState = store
        .get("achievement_state")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    Ok(crate::achievements::get_achievement_stats(
        &achievement_state.achievements,
    ))
}

/// Check and update achievement progress (called after significant events)
#[tauri::command]
pub async fn check_achievement_progress(
    app: AppHandle,
    lock: State<'_, StoreLock>,
) -> Result<Vec<String>, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;

    let store = app.store("store.json").map_err(|e| e.to_string())?;

    // Load current state
    let mut achievement_state: AchievementState = store
        .get("achievement_state")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    // Initialize if needed
    if achievement_state.achievements.is_empty() {
        achievement_state.achievements = initialize_achievements();
    }

    let user_progress: UserProgress = store
        .get("user_progress")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let pet: PetState = store
        .get("pet")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let coins: CoinBalance = store
        .get("coins")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let daily_summaries: Vec<DailySummary> = store
        .get("daily_summaries")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let mut all_newly_unlocked = Vec::new();

    // Check progress-based achievements
    let newly_unlocked =
        check_progress_achievements(&mut achievement_state.achievements, &user_progress);
    all_newly_unlocked.extend(newly_unlocked);

    // Check pet-based achievements
    let newly_unlocked =
        check_pet_achievements(&mut achievement_state.achievements, &pet, coins.total);
    all_newly_unlocked.extend(newly_unlocked);

    // Check daily achievements if there's a recent summary (newest first)
    if let Some(latest_summary) = daily_summaries.first() {
        let newly_unlocked =
            check_daily_achievements(&mut achievement_state.achievements, latest_summary);
        all_newly_unlocked.extend(newly_unlocked);
    }

    // Update total unlocked count
    achievement_state.total_unlocked = achievement_state
        .achievements
        .iter()
        .filter(|a| a.unlocked_at.is_some())
        .count() as u32;

    // Update last unlocked
    if let Some(last_id) = all_newly_unlocked.last() {
        achievement_state.last_unlocked_id = Some(last_id.clone());
    }

    // Save updated state
    store.set("achievement_state", serde_json::json!(achievement_state));
    store.save().map_err(|e| e.to_string())?;

    // Emit events for newly unlocked achievements
    for achievement_id in &all_newly_unlocked {
        if let Some(achievement) = achievement_state
            .achievements
            .iter()
            .find(|a| &a.id == achievement_id)
        {
            app.emit(
                "achievement_unlocked",
                serde_json::json!({
                    "id": achievement.id,
                    "title": achievement.title,
                    "icon": achievement.icon,
                }),
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(all_newly_unlocked)
}

/// Check time-based achievements (called after session completion)
#[tauri::command]
pub async fn check_time_achievement(
    app: AppHandle,
    lock: State<'_, StoreLock>,
    completion_hour: u32,
) -> Result<Vec<String>, String> {
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;

    let store = app.store("store.json").map_err(|e| e.to_string())?;

    let mut achievement_state: AchievementState = store
        .get("achievement_state")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    // Initialize if needed
    if achievement_state.achievements.is_empty() {
        achievement_state.achievements = initialize_achievements();
    }

    let newly_unlocked =
        check_time_achievements(&mut achievement_state.achievements, completion_hour);

    if !newly_unlocked.is_empty() {
        // Update total unlocked count
        achievement_state.total_unlocked = achievement_state
            .achievements
            .iter()
            .filter(|a| a.unlocked_at.is_some())
            .count() as u32;

        // Save updated state
        store.set("achievement_state", serde_json::json!(achievement_state));
        store.save().map_err(|e| e.to_string())?;

        // Emit events
        for achievement_id in &newly_unlocked {
            if let Some(achievement) = achievement_state
                .achievements
                .iter()
                .find(|a| &a.id == achievement_id)
            {
                app.emit(
                    "achievement_unlocked",
                    serde_json::json!({
                        "id": achievement.id,
                        "title": achievement.title,
                        "icon": achievement.icon,
                    }),
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(newly_unlocked)
}
