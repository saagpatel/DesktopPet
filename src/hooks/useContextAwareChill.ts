import { useEffect, useRef } from "react";
import { publishChillSignals } from "../lib/chill";
import type { FocusGuardrailsStatus, Settings } from "../store/types";

function hostMatchesPattern(host: string, pattern: string) {
  return host === pattern || host.endsWith(`.${pattern}`);
}

function includesMeetingHost(hosts: string[], patterns: string[]) {
  return hosts.some((host) =>
    patterns.some((pattern) => hostMatchesPattern(host, pattern)),
  );
}

export function useContextAwareChill(
  settings: Settings,
  guardrailStatus: FocusGuardrailsStatus | null,
) {
  const keyPressTimes = useRef<number[]>([]);
  const activeSignals = useRef({
    fullscreen: false,
    heavyTyping: false,
  });

  useEffect(() => {
    const publish = () => {
      const matchedHosts = guardrailStatus
        ? [
            ...guardrailStatus.matchedAllowlist,
            ...guardrailStatus.matchedBlocklist,
          ]
        : [];
      const meeting = settings.chillOnMeetings
        ? includesMeetingHost(matchedHosts, settings.meetingHosts)
        : false;
      publishChillSignals({
        fullscreen:
          settings.chillOnFullscreen && activeSignals.current.fullscreen,
        heavyTyping:
          settings.chillOnHeavyTyping && activeSignals.current.heavyTyping,
        meeting,
        focusMode: settings.focusModeEnabled,
        timestamp: Date.now(),
      });
    };

    const updateFullscreen = () => {
      const isFullscreen =
        !!document.fullscreenElement ||
        (window.innerHeight >= window.screen.height &&
          window.innerWidth >= window.screen.width);
      activeSignals.current.fullscreen = isFullscreen;
      publish();
    };

    const onKeyDown = () => {
      const now = Date.now();
      keyPressTimes.current.push(now);
      const windowMs = 15_000;
      keyPressTimes.current = keyPressTimes.current.filter(
        (ts) => now - ts <= windowMs,
      );
      const charsPerMinute = Math.round(
        keyPressTimes.current.length * (60_000 / windowMs),
      );
      activeSignals.current.heavyTyping =
        charsPerMinute >= settings.heavyTypingThresholdCpm;
      publish();
    };

    const onFocus = () => {
      updateFullscreen();
    };

    const decayInterval = window.setInterval(() => {
      const now = Date.now();
      keyPressTimes.current = keyPressTimes.current.filter(
        (ts) => now - ts <= 15_000,
      );
      if (
        keyPressTimes.current.length === 0 &&
        activeSignals.current.heavyTyping
      ) {
        activeSignals.current.heavyTyping = false;
        publish();
      }
    }, 3_000);

    document.addEventListener("fullscreenchange", updateFullscreen);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("focus", onFocus);
    updateFullscreen();
    publish();

    return () => {
      window.clearInterval(decayInterval);
      document.removeEventListener("fullscreenchange", updateFullscreen);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    guardrailStatus,
    settings.chillOnFullscreen,
    settings.chillOnHeavyTyping,
    settings.chillOnMeetings,
    settings.focusModeEnabled,
    settings.heavyTypingThresholdCpm,
    settings.meetingHosts,
  ]);
}
