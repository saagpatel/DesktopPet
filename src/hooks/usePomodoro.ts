import { useState, useEffect, useRef, useCallback } from "react";
import { TIMER_PRESETS, DEFAULT_PRESET } from "../lib/constants";
import {
  EVENT_FOCUS_GUARDRAILS_ALERT,
  EVENT_TRAY_SET_PRESET,
  EVENT_TRAY_TIMER_PAUSE,
  EVENT_TRAY_TIMER_RESET,
  EVENT_TRAY_TIMER_RESUME,
  EVENT_TRAY_TIMER_START,
} from "../lib/events";
import { removeLocalStorage, writeLocalStorage } from "../lib/safeStorage";
import { invokeMaybe, invokeOr, invokeQuiet, listenSafe } from "../lib/tauri";
import type { TimerPreset } from "../lib/constants";
import type {
  FocusGuardrailsStatus,
  Settings,
  TimerRuntimeState,
} from "../store/types";

type TimerPhase = "idle" | "work" | "break" | "celebrating";
type NotificationEvent =
  | "session_start"
  | "break_start"
  | "session_complete"
  | "timer_idle"
  | "guardrail_alert";

interface PomodoroState {
  phase: TimerPhase;
  secondsLeft: number;
  totalSeconds: number;
  sessionId: string | null;
  sessionsCompleted: number;
  preset: TimerPreset;
}

interface TrayBadgeResult {
  usedTitle: boolean;
  usedTooltip: boolean;
}

const TIMER_PHASES: TimerPhase[] = ["idle", "work", "break", "celebrating"];

function isTimerPreset(value: string): value is TimerPreset {
  return value === "short" || value === "standard" || value === "long";
}

function normalizePhase(phase: string): TimerPhase {
  return TIMER_PHASES.includes(phase as TimerPhase)
    ? (phase as TimerPhase)
    : "idle";
}

function getRotatingSample(
  hosts: string[],
  sampleSize: number,
  startIndex: number,
) {
  if (hosts.length <= sampleSize) {
    return hosts;
  }
  const output: string[] = [];
  for (let i = 0; i < sampleSize; i += 1) {
    output.push(hosts[(startIndex + i) % hosts.length]);
  }
  return output;
}

