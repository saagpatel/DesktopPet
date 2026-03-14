import { useCallback, useEffect, useRef, useState } from "react";
import { EVENT_PET_STATE_CHANGED } from "../lib/events";
import { invokeMaybe, invokeOr, listenSafe } from "../lib/tauri";
import type { PetEvent, PetQuest } from "../store/types";

export function usePetEvents() {
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [activeQuest, setActiveQuest] = useState<PetQuest | null>(null);
  const [rollFeedback, setRollFeedback] = useState<PetEvent | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(() => {
    Promise.all([
      invokeOr<PetEvent[]>("get_pet_events", undefined, []),
      invokeOr<PetQuest | null>("get_pet_active_quest", undefined, null),
    ]).then(([latestEvents, quest]) => {
      if (!mounted.current) {
        return;
      }
      setEvents(latestEvents);
      setActiveQuest(quest);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();

    let cancelled = false;
    let unlisten = () => {};
    listenSafe(EVENT_PET_STATE_CHANGED, () => {
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
      mounted.current = false;
      unlisten();
    };
  }, [refresh]);

  const rollEvent = useCallback(async () => {
    const event = await invokeMaybe<PetEvent>("roll_pet_event");
    if (!event) return null;
    if (!mounted.current) {
      return event;
    }
    setRollFeedback(event);
    if (event.kind !== "quiet") {
      refresh();
    }
    return event;
  }, [refresh]);

  const resolveEvent = useCallback(
    async (eventId: string) => {
      const updated = await invokeMaybe<PetEvent[]>("resolve_pet_event", {
        eventId,
      });
      if (!updated) return events;
      setEvents(updated);
      return updated;
    },
    [events],
  );

  return {
    events,
    activeQuest,
    rollFeedback,
    refresh,
    rollEvent,
    resolveEvent,
  };
}
