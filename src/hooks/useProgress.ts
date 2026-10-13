import { useEffect, useState } from "react";
import { EVENT_PROFILE_CHANGED } from "../lib/events";
import { invokeOr, listenSafe } from "../lib/tauri";
import type { UserProgress } from "../store/types";

const defaultProgress: UserProgress = {
  xpTotal: 0,
  level: 1,
  streakDays: 0,
  longestStreak: 0,
  lastActiveDate: null,
  totalSessions: 0,
  totalFocusMinutes: 0,
  totalTasksCompleted: 0,
};

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);

  useEffect(() => {
    invokeOr<UserProgress>(
      "get_user_progress",
      undefined,
      defaultProgress,
    ).then(setProgress);

    let cancelled = false;
    let unlisten = () => {};
    listenSafe<UserProgress>(EVENT_PROFILE_CHANGED, (event) => {
      setProgress(event.payload);
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

  return { progress };
}