function playSoundCue(volume: number) {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audio.currentTime);
    gain.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)) * 0.05,
      audio.currentTime,
    );
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.12);
    oscillator.onended = () => {
      audio.close().catch(() => undefined);
    };
  } catch {
    // Best effort only.
  }
}

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>({
    phase: "idle",
    secondsLeft: TIMER_PRESETS[DEFAULT_PRESET].work,
    totalSeconds: TIMER_PRESETS[DEFAULT_PRESET].work,
    sessionId: null,
    sessionsCompleted: 0,
    preset: DEFAULT_PRESET,
  });
  const [paused, setPaused] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [guardrailMessage, setGuardrailMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousPhaseRef = useRef<TimerPhase>("idle");
  const toastHistoryRef = useRef<number[]>([]);
  const trayBadgeCountRef = useRef(0);
  const hostSampleOffsetRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setTrayBadge = useCallback(async (count: number) => {
    const result = await invokeMaybe<TrayBadgeResult>("set_tray_badge", {
      count,
    });
    if (!result || !result.usedTitle) {
      writeLocalStorage("desktop-pet-tray-fallback-count", String(count));
    } else {
      removeLocalStorage("desktop-pet-tray-fallback-count");
    }
  }, []);

  const setPreset = useCallback(
    (preset: TimerPreset) => {
      if (state.phase !== "idle") return;
      setState((s) => ({
        ...s,
        preset,
        secondsLeft: TIMER_PRESETS[preset].work,
        totalSeconds: TIMER_PRESETS[preset].work,
      }));
      invokeQuiet("update_settings", { patch: { timerPreset: preset } });
    },
    [state.phase],
  );

  const start = useCallback(async () => {
    if (state.phase !== "idle") return;
    const p = TIMER_PRESETS[state.preset];
    const result = await invokeMaybe<{ id: string }>("start_pomodoro", {
      workDuration: p.work,
      breakDuration: p.break,
    });
    if (!result) return;
    setState((s) => ({
      ...s,
      phase: "work",
      secondsLeft: p.work,
      totalSeconds: p.work,
      sessionId: result.id,
    }));
    setPaused(false);
  }, [state.phase, state.preset]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  const reset = useCallback(() => {
    clearTimer();
    const p = TIMER_PRESETS[state.preset];
    invokeQuiet("set_pet_animation", { animation: "idle" });
    setState((s) => ({
      ...s,
      phase: "idle",
      secondsLeft: p.work,
      totalSeconds: p.work,
      sessionId: null,
    }));
    setPaused(false);
    invokeQuiet("clear_timer_runtime");
  }, [clearTimer, state.preset]);

  useEffect(() => {
    invokeOr<TimerRuntimeState>("get_timer_runtime", undefined, {
      phase: "idle",
      secondsLeft: TIMER_PRESETS[DEFAULT_PRESET].work,
      totalSeconds: TIMER_PRESETS[DEFAULT_PRESET].work,
      paused: false,
      sessionId: null,
      sessionsCompleted: 0,
      preset: DEFAULT_PRESET,
      lastUpdatedAt: new Date().toISOString(),
    }).then((runtime) => {
      const preset = isTimerPreset(runtime.preset)
        ? runtime.preset
        : DEFAULT_PRESET;
      setState({
        phase: normalizePhase(runtime.phase),
        secondsLeft: runtime.secondsLeft,
        totalSeconds: runtime.totalSeconds,
        sessionId: runtime.sessionId,
        sessionsCompleted: runtime.sessionsCompleted,
        preset,
      });
      setPaused(runtime.paused);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    invokeQuiet("save_timer_runtime", {
      runtime: {
        phase: state.phase,
        secondsLeft: state.secondsLeft,
        totalSeconds: state.totalSeconds,
        paused,
        sessionId: state.sessionId,
        sessionsCompleted: state.sessionsCompleted,
        preset: state.preset,
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  }, [hydrated, paused, state]);

  // Tick timer
  useEffect(() => {
    clearTimer();
    if (state.phase === "idle" || state.phase === "celebrating" || paused)
      return;

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.secondsLeft <= 1) {
          if (prev.phase === "work") {
            // Work complete → celebrate (Rust awards coins + updates pet + tracks goals)
            if (prev.sessionId) {
              invokeQuiet("complete_pomodoro", { sessionId: prev.sessionId });
            }
            return {
              ...prev,
              phase: "celebrating" as TimerPhase,
              secondsLeft: 0,
              sessionsCompleted: prev.sessionsCompleted + 1,
            };
          } else if (prev.phase === "break") {
            // Break complete → idle
            invokeQuiet("set_pet_animation", { animation: "idle" });
            const p = TIMER_PRESETS[prev.preset];
            return {
              ...prev,
              phase: "idle" as TimerPhase,
              secondsLeft: p.work,
              totalSeconds: p.work,
              sessionId: null,
            };
          }
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return clearTimer;
  }, [state.phase, paused, clearTimer]);

  // Auto-transition: celebrating → break after 3s
  useEffect(() => {
    if (state.phase !== "celebrating") return;
    const timeout = setTimeout(() => {
      const p = TIMER_PRESETS[state.preset];
      invokeQuiet("set_pet_animation", { animation: "break" });
      // Track break goal (absolute count — each completed work session starts a break)
      invokeQuiet("update_goal_progress", {
        goalId: "breaks",
        progress: state.sessionsCompleted,
      });
      setState((s) => ({
        ...s,
        phase: "break",
        secondsLeft: p.break,
        totalSeconds: p.break,
      }));
    }, 3000);
    return () => clearTimeout(timeout);
  }, [state.phase, state.preset, state.sessionsCompleted]);

  useEffect(() => {
    if (!hydrated) return;
    if (previousPhaseRef.current === state.phase) return;

    previousPhaseRef.current = state.phase;
    invokeMaybe<Settings>("get_settings").then((settings) => {
      if (!settings) return;
      const title = "Pomodoro Buddy";
      const notificationEvent: NotificationEvent =
        state.phase === "work"
          ? "session_start"
          : state.phase === "break"
            ? "break_start"
            : state.phase === "celebrating"
              ? "session_complete"
              : "timer_idle";
      const message =
        notificationEvent === "session_start"
          ? "Focus session started."
          : notificationEvent === "break_start"
            ? "Break time! Step away for a moment."
            : notificationEvent === "session_complete"
              ? "Great work — session complete!"
              : "Timer is now idle.";

      const now = Date.now();
      toastHistoryRef.current = toastHistoryRef.current.filter(
        (timestamp) => now - timestamp < 60 * 60 * 1000,
      );
      const allowToastByPolicy =
        !settings.quietModeEnabled &&
        settings.notificationsEnabled &&
        settings.toastNotificationsEnabled &&
        settings.notificationWhitelist.includes(notificationEvent) &&
        toastHistoryRef.current.length < 3;

      if (allowToastByPolicy && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body: message });
          toastHistoryRef.current.push(now);
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification(title, { body: message });
              toastHistoryRef.current.push(Date.now());
            }
          });
        }
      }

      if (!settings.quietModeEnabled && settings.soundsEnabled) {
        playSoundCue(settings.soundVolume);
      }

      if (settings.trayBadgeEnabled && notificationEvent !== "timer_idle") {
        trayBadgeCountRef.current += 1;
        void setTrayBadge(trayBadgeCountRef.current);
      }

      if (!settings.trayBadgeEnabled) {
        trayBadgeCountRef.current = 0;
        void setTrayBadge(0);
      }

      if (notificationEvent === "timer_idle") {
        trayBadgeCountRef.current = 0;
        void setTrayBadge(0);
      }

      if (state.phase === "idle") {
        setGuardrailMessage(null);
        return;
      }

      const sampledHosts = getRotatingSample(
        settings.focusBlocklist,
        5,
        hostSampleOffsetRef.current,
      );
      hostSampleOffsetRef.current =
        settings.focusBlocklist.length === 0
          ? 0
          : (hostSampleOffsetRef.current + 5) % settings.focusBlocklist.length;
      invokeMaybe<FocusGuardrailsStatus>(
        "apply_focus_guardrails_intervention",
        {
          phase: state.phase,
          hosts: sampledHosts,
        },
      ).then((status) => {
        if (!status || !settings.focusGuardrailsEnabled) {
          setGuardrailMessage(null);
          return;
        }
        if (status.active) {
          setGuardrailMessage(
            `${status.message} [${status.nudgeLevel}] action: ${status.recommendedAction}`,
          );
          if (
            status.recommendedAction === "pause_timer" &&
            state.phase === "work" &&
            !paused
          ) {
            setPaused(true);
          }
        } else {
          setGuardrailMessage(null);
        }
      });
    });
  }, [hydrated, paused, setTrayBadge, state.phase]);

  useEffect(() => {
    const onBlur = () => {
      if (state.phase !== "work") return;
      invokeMaybe<Settings>("get_settings").then((settings) => {
        if (!settings?.focusGuardrailsEnabled) return;
        const sampledHosts = getRotatingSample(
          settings.focusBlocklist,
          5,
          hostSampleOffsetRef.current,
        );
        hostSampleOffsetRef.current =
          settings.focusBlocklist.length === 0
            ? 0
            : (hostSampleOffsetRef.current + 5) %
              settings.focusBlocklist.length;
        invokeMaybe<FocusGuardrailsStatus>(
          "apply_focus_guardrails_intervention",
          {
            phase: "work",
            hosts: sampledHosts,
          },
        ).then((status) => {
          if (!status?.active) return;
          setGuardrailMessage(
            `Intervention: ${status.message} (${status.matchedBlocklist.join(", ") || "no host details"}; sampled ${sampledHosts.length} hosts)`,
          );
          if (status.recommendedAction === "pause_timer" && !paused) {
            setPaused(true);
          }
        });
      });
    };
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
    };
  }, [paused, state.phase]);

  useEffect(() => {
    let cancelled = false;
    let unlisten = () => {};
    listenSafe<FocusGuardrailsStatus>(EVENT_FOCUS_GUARDRAILS_ALERT, (event) => {
      setGuardrailMessage(`Alert: ${event.payload.message}`);
      invokeMaybe<Settings>("get_settings").then((settings) => {
        if (!settings || settings.quietModeEnabled) {
          return;
        }
        const now = Date.now();
        toastHistoryRef.current = toastHistoryRef.current.filter(
          (timestamp) => now - timestamp < 60 * 60 * 1000,
        );
        if (toastHistoryRef.current.length >= 3) {
          return;
        }
        if (
          settings.notificationsEnabled &&
          settings.toastNotificationsEnabled &&
          settings.notificationWhitelist.includes("guardrail_alert")
        ) {
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Pomodoro Buddy", {
                body: event.payload.message,
              });
              toastHistoryRef.current.push(now);
            } else if (Notification.permission === "default") {
              Notification.requestPermission().then((permission) => {
                if (permission !== "granted") {
                  return;
                }
                new Notification("Pomodoro Buddy", {
                  body: event.payload.message,
                });
                toastHistoryRef.current.push(Date.now());
              });
            }
          }
        }
      });
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

  // Listen for tray actions
  useEffect(() => {
    let cancelled = false;
    const listeners: Array<() => void> = [];
    const register = (promise: Promise<() => void>) => {
      promise.then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        listeners.push(fn);
      });
    };

    register(
      listenSafe(EVENT_TRAY_TIMER_START, () => {
        if (state.phase === "idle") start();
      }),
    );

    register(
      listenSafe(EVENT_TRAY_TIMER_PAUSE, () => {
        if (state.phase !== "idle" && !paused) pause();
      }),
    );

    register(
      listenSafe(EVENT_TRAY_TIMER_RESUME, () => {
        if (state.phase !== "idle" && paused) resume();
      }),
    );

    register(
      listenSafe(EVENT_TRAY_TIMER_RESET, () => {
        if (state.phase !== "idle") reset();
      }),
    );

    register(
      listenSafe<string>(EVENT_TRAY_SET_PRESET, (event) => {
        if (isTimerPreset(event.payload)) {
          setPreset(event.payload);
        }
      }),
    );

    return () => {
      cancelled = true;
      for (const unlisten of listeners) {
        unlisten();
      }
    };
  }, [pause, paused, reset, resume, setPreset, start, state.phase]);

  return {
    ...state,
    paused,
    start,
    pause,
    resume,
    reset,
    setPreset,
    guardrailMessage,
  };
}
