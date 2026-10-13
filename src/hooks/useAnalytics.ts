import { useCallback, useEffect, useState } from "react";
import { EVENT_ANALYTICS_CHANGED } from "../lib/events";
import { invokeOr, listenSafe } from "../lib/tauri";
import type { DailySummary } from "../store/types";

export function useAnalytics(days = 14) {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);

  const refresh = useCallback(() => {
    invokeOr<DailySummary[]>("get_daily_summaries", { days }, []).then(
      setSummaries,
    );
  }, [days]);

  useEffect(() => {
    refresh();
    let cancelled = false;
    let unlisten = () => {};
    listenSafe(EVENT_ANALYTICS_CHANGED, () => {
      refresh();
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
  }, [refresh]);

  return { summaries, refresh };
}
