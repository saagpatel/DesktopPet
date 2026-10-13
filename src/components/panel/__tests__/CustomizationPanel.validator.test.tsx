import { describe, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomizationPanel } from "../CustomizationPanel";
import type { PetState, Settings } from "../../../store/types";

vi.mock("../../../pets/packValidation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../pets/packValidation")>();
  return {
    ...actual,
    validateSpeciesPacks: vi.fn(() => [
      {
        speciesId: "penguin",
        pass: false,
        checks: [
          {
            id: "thresholds",
            label: "Valid ascending evolution thresholds",
            pass: false,
            detail: "0 / 8 / 4",
            remediation:
              "Set thresholds to [0, mid, final] where mid >= 1 and final > mid.",
          },
        ],
      },
    ]),
  };
});

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

const pet: PetState = {
  currentStage: 0,
  animationState: "idle",
  accessories: [],
  totalPomodoros: 0,
  speciesId: "penguin",
  evolutionThresholds: [0, 5, 15],
  mood: "content",
  energy: 80,
  hunger: 20,
  cleanliness: 80,
  affection: 50,
  personality: "balanced",
  evolutionPath: "undetermined",
  skin: "classic",
  scene: "meadow",
  lastInteraction: null,
  lastCareUpdateAt: new Date().toISOString(),
};

describe("CustomizationPanel validator reports", () => {
  it("shows copyable failure report details when validation fails", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    render(
      <CustomizationPanel
        settings={settings}
        pet={pet}
        loadouts={[]}
        onUpdateSettings={vi.fn()}
        onSetPetCustomization={vi.fn()}
        onSetPetSpecies={vi.fn()}
        onSaveLoadout={vi.fn()}
        onApplyLoadout={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Copy Penguin validation report" }),
    );

    await screen.findByText((text) =>
      text.includes("Clipboard unavailable. Species validation report:"),
    );
    await screen.findByText((text) =>
      text.includes("Species: Penguin (penguin)"),
    );
  });
});
