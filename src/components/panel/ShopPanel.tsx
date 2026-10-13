import { SHOP_ITEMS } from "../../lib/constants";
import type { ShopItemId } from "../../lib/constants";
import { getAccessoryBehaviorProfile } from "../../pets/accessoryBehavior";
import { invokeMaybe } from "../../lib/tauri";
import { CoinBadge } from "../shared/CoinBadge";

interface Props {
  available: number;
  ownedAccessories: ShopItemId[];
}

export function ShopPanel({ available, ownedAccessories }: Props) {
  const handleBuy = async (itemId: ShopItemId) => {
    await invokeMaybe("purchase_item", { itemId });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--muted-color)" }}
        >
          Your balance:
        </span>
        <CoinBadge amount={available} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SHOP_ITEMS.map((item) => {
          const owned = ownedAccessories.includes(item.id);
          const canAfford = available >= item.cost;
          const behaviorProfile = getAccessoryBehaviorProfile(item.id);
          return (
            <div
              key={item.id}
              className="p-3 rounded-lg border text-center"
              style={{
                backgroundColor: owned
                  ? "color-mix(in srgb, var(--accent-soft) 55%, #dcfce7)"
                  : "var(--card-bg)",
                borderColor: owned
                  ? "color-mix(in srgb, var(--accent-color) 25%, #16a34a)"
                  : "var(--border-color)",
              }}
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div
                className="text-sm font-medium"
                style={{ color: "var(--text-color)" }}
              >
                {item.name}
              </div>
              <div
                className="text-xs mb-2"
                style={{ color: "var(--muted-color)" }}
              >
                <CoinBadge amount={item.cost} />
              </div>
              <div
                className="text-[11px] mb-2 leading-snug"
                style={{ color: "var(--muted-color)", minHeight: "2.2rem" }}
              >
                {behaviorProfile.shopHint}
              </div>
              {owned ? (
                <span
                  className="text-xs font-medium"
                  style={{
                    color:
                      "color-mix(in srgb, var(--accent-color) 40%, #15803d)",
                  }}
                >
                  Owned
                </span>
              ) : (
                <button
                  onClick={() => handleBuy(item.id)}
                  disabled={!canAfford}
                  className="px-3 py-1 text-xs rounded-full font-medium transition-opacity disabled:cursor-not-allowed"
                  style={
                    canAfford
                      ? {
                          backgroundColor: "var(--accent-color)",
                          color: "white",
                        }
                      : {
                          backgroundColor:
                            "color-mix(in srgb, var(--muted-color) 20%, white)",
                          color: "var(--muted-color)",
                        }
                  }
                >
                  Buy
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
