use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::models::Task;

const MAX_TASK_TITLE_CHARS: usize = 140;

fn normalize_task_title(title: String) -> Result<String, String> {
    let normalized = title.trim();
    if normalized.is_empty() {
        return Err("Task title cannot be empty".to_string());
    }
    if normalized.chars().count() > MAX_TASK_TITLE_CHARS {
        return Err(format!(
            "Task title exceeds {} characters",
            MAX_TASK_TITLE_CHARS
        ));
    }
    Ok(normalized.to_string())
}

fn load_tasks(app: &AppHandle) -> Result<Vec<Task>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    Ok(store
        .get("tasks")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

fn save_tasks(app: &AppHandle, tasks: &[Task]) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set("tasks", json!(tasks));
    Ok(())
}

fn toggle_completion(task: &mut Task) -> bool {
    task.completed = !task.completed;
    if task.completed && !task.reward_claimed {
        task.reward_claimed = true;
        return true;
    }
    false
}

#[tauri::command]
pub fn get_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    load_tasks(&app)
}

#[tauri::command]
pub fn add_task(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    title: String,
) -> Result<Task, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let mut tasks = load_tasks(&app)?;
    let title = normalize_task_title(title)?;
    let task = Task {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        completed: false,
        reward_claimed: false,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    tasks.push(task.clone());
    save_tasks(&app, &tasks)?;
    Ok(task)
}

#[tauri::command]
pub fn toggle_task(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    task_id: String,
) -> Result<Vec<Task>, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let mut tasks = load_tasks(&app)?;
    let should_reward = tasks
        .iter_mut()
        .find(|t| t.id == task_id)
        .map(toggle_completion)
        .unwrap_or(false);
    save_tasks(&app, &tasks)?;

    // If task was just completed, increment goal
    if should_reward {
        crate::commands::goals::increment_goal_progress(&app, "tasks")
            .map_err(|error| format!("Task completed, but task goal progress failed: {error}"))?;
        crate::progression::record_task_completion(&app)
            .map_err(|error| format!("Task completed, but progression reward failed: {error}"))?;
    }

    Ok(tasks)
}

#[tauri::command]
pub fn delete_task(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    task_id: String,
) -> Result<Vec<Task>, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let mut tasks = load_tasks(&app)?;
    tasks.retain(|t| t.id != task_id);
    save_tasks(&app, &tasks)?;
    Ok(tasks)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn task() -> Task {
        Task {
            id: "one-time".to_string(),
            title: "Finish task".to_string(),
            completed: false,
            reward_claimed: false,
            created_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn task_reward_is_claimed_only_once_across_recompletion() {
        let mut task = task();
        assert!(toggle_completion(&mut task));
        assert!(!toggle_completion(&mut task));
        assert!(!toggle_completion(&mut task));
        assert!(task.completed);
        assert!(task.reward_claimed);
    }

    #[test]
    fn normalize_task_title_trims() {
        let title = normalize_task_title("  ship release  ".to_string()).unwrap();
        assert_eq!(title, "ship release");
    }

    #[test]
    fn normalize_task_title_rejects_empty() {
        let err = normalize_task_title("   ".to_string()).unwrap_err();
        assert!(err.contains("cannot be empty"));
    }

    #[test]
    fn normalize_task_title_rejects_too_long() {
        let too_long = "x".repeat(MAX_TASK_TITLE_CHARS + 1);
        let err = normalize_task_title(too_long).unwrap_err();
        assert!(err.contains("exceeds"));
    }
}
