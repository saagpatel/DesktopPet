use tauri::{AppHandle, State};

use crate::models::{DailySummary, UserProgress};

#[tauri::command]
pub fn get_user_progress(
    app: AppHandle,
    store_lock: State<'_, crate::StoreLock>,
) -> Result<UserProgress, String> {
    let _guard = store_lock
        .0
        .lock()
        .map_err(|error| format!("Could not lock app state: {error}"))?;
    crate::progression::get_user_progress(&app)
}

#[tauri::command]
pub fn get_daily_summaries(app: AppHandle, days: Option<u32>) -> Result<Vec<DailySummary>, String> {
    crate::progression::get_daily_summaries(&app, days.unwrap_or(14).clamp(1, 90))
}
