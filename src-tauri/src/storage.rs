use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::models::{
    AchievementState, CoinBalance, PetState, Settings, TimerRuntimeState, CURRENT_SCHEMA_VERSION,
};

fn normalized_schema(existing: Option<u64>) -> Result<u32, String> {
    match existing {
        None => Ok(4),
        Some(value) => {
            u32::try_from(value).map_err(|_| "Stored schema version is invalid".to_string())
        }
    }
}

fn migrate_store(
    store: &tauri_plugin_store::Store<tauri::Wry>,
    mut version: u32,
) -> Result<u32, String> {
    if version > CURRENT_SCHEMA_VERSION {
        return Err(format!(
            "Stored schema {version} is newer than supported schema {CURRENT_SCHEMA_VERSION}"
        ));
    }
    while version < CURRENT_SCHEMA_VERSION {
        match version {
            4 => {
                if let Some(mut pet) = store.get("pet") {
                    if let Some(object) = pet.as_object_mut() {
                        if !object.contains_key("ownedAccessories") {
                            let existing = object
                                .get("accessories")
                                .cloned()
                                .unwrap_or_else(|| serde_json::json!([]));
                            object.insert("ownedAccessories".to_string(), existing);
                        }
                        store.set("pet", pet);
                    }
                }
                version = 5;
                store.set("schema_version", json!(version));
            }
            _ => {
                return Err(format!(
                    "No storage migration is available from schema {version}"
                ))
            }
        }
    }
    Ok(version)
}

pub fn ensure_schema_version(app: &AppHandle) -> Result<u32, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let existing = match store.get("schema_version") {
        Some(value) => Some(
            value
                .as_u64()
                .ok_or_else(|| "Stored schema version is malformed".to_string())?,
        ),
        None => None,
    };
    let current = migrate_store(&store, normalized_schema(existing)?)?;

    if existing.is_none() {
        store.set("schema_version", json!(CURRENT_SCHEMA_VERSION));
        store
            .save()
            .map_err(|error| format!("Could not initialize schema version: {error}"))?;
    }
    if store.get("settings").is_none() {
        store.set("settings", json!(Settings::default()));
    }
    if store.get("timer_runtime").is_none() {
        store.set("timer_runtime", json!(TimerRuntimeState::default()));
    }
    if store.get("pet").is_none() {
        store.set("pet", json!(PetState::default()));
    }
    if store.get("coins").is_none() {
        store.set("coins", json!(CoinBalance::default()));
    }
    if store.get("achievement_state").is_none() {
        store.set("achievement_state", json!(AchievementState::default()));
    }

    store
        .save()
        .map_err(|error| format!("Could not save storage migration: {error}"))?;

    Ok(current)
}

#[cfg(test)]
mod tests {
    use super::normalized_schema;

    #[test]
    fn normalized_schema_uses_current_when_missing() {
        assert_eq!(normalized_schema(None).unwrap(), 4);
    }

    #[test]
    fn normalized_schema_uses_current_when_invalid() {
        assert!(normalized_schema(Some(u64::MAX)).is_err());
    }

    #[test]
    fn normalized_schema_uses_existing_when_valid() {
        assert_eq!(normalized_schema(Some(3)).unwrap(), 3);
    }
}
