use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::{
    events::{EVENT_ANALYTICS_CHANGED, EVENT_PROFILE_CHANGED},
    models::{DailySummary, UserProgress},
};

const XP_PER_POMODORO: u32 = 25;
const XP_PER_TASK_COMPLETION: u32 = 10;
const XP_PER_GOAL_COMPLETION: u32 = 15;

fn today() -> String {
    chrono::Utc::now().format("%Y-%m-%d").to_string()
}

fn xp_to_level(xp_total: u32) -> u32 {
    1 + (xp_total / 100)
}

fn parse_date(date: &str) -> Option<chrono::NaiveDate> {
    chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()
}

fn update_streak(progress: &mut UserProgress, active_date: &str) {
    match progress.last_active_date.as_deref() {
        Some(last) if last == active_date => {}
        Some(last) => {
            let continues_streak = match (parse_date(last), parse_date(active_date)) {
                (Some(prev), Some(current)) => current.signed_duration_since(prev).num_days() == 1,
                _ => false,
            };
            progress.streak_days = if continues_streak {
                progress.streak_days.saturating_add(1)
            } else {
                1
            };
            progress.longest_streak = progress.longest_streak.max(progress.streak_days);
            progress.last_active_date = Some(active_date.to_string());
        }
        None => {
            progress.streak_days = 1;
            progress.longest_streak = 1;
            progress.last_active_date = Some(active_date.to_string());
        }
    }
}

fn mutate_progress<F>(app: &AppHandle, mutator: F) -> Result<UserProgress, String>
where
    F: FnOnce(&mut UserProgress),
{
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let mut progress: UserProgress = store
        .get("user_progress")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    update_streak(&mut progress, &today());
    mutator(&mut progress);
    progress.level = xp_to_level(progress.xp_total);

    store.set("user_progress", json!(progress));
    let _ = app.emit(EVENT_PROFILE_CHANGED, &progress);
    Ok(progress)
}

fn mutate_today_summary<F>(app: &AppHandle, mutator: F) -> Result<Vec<DailySummary>, String>
where
    F: FnOnce(&mut DailySummary),
{
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let mut summaries: Vec<DailySummary> = store
        .get("daily_summaries")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let date = today();
    let idx = summaries
        .iter()
        .position(|s| s.date == date)
        .unwrap_or_else(|| {
            summaries.push(DailySummary {
                date: date.clone(),
                ..Default::default()
            });
            summaries.len() - 1
        });

    if let Some(summary) = summaries.get_mut(idx) {
        mutator(summary);
    }

    summaries.sort_by(|a, b| b.date.cmp(&a.date));
    if summaries.len() > 90 {
        summaries.truncate(90);
    }

    store.set("daily_summaries", json!(summaries));
    let _ = app.emit(EVENT_ANALYTICS_CHANGED, &summaries);
    Ok(summaries)
}

pub fn get_user_progress(app: &AppHandle) -> Result<UserProgress, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let mut progress: UserProgress = store
        .get("user_progress")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    update_streak(&mut progress, &today());
    progress.level = xp_to_level(progress.xp_total);
    store.set("user_progress", json!(progress));
    Ok(progress)
}

pub fn get_daily_summaries(app: &AppHandle, days: u32) -> Result<Vec<DailySummary>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let mut summaries: Vec<DailySummary> = store
        .get("daily_summaries")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    summaries.sort_by(|a, b| b.date.cmp(&a.date));
    summaries.truncate(days as usize);
    Ok(summaries)
}

pub fn record_focus_session(
    app: &AppHandle,
    work_duration_secs: u32,
    coins_earned: u32,
) -> Result<(), String> {
    mutate_progress(app, |progress| {
        progress.total_sessions = progress.total_sessions.saturating_add(1);
        progress.total_focus_minutes = progress
            .total_focus_minutes
            .saturating_add(work_duration_secs / 60);
        progress.xp_total = progress.xp_total.saturating_add(XP_PER_POMODORO);
    })?;

    mutate_today_summary(app, |summary| {
        summary.sessions_completed = summary.sessions_completed.saturating_add(1);
        summary.focus_minutes = summary
            .focus_minutes
            .saturating_add(work_duration_secs / 60);
        summary.coins_earned = summary.coins_earned.saturating_add(coins_earned);
        summary.xp_earned = summary.xp_earned.saturating_add(XP_PER_POMODORO);
    })?;

    Ok(())
}

pub fn record_task_completion(app: &AppHandle) -> Result<(), String> {
    mutate_progress(app, |progress| {
        progress.total_tasks_completed = progress.total_tasks_completed.saturating_add(1);
        progress.xp_total = progress.xp_total.saturating_add(XP_PER_TASK_COMPLETION);
    })?;

    mutate_today_summary(app, |summary| {
        summary.tasks_completed = summary.tasks_completed.saturating_add(1);
        summary.xp_earned = summary.xp_earned.saturating_add(XP_PER_TASK_COMPLETION);
    })?;

    Ok(())
}

pub fn record_goal_completion(app: &AppHandle) -> Result<(), String> {
    mutate_progress(app, |progress| {
        progress.xp_total = progress.xp_total.saturating_add(XP_PER_GOAL_COMPLETION);
    })?;

    mutate_today_summary(app, |summary| {
        summary.goals_completed = summary.goals_completed.saturating_add(1);
        summary.xp_earned = summary.xp_earned.saturating_add(XP_PER_GOAL_COMPLETION);
    })?;

    Ok(())
}

pub fn record_guardrail_intervention(app: &AppHandle, nudge_level: &str) -> Result<(), String> {
    mutate_today_summary(app, |summary| {
        summary.guardrails_interventions = summary.guardrails_interventions.saturating_add(1);
        if nudge_level == "high" {
            summary.high_nudges = summary.high_nudges.saturating_add(1);
        }
    })?;
    Ok(())
}
