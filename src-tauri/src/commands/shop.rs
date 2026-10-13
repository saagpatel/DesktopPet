use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

use crate::events::{EVENT_COINS_CHANGED, EVENT_PET_STATE_CHANGED};
use crate::models::{CoinBalance, PetState};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopItem {
    pub id: String,
    pub name: String,
    pub cost: u32,
}

fn shop_catalog() -> Vec<ShopItem> {
    vec![
        ShopItem {
            id: "party_hat".into(),
            name: "Party Hat".into(),
            cost: 30,
        },
        ShopItem {
            id: "bow_tie".into(),
            name: "Bow Tie".into(),
            cost: 20,
        },
        ShopItem {
            id: "sunglasses".into(),
            name: "Sunglasses".into(),
            cost: 25,
        },
        ShopItem {
            id: "scarf".into(),
            name: "Scarf".into(),
            cost: 35,
        },
        ShopItem {
            id: "apple".into(),
            name: "Apple".into(),
            cost: 5,
        },
        ShopItem {
            id: "cookie".into(),
            name: "Cookie".into(),
            cost: 10,
        },
    ]
}

pub fn accessory_count() -> u32 {
    shop_catalog().len().try_into().unwrap_or(u32::MAX)
}

#[tauri::command]
pub fn get_shop_items() -> Vec<ShopItem> {
    shop_catalog()
}

#[tauri::command]
pub fn purchase_item(
    app: AppHandle,
    store_lock: tauri::State<'_, crate::StoreLock>,
    item_id: String,
) -> Result<PetState, String> {
    let _guard = store_lock.0.lock().map_err(|e| e.to_string())?;
    let store = app.store("store.json").map_err(|e| e.to_string())?;

    let mut pet: PetState = store
        .get("pet")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    if pet.owned_accessories.contains(&item_id) {
        return Err("Already owned".to_string());
    }

    let catalog = shop_catalog();
    let item = catalog
        .iter()
        .find(|i| i.id == item_id)
        .ok_or_else(|| "Item not found".to_string())?;

    let mut coins: CoinBalance = store
        .get("coins")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    if coins.available() < item.cost {
        return Err("Insufficient coins".to_string());
    }

    coins.spent = coins.spent.saturating_add(item.cost);
    store.set("coins", json!(coins));
    let _ = app.emit(EVENT_COINS_CHANGED, &coins);

    pet.owned_accessories.push(item_id.clone());
    pet.accessories.push(item_id);
    store.set("pet", json!(pet));
    let _ = app.emit(EVENT_PET_STATE_CHANGED, &pet);

    Ok(pet)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_has_6_items() {
        assert_eq!(shop_catalog().len(), 6);
    }

    #[test]
    fn catalog_no_duplicate_ids() {
        let catalog = shop_catalog();
        let ids: Vec<_> = catalog.iter().map(|i| &i.id).collect();
        let unique: std::collections::HashSet<_> = ids.iter().collect();
        assert_eq!(ids.len(), unique.len());
    }

    #[test]
    fn catalog_all_positive_costs() {
        for item in shop_catalog() {
            assert!(item.cost > 0, "item {} should have positive cost", item.id);
        }
    }

    #[test]
    fn catalog_all_have_names() {
        for item in shop_catalog() {
            assert!(!item.name.is_empty(), "item {} should have a name", item.id);
        }
    }

    #[test]
    fn catalog_contains_expected_items() {
        let catalog = shop_catalog();
        let ids: Vec<_> = catalog.iter().map(|i| i.id.as_str()).collect();
        assert!(ids.contains(&"party_hat"));
        assert!(ids.contains(&"bow_tie"));
        assert!(ids.contains(&"sunglasses"));
        assert!(ids.contains(&"scarf"));
        assert!(ids.contains(&"apple"));
        assert!(ids.contains(&"cookie"));
    }

    #[test]
    fn catalog_item_costs() {
        let catalog = shop_catalog();
        let find = |id: &str| catalog.iter().find(|i| i.id == id).unwrap();
        assert_eq!(find("party_hat").cost, 30);
        assert_eq!(find("bow_tie").cost, 20);
        assert_eq!(find("sunglasses").cost, 25);
        assert_eq!(find("scarf").cost, 35);
        assert_eq!(find("apple").cost, 5);
        assert_eq!(find("cookie").cost, 10);
    }

    #[test]
    fn shop_item_serializes_camel_case() {
        let item = ShopItem {
            id: "test".to_string(),
            name: "Test Item".to_string(),
            cost: 10,
        };
        let json = serde_json::to_value(&item).unwrap();
        assert!(json.get("id").is_some());
        assert!(json.get("name").is_some());
        assert!(json.get("cost").is_some());
    }

    #[test]
    fn get_shop_items_returns_catalog() {
        let items = get_shop_items();
        assert_eq!(items.len(), 6);
    }
}
