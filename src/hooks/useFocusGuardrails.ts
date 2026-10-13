import { useCallback, useEffect, useRef, useState } from "react";
import { invokeMaybe } from "../lib/tauri";
import type {
  FocusGuardrailEvent,
  FocusGuardrailsStatus,
} from "../store/types";

export function useFocusGuardrails() {
  const [status, setStatus] = useState<FocusGuardrailsStatus | null>(null);
  const [events, setEvents] = useState<FocusGuardrailEvent[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const evaluate = useCallback(async (phase: string, hosts: string[]) => {
    const result = await invokeMaybe<FocusGuardrailsStatus>(
      "evaluate_focus_guardrails",
      {
        phase,
        hosts,
      },
    );
    if (!result) return null;
    if (!mounted.current) return null;
    setStatus(result);
    return result;
  }, []);

  const intervene = useCallback(async (phase: string, hosts: string[]) => {
    const result = await invokeMaybe<FocusGuardrailsStatus>(
      "apply_focus_guardrails_intervention",
      {
        phase,
        hosts,
      },
    );
    if (!result) return null;
    if (!mounted.current) return null;
    setStatus(result);
    const latest = await invokeMaybe<FocusGuardrailEvent[]>(
      "get_focus_guardrail_events",
      { limit: 10 },
    );
    if (latest && mounted.current) {
      setEvents(latest);
    }
    return result;
  }, []);

  const refreshEvents = useCallback(async () => {
    const latest = await invokeMaybe<FocusGuardrailEvent[]>(
      "get_focus_guardrail_events",
      { limit: 10 },
    );
    if (!latest) return [];
    if (!mounted.current) return [];
    setEvents(latest);
    return latest;
  }, []);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  return { status, events, evaluate, intervene, refreshEvents };
}
