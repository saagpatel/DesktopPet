use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::{
    events::{EVENT_PET_STATE_CHANGED, EVENT_SETTINGS_CHANGED},
    models::{CustomizationLoadout, PetState, Settings},
};

const ALLOWED_THEMES: &[&str] = &["sunrise", "dusk", "mint", "mono"];
const ALLOWED_SKINS: &[&str] = &["classic", "neon", "pixel", "plush"];
const ALLOWED_SCENES: &[&str] = &["meadow", "forest", "space", "cozy_room"];
const ALLOWED_ACCESSORIES: &[&str] = &[
    "party_hat",
    "bow_tie",
    "sunglasses",
    "scarf",
    "apple",
    "cookie",
];
const MAX_LOADOUTS: usize = 40;
const MAX_LOADOUT_NAME_CHARS: usize = 64;

fn validate_variant(value: &str, allowed: &[&str], field: &str) -> Result<(), String> {
    if allowed.contains(&value) {
        Ok(())
    } else {
        Err(format!("Invalid {}: {}", field, value))
    }
}

fn sanitize_accessories(accessories: Vec<String>) -> Vec<String> {
    let mut sanitized = Vec::new();
    for accessory in accessories {
        if ALLOWED_ACCESSORIES
            .iter()
            .any(|candidate| *candidate == accessory)
            && !sanitized.contains(&accessory)
        {
            sanitized.push(accessory);
        }
    }
    sanitized
}

fn equipped_accessories_for_loadout(accessories: &[String], owned: &[String]) -> Vec<String> {
    accessories
        .iter()
        .filter(|accessory| owned.contains(accessory))
        .cloned()
        .collect()
}

fn sanitize_loadout(mut loadout: CustomizationLoadout) -> Result<CustomizationLoadout, String> {
    let name = loadout.name.trim();
    if name.is_empty() {
        return Err("Loadout name cannot be empty".to_string());
    }
    if name.chars().count() > MAX_LOADOUT_NAME_CHARS {
        return Err(format!(
            "Loadout name exceeds {} characters",
            MAX_LOADOUT_NAME_CHARS
        ));
    }

    validate_variant(&loadout.ui_theme, ALLOWED_THEMES, "UI theme")?;
    validate_variant(&loadout.pet_skin, ALLOWED_SKINS, "pet skin")?;
    validate_variant(&loadout.pet_scene, ALLOWED_SCENES, "pet scene")?;

    loadout.name = name.to_string();
    loadout.accessories = sanitize_accessories(loadout.accessories);
    Ok(loadout)
}

fn upsert_loadout(
    mut loadouts: Vec<CustomizationLoadout>,
    loadout: CustomizationLoadout,
) -> Vec<CustomizationLoadout> {
    loadouts.retain(|item| !item.name.trim().is_empty());

    if let Some(existing) = loadouts.iter_mut().find(|item| item.name == loadout.name) {
        *existing = loadout;
        return loadouts;
    }

    if loadouts.len() >= MAX_LOADOUTS {
        loadouts.remove(0);
    }
    loadouts.push(loadout);
    loadouts
}

fn load_settings(app: &AppHandle) -> Result<Settings, String> {
    crate::commands::settings::get_settings(app.clone())
}

fn load_pet(app: &AppHandle) -> Result<PetState, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    Ok(store
        .get("pet")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default())
}

#[tauri::command]
pub fn get_customization_loadouts(app: AppHandle) -> Result<Vec<CustomizationLoadout>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let mut loadouts: Vec<CustomizationLoadout> = store
        .get("customization_loadouts")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    loadouts.sort_by_key(|a| a.name.to_lowercase());
    Ok(loadouts)
}

#[tauri::command]
pub fn save_customization_loadout(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    loadout: CustomizationLoadout,
) -> Result<Vec<CustomizationLoadout>, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let loadout = sanitize_loadout(loadout)?;
    let loadouts: Vec<CustomizationLoadout> = store
        .get("customization_loadouts")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    let loadouts = upsert_loadout(loadouts, loadout);
    store.set("customization_loadouts", json!(loadouts));
    let mut sorted: Vec<CustomizationLoadout> = store
        .get("customization_loadouts")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    sorted.sort_by(|a: &CustomizationLoadout, b: &CustomizationLoadout| {
        a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });
    Ok(sorted)
}

#[tauri::command]
pub fn apply_customization_loadout(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    name: String,
) -> Result<CustomizationLoadout, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let loadouts: Vec<CustomizationLoadout> = store
        .get("customization_loadouts")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let loadout = loadouts
        .into_iter()
        .find(|item| item.name == name)
        .ok_or_else(|| "Loadout not found".to_string())?;
    let loadout = sanitize_loadout(loadout)?;

    let mut settings = load_settings(&app)?;
    settings.ui_theme = loadout.ui_theme.clone();
    settings.pet_skin = loadout.pet_skin.clone();
    settings.pet_scene = loadout.pet_scene.clone();
    store.set("settings", json!(settings));

    let mut pet = load_pet(&app)?;
    pet.skin = loadout.pet_skin.clone();
    pet.scene = loadout.pet_scene.clone();
    pet.accessories =
        equipped_accessories_for_loadout(&loadout.accessories, &pet.owned_accessories);
    store.set("pet", json!(pet));

    let _ = app.emit(EVENT_SETTINGS_CHANGED, settings);
    let _ = app.emit(EVENT_PET_STATE_CHANGED, pet);
    Ok(loadout)
}

#[cfg(test)]
mod tests {
    use super::{
        equipped_accessories_for_loadout, sanitize_accessories, sanitize_loadout, upsert_loadout,
    };
    use crate::models::CustomizationLoadout;

    #[test]
    fn sanitize_accessories_removes_unknown_and_dupes() {
        let sanitized = sanitize_accessories(vec![
            "party_hat".to_string(),
            "party_hat".to_string(),
            "unknown".to_string(),
        ]);
        assert_eq!(sanitized, vec!["party_hat".to_string()]);
    }

    #[test]
    fn loadout_equipment_does_not_change_ownership() {
        let owned = vec!["party_hat".to_string()];
        let loadout = vec!["party_hat".to_string(), "scarf".to_string()];
        assert_eq!(equipped_accessories_for_loadout(&loadout, &owned), owned);
    }

    #[test]
    fn sanitize_loadout_trims_name() {
        let loadout = CustomizationLoadout {
            name: "  Cozy  ".to_string(),
            ui_theme: "sunrise".to_string(),
            pet_skin: "classic".to_string(),
            pet_scene: "meadow".to_string(),
            accessories: vec![],
        };
        let sanitized = sanitize_loadout(loadout).unwrap();
        assert_eq!(sanitized.name, "Cozy");
    }

    #[test]
    fn upsert_loadout_preserves_fifo_for_eviction() {
        let mut loadouts = Vec::new();
        for i in 0..40 {
            loadouts.push(CustomizationLoadout {
                name: format!("loadout-{i}"),
                ui_theme: "sunrise".to_string(),
                pet_skin: "classic".to_string(),
                pet_scene: "meadow".to_string(),
                accessories: vec![],
            });
        }

        let updated = upsert_loadout(
            loadouts,
            CustomizationLoadout {
                name: "new-entry".to_string(),
                ui_theme: "sunrise".to_string(),
                pet_skin: "classic".to_string(),
                pet_scene: "meadow".to_string(),
                accessories: vec![],
            },
        );

        assert_eq!(updated.len(), 40);
        assert_eq!(updated.first().map(|v| v.name.as_str()), Some("loadout-1"));
        assert_eq!(updated.last().map(|v| v.name.as_str()), Some("new-entry"));
    }
}
