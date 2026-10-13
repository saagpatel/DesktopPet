import { useCallback, useEffect, useState } from "react";
import { EVENT_SETTINGS_CHANGED } from "../lib/events";
import { invokeMaybe, invokeOr, listenSafe } from "../lib/tauri";
import type { Settings, SettingsPatch } from "../store/types";

const defaultSettings: Settings = {
  timerPreset: "standard",
  notificationsEnabled: true,
  toastNotificationsEnabled: false,
  trayBadgeEnabled: true,
  notificationWhitelist: ["session_complete", "guardrail_alert"],
  soundsEnabled: false,
  soundVolume: 0.7,
  quietModeEnabled: true,
  focusModeEnabled: false,
  animationBudget: "medium",
  contextAwareChillEnabled: true,
  chillOnFullscreen: true,
  chillOnMeetings: true,
  chillOnHeavyTyping: true,
  meetingHosts: ["zoom.us", "meet.google.com", "teams.microsoft.com"],
  heavyTypingThresholdCpm: 220,
  enabledSeasonalPacks: [],
  validatedSpeciesPacks: ["penguin"],
  uiTheme: "sunrise",
  petSkin: "classic",
  petScene: "meadow",
  focusGuardrailsEnabled: false,
  focusGuardrailsWorkOnly: true,
  focusAllowlist: [],
  focusBlocklist: [],
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    invokeOr<Settings>("get_settings", undefined, defaultSettings).then(
      setSettings,
    );

    let cancelled = false;
    let unlisten = () => {};
    listenSafe<Settings>(EVENT_SETTINGS_CHANGED, (event) => {
      setSettings(event.payload);
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

  const updateSettings = useCallback(
    async (patch: SettingsPatch) => {
      const updated = await invokeMaybe<Settings>("update_settings", { patch });
      if (!updated) return settings;
      setSettings(updated);
      return updated;
    },
    [settings],
  );

  return { settings, updateSettings };
}
