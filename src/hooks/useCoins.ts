import { useState, useEffect, useCallback } from "react";
import { EVENT_COINS_CHANGED } from "../lib/events";
import { invokeMaybe, invokeOr, listenSafe } from "../lib/tauri";
import type { CoinBalance } from "../store/types";

export function useCoins() {
  const [coins, setCoins] = useState<CoinBalance>({ total: 0, spent: 0 });

  useEffect(() => {
    invokeOr<CoinBalance>("get_coin_balance", undefined, {
      total: 0,
      spent: 0,
    }).then(setCoins);

    let cancelled = false;
    let unlisten = () => {};
    listenSafe<CoinBalance>(EVENT_COINS_CHANGED, (event) => {
      setCoins(event.payload);
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten();
    };
  }, []);

  const spend = useCallback(
    async (amount: number) => {
      const updated = await invokeMaybe<CoinBalance>("spend_coins", { amount });
      if (!updated) return coins;
      setCoins(updated);
      return updated;
    },
    [coins],
  );

  return { coins, available: coins.total - coins.spent, spend };
}
