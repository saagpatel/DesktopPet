mod achievements;
mod commands;
mod events;
mod models;
mod progression;
mod storage;

use crate::events::{
    EVENT_TRAY_SET_PRESET, EVENT_TRAY_TIMER_PAUSE, EVENT_TRAY_TIMER_RESET, EVENT_TRAY_TIMER_RESUME,
    EVENT_TRAY_TIMER_START,
};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

/// Guards multi-step read-modify-write operations on the store.
pub struct StoreLock(pub Mutex<()>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(StoreLock(Mutex::new(())))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::achievements::get_achievements,
            commands::achievements::get_achievement_stats,
            commands::achievements::check_achievement_progress,
            commands::achievements::check_time_achievement,
            commands::pet::get_pet_state,
            commands::pet::set_pet_animation,
            commands::pet::pet_interact,
            commands::pet::set_pet_customization,
            commands::pet::set_pet_species,
            commands::pet::get_pet_events,
            commands::pet::get_pet_active_quest,
            commands::pet::resolve_pet_event,
            commands::pet::roll_pet_event,
            commands::pomodoro::start_pomodoro,
            commands::pomodoro::complete_pomodoro,
            commands::timer_runtime::get_timer_runtime,
            commands::timer_runtime::save_timer_runtime,
            commands::timer_runtime::clear_timer_runtime,
            commands::progress::get_user_progress,
            commands::progress::get_daily_summaries,
            commands::focus_guardrails::evaluate_focus_guardrails,
            commands::focus_guardrails::apply_focus_guardrails_intervention,
            commands::focus_guardrails::get_focus_guardrail_events,
            commands::customization::get_customization_loadouts,
            commands::customization::save_customization_loadout,
            commands::customization::apply_customization_loadout,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::coins::get_coin_balance,
            commands::coins::spend_coins,
            commands::tasks::get_tasks,
            commands::tasks::add_task,
            commands::tasks::toggle_task,
            commands::tasks::delete_task,
            commands::goals::get_daily_goals,
            commands::goals::update_goal_progress,
            commands::shop::get_shop_items,
            commands::shop::purchase_item,
            commands::maintenance::export_app_snapshot,
            commands::maintenance::import_app_snapshot,
            commands::maintenance::reset_app_state,
            commands::maintenance::get_app_diagnostics,
            commands::tray::set_tray_badge,
        ])
        .setup(|app| {
            storage::ensure_schema_version(app.handle()).map_err(std::io::Error::other)?;

            // Build system tray
            let show_pet = MenuItem::with_id(app, "show_pet", "Show Pet", true, None::<&str>)?;
            let show_panel =
                MenuItem::with_id(app, "show_panel", "Show Panel", true, None::<&str>)?;
            let start_pomo =
                MenuItem::with_id(app, "start_pomodoro", "Start Pomodoro", true, None::<&str>)?;
            let pause_pomo =
                MenuItem::with_id(app, "pause_pomodoro", "Pause Pomodoro", true, None::<&str>)?;
            let resume_pomo = MenuItem::with_id(
                app,
                "resume_pomodoro",
                "Resume Pomodoro",
                true,
                None::<&str>,
            )?;
            let reset_pomo =
                MenuItem::with_id(app, "reset_pomodoro", "Reset Pomodoro", true, None::<&str>)?;
            let preset_short =
                MenuItem::with_id(app, "preset_short", "Preset: 15 / 5", true, None::<&str>)?;
            let preset_standard =
                MenuItem::with_id(app, "preset_standard", "Preset: 25 / 5", true, None::<&str>)?;
            let preset_long =
                MenuItem::with_id(app, "preset_long", "Preset: 50 / 10", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &show_pet,
                    &show_panel,
                    &start_pomo,
                    &pause_pomo,
                    &resume_pomo,
                    &reset_pomo,
                    &preset_short,
                    &preset_standard,
                    &preset_long,
                    &quit,
                ],
            )?;

            let _tray = TrayIconBuilder::with_id("main")
                .tooltip("Desktop Pet")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show_pet" => {
                        if let Some(w) = app.get_webview_window("pet") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "show_panel" => {
                        if let Some(w) = app.get_webview_window("panel") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "start_pomodoro" => {
                        let _ = app.emit(EVENT_TRAY_TIMER_START, ());
                    }
                    "pause_pomodoro" => {
                        let _ = app.emit(EVENT_TRAY_TIMER_PAUSE, ());
                    }
                    "resume_pomodoro" => {
                        let _ = app.emit(EVENT_TRAY_TIMER_RESUME, ());
                    }
                    "reset_pomodoro" => {
                        let _ = app.emit(EVENT_TRAY_TIMER_RESET, ());
                    }
                    "preset_short" => {
                        let _ = app.emit(EVENT_TRAY_SET_PRESET, "short");
                    }
                    "preset_standard" => {
                        let _ = app.emit(EVENT_TRAY_SET_PRESET, "standard");
                    }
                    "preset_long" => {
                        let _ = app.emit(EVENT_TRAY_SET_PRESET, "long");
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("panel") {
                            let _ = w.unminimize();
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
