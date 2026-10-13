import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { downloadPetCard, resolvePetCardTheme } from "../photoBooth";
import { getSpeciesPackById } from "../../pets/species";
import type { PetState, Settings, UserProgress } from "../../store/types";

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

describe("photo booth", () => {
  const originalImage = globalThis.Image;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: MockImage,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: originalImage,
    });
    document.createElement = originalCreateElement;
    vi.restoreAllMocks();
  });

  it("creates and triggers download for pet card", async () => {
    const click = vi.fn();
    const anchor = {
      click,
      set href(_v: string) {},
      set download(_v: string) {},
    };
    const ctx = {
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      font: "",
      fillStyle: "",
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
      toBlob: (cb: (blob: Blob) => void) =>
        cb(new Blob(["ok"], { type: "image/png" })),
    };

    // @ts-expect-error test override
    document.createElement = vi.fn((tag: string) => {
      if (tag === "canvas") return canvas;
      if (tag === "a") return anchor;
      return originalCreateElement(tag);
    });

    const pet: PetState = {
      currentStage: 0,
      animationState: "idle",
      accessories: [],
      totalPomodoros: 2,
      speciesId: "penguin",
      evolutionThresholds: [0, 5, 15],
      mood: "content",
      energy: 80,
      hunger: 20,
      cleanliness: 80,
      affection: 50,
      personality: "balanced",
      evolutionPath: "companion",
      skin: "classic",
      scene: "meadow",
      lastInteraction: null,
      lastCareUpdateAt: new Date().toISOString(),
    };
    const settings: Settings = {
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
    const progress: UserProgress = {
      xpTotal: 120,
      level: 2,
      streakDays: 3,
      longestStreak: 3,
      lastActiveDate: null,
      totalSessions: 5,
      totalFocusMinutes: 125,
      totalTasksCompleted: 4,
    };

    await downloadPetCard({
      pet,
      species: getSpeciesPackById("penguin"),
      stageName: "Pebble",
      coinsAvailable: 40,
      progress,
      settings,
    });

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("resolves species and loadout-aware themes", () => {
    const pet: PetState = {
      currentStage: 1,
      animationState: "idle",
      accessories: [],
      totalPomodoros: 8,
      speciesId: "cat",
      evolutionThresholds: [0, 4, 12],
      mood: "content",
      energy: 80,
      hunger: 20,
      cleanliness: 80,
      affection: 50,
      personality: "balanced",
      evolutionPath: "companion",
      skin: "classic",
      scene: "cozy_room",
      lastInteraction: null,
      lastCareUpdateAt: new Date().toISOString(),
    };
    const settings: Settings = {
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
      meetingHosts: ["zoom.us"],
      heavyTypingThresholdCpm: 220,
      enabledSeasonalPacks: [],
      validatedSpeciesPacks: ["penguin", "cat"],
      uiTheme: "sunrise",
      petSkin: "neon",
      petScene: "cozy_room",
      focusGuardrailsEnabled: false,
      focusGuardrailsWorkOnly: true,
      focusAllowlist: [],
      focusBlocklist: [],
    };

    const theme = resolvePetCardTheme({
      pet,
      species: getSpeciesPackById("cat"),
      settings,
    });
    expect(theme.id).toBe("cat-cozy-night");
    expect(theme.titleColor).toBe("#0f172a");
  });
});
