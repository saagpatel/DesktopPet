use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::{
    events::EVENT_FOCUS_GUARDRAILS_ALERT,
    models::{FocusGuardrailEvent, FocusGuardrailsStatus, Settings},
};

const MAX_GUARDRAIL_EVENTS: usize = 120;
const MAX_HOSTS_PER_SAMPLE: usize = 25;
const MAX_HOST_LEN: usize = 120;
const ALLOWED_PHASES: &[&str] = &["idle", "work", "break", "celebrating"];

fn load_settings(app: &AppHandle) -> Result<Settings, String> {
    crate::commands::settings::get_settings(app.clone())
}

fn normalize_host(value: &str) -> Option<String> {
    let normalized = value.trim().to_ascii_lowercase();
    if normalized.is_empty() || normalized.chars().count() > MAX_HOST_LEN {
        return None;
    }

    if normalized
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '.' || ch == '-')
    {
        Some(normalized)
    } else {
        None
    }
}

fn normalize_hosts(hosts: &[String]) -> Vec<String> {
    let mut output = Vec::new();
    for host in hosts {
        if output.len() >= MAX_HOSTS_PER_SAMPLE {
            break;
        }
        let Some(normalized) = normalize_host(host) else {
            continue;
        };
        if !output.contains(&normalized) {
            output.push(normalized);
        }
    }
    output
}

fn host_matches_pattern(host: &str, pattern: &str) -> bool {
    host == pattern || host.ends_with(&format!(".{}", pattern))
}

fn match_list(hosts: &[String], patterns: &[String]) -> Vec<String> {
    hosts
        .iter()
        .filter(|host| {
            patterns
                .iter()
                .any(|pattern| host_matches_pattern(host, pattern))
        })
        .cloned()
        .collect()
}

fn nudge_level_for_count(count: usize) -> &'static str {
    if count >= 3 {
        "high"
    } else if count >= 1 {
        "medium"
    } else {
        "none"
    }
}

fn load_guardrail_events(app: &AppHandle) -> Result<Vec<FocusGuardrailEvent>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    Ok(store
        .get("focus_guardrail_events")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

fn save_guardrail_events(app: &AppHandle, events: &[FocusGuardrailEvent]) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set("focus_guardrail_events", serde_json::json!(events));
    Ok(())
}

fn append_guardrail_event(
    app: &AppHandle,
    status: &FocusGuardrailsStatus,
    hosts: &[String],
) -> Result<(), String> {
    let mut events = load_guardrail_events(app)?;
    events.push(FocusGuardrailEvent {
        id: uuid::Uuid::new_v4().to_string(),
        phase: status.phase.clone(),
        hosts: hosts.to_vec(),
        matched_blocklist: status.matched_blocklist.clone(),
        nudge_level: status.nudge_level.clone(),
        recommended_action: status.recommended_action.clone(),
        created_at: chrono::Utc::now().to_rfc3339(),
    });
    events.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    if events.len() > MAX_GUARDRAIL_EVENTS {
        events.truncate(MAX_GUARDRAIL_EVENTS);
    }
    save_guardrail_events(app, &events)
}

