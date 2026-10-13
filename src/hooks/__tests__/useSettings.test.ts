import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSettings } from "../useSettings";

vi.mock("../../lib/tauri", () => ({
  invokeMaybe: vi.fn(async (command: string, args: any) => {
    if (command === "update_settings") {
      return {
        timerPreset: args.patch?.timerPreset || "standard",
        notificationsEnabled:
          args.patch?.notificationsEnabled !== undefined
            ? args.patch.notificationsEnabled
            : true,
        toastNotificationsEnabled:
          args.patch?.toastNotificationsEnabled !== undefined
            ? args.patch.toastNotificationsEnabled
            : false,
        trayBadgeEnabled:
          args.patch?.trayBadgeEnabled !== undefined
            ? args.patch.trayBadgeEnabled
            : true,
        notificationWhitelist: args.patch?.notificationWhitelist || [
          "session_complete",
        ],
        soundsEnabled:
          args.patch?.soundsEnabled !== undefined
            ? args.patch.soundsEnabled
            : false,
        soundVolume:
          args.patch?.soundVolume !== undefined ? args.patch.soundVolume : 0.7,
        quietModeEnabled:
          args.patch?.quietModeEnabled !== undefined
            ? args.patch.quietModeEnabled
            : true,
        focusModeEnabled:
          args.patch?.focusModeEnabled !== undefined
            ? args.patch.focusModeEnabled
            : false,
        animationBudget: args.patch?.animationBudget || "medium",
        contextAwareChillEnabled:
          args.patch?.contextAwareChillEnabled !== undefined
            ? args.patch.contextAwareChillEnabled
            : true,
        chillOnFullscreen:
          args.patch?.chillOnFullscreen !== undefined
            ? args.patch.chillOnFullscreen
            : true,
        chillOnMeetings:
          args.patch?.chillOnMeetings !== undefined
            ? args.patch.chillOnMeetings
            : true,
        chillOnHeavyTyping:
          args.patch?.chillOnHeavyTyping !== undefined
            ? args.patch.chillOnHeavyTyping
            : true,
        meetingHosts: args.patch?.meetingHosts || ["zoom.us"],
        heavyTypingThresholdCpm: args.patch?.heavyTypingThresholdCpm || 220,
        enabledSeasonalPacks: args.patch?.enabledSeasonalPacks || [],
        validatedSpeciesPacks: args.patch?.validatedSpeciesPacks || ["penguin"],
        uiTheme: args.patch?.uiTheme || "sunrise",
        petSkin: args.patch?.petSkin || "classic",
        petScene: args.patch?.petScene || "meadow",
        focusGuardrailsEnabled:
          args.patch?.focusGuardrailsEnabled !== undefined
            ? args.patch.focusGuardrailsEnabled
            : false,
        focusGuardrailsWorkOnly:
          args.patch?.focusGuardrailsWorkOnly !== undefined
            ? args.patch.focusGuardrailsWorkOnly
            : true,
        focusAllowlist: args.patch?.focusAllowlist || [],
        focusBlocklist: args.patch?.focusBlocklist || [],
      };
    }
    return null;
  }),
  invokeOr: vi.fn(async (command: string, _args: any, defaultValue: any) => {
    if (command === "get_settings") {
      return {
        timerPreset: "standard",
        notificationsEnabled: true,
        toastNotificationsEnabled: false,
        trayBadgeEnabled: true,
        notificationWhitelist: ["session_complete"],
        soundsEnabled: false,
        soundVolume: 0.7,
        quietModeEnabled: true,
        focusModeEnabled: false,
        animationBudget: "medium",
        contextAwareChillEnabled: true,
        chillOnFullscreen: true,
        chillOnMeetings: true,
        chillOnHeavyTyping: true,
        meetingHosts: ["zoom.us"],
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
    }
    return defaultValue;
  }),
  listenSafe: vi.fn(function () {
    return Promise.resolve(() => {});
  }),
}));

describe("useSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default settings", async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    expect(result.current.settings.uiTheme).toBe("sunrise");
    expect(result.current.settings.notificationsEnabled).toBe(true);
  });

  it("should update a single setting", async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    const initialTheme = result.current.settings.uiTheme;

    await act(async () => {
      await result.current.updateSettings({ uiTheme: "midnight" });
    });

    await waitFor(() => {
      expect(result.current.settings.uiTheme).not.toBe(initialTheme);
    });
  });

  it("should toggle notifications", async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    const initialState = result.current.settings.notificationsEnabled;

    await act(async () => {
      await result.current.updateSettings({
        notificationsEnabled: !initialState,
      });
    });

    await waitFor(() => {
      expect(result.current.settings.notificationsEnabled).toBe(!initialState);
    });
  });

  it("should update volume within valid range", async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    await act(async () => {
      await result.current.updateSettings({ soundVolume: 0.75 });
    });

    await waitFor(() => {
      expect(result.current.settings.soundVolume).toBe(0.75);
    });
  });
});