#[tauri::command]
pub fn evaluate_focus_guardrails(
    app: AppHandle,
    phase: String,
    hosts: Option<Vec<String>>,
) -> Result<FocusGuardrailsStatus, String> {
    if !ALLOWED_PHASES.iter().any(|candidate| *candidate == phase) {
        return Err(format!("Invalid focus phase: {}", phase));
    }

    let settings = load_settings(&app)?;
    let hosts = normalize_hosts(&hosts.unwrap_or_default());
    let matched_blocklist = match_list(&hosts, &settings.focus_blocklist);
    let matched_allowlist = match_list(&hosts, &settings.focus_allowlist);
    let effective_blocked_hosts: Vec<String> = matched_blocklist
        .iter()
        .filter(|host| !matched_allowlist.contains(host))
        .cloned()
        .collect();

    let phase_is_work = phase == "work";
    let should_apply = settings.focus_guardrails_enabled
        && (!settings.focus_guardrails_work_only || phase_is_work);
    let active = should_apply && !effective_blocked_hosts.is_empty();
    let blocked_hosts_count = effective_blocked_hosts.len() as u32;
    let nudge_level = nudge_level_for_count(effective_blocked_hosts.len()).to_string();
    let recommended_action = if !should_apply {
        "none".to_string()
    } else if effective_blocked_hosts.len() >= 3 {
        "pause_timer".to_string()
    } else if !effective_blocked_hosts.is_empty() {
        "show_nudge".to_string()
    } else {
        "none".to_string()
    };

    let message = if !settings.focus_guardrails_enabled {
        "Focus guardrails are disabled.".to_string()
    } else if settings.focus_guardrails_work_only && !phase_is_work {
        "Guardrails are configured for work sessions only.".to_string()
    } else if active {
        format!(
            "Guardrails active: {} potential distractions matched.",
            effective_blocked_hosts.len()
        )
    } else {
        "Guardrails enabled and monitoring.".to_string()
    };

    Ok(FocusGuardrailsStatus {
        enabled: settings.focus_guardrails_enabled,
        active,
        phase,
        matched_blocklist,
        matched_allowlist,
        blocked_hosts_count,
        nudge_level,
        recommended_action,
        message,
    })
}

#[tauri::command]
pub fn apply_focus_guardrails_intervention(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    phase: String,
    hosts: Option<Vec<String>>,
) -> Result<FocusGuardrailsStatus, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let sampled_hosts = normalize_hosts(&hosts.unwrap_or_default());
    let mut status = evaluate_focus_guardrails(app.clone(), phase, Some(sampled_hosts.clone()))?;
    if status.recommended_action == "pause_timer" {
        status.message =
            "Guardrails intervention triggered: consider pausing and regrouping.".to_string();
        status.active = true;
    }
    if status.active {
        let _ = append_guardrail_event(&app, &status, &sampled_hosts);
        crate::progression::record_guardrail_intervention(&app, &status.nudge_level).map_err(
            |error| format!("Guardrail event recorded, but progression update failed: {error}"),
        )?;
        let _ = app.emit(EVENT_FOCUS_GUARDRAILS_ALERT, &status);
    }
    Ok(status)
}

#[tauri::command]
pub fn get_focus_guardrail_events(
    app: AppHandle,
    limit: Option<u32>,
) -> Result<Vec<FocusGuardrailEvent>, String> {
    let mut events = load_guardrail_events(&app)?;
    let cap = limit.unwrap_or(30).clamp(1, 120) as usize;
    events.truncate(cap);
    Ok(events)
}

#[cfg(test)]
mod tests {
    use super::{
        match_list, normalize_host, normalize_hosts, nudge_level_for_count, ALLOWED_PHASES,
    };

    #[test]
    fn match_list_finds_suffix_matches() {
        let hosts = vec!["docs.youtube.com".to_string(), "openai.com".to_string()];
        let patterns = vec!["youtube.com".to_string()];
        let matched = match_list(&hosts, &patterns);
        assert_eq!(matched, vec!["docs.youtube.com".to_string()]);
    }

    #[test]
    fn match_list_returns_empty_when_no_patterns() {
        let hosts = vec!["example.com".to_string()];
        let patterns = vec![];
        let matched = match_list(&hosts, &patterns);
        assert!(matched.is_empty());
    }

    #[test]
    fn normalize_host_rejects_invalid() {
        assert!(normalize_host("exa mple.com").is_none());
        assert!(normalize_host("").is_none());
    }

    #[test]
    fn normalize_hosts_caps_and_deduplicates() {
        let hosts = normalize_hosts(&[
            "YouTube.com".to_string(),
            "youtube.com".to_string(),
            "docs.youtube.com".to_string(),
        ]);
        assert_eq!(
            hosts,
            vec!["youtube.com".to_string(), "docs.youtube.com".to_string()]
        );
    }

    #[test]
    fn nudge_level_thresholds() {
        assert_eq!(nudge_level_for_count(0), "none");
        assert_eq!(nudge_level_for_count(1), "medium");
        assert_eq!(nudge_level_for_count(2), "medium");
        assert_eq!(nudge_level_for_count(3), "high");
    }

    #[test]
    fn allowed_phases_include_work() {
        assert!(ALLOWED_PHASES.contains(&"work"));
    }
}
