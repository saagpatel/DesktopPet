import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomizationPanel } from "../CustomizationPanel";
import type { PetState, Settings } from "../../../store/types";
import { getSpeciesPackById } from "../../../pets/species";

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

describe("CustomizationPanel smoke flow", () => {
  it("requires pack activation before species selection", async () => {
    const user = userEvent.setup();
    const onUpdateSettings = vi.fn();
    const onSetPetSpecies = vi.fn();

    render(
      <CustomizationPanel
        settings={settings}
        pet={pet}
        loadouts={[]}
        onUpdateSettings={onUpdateSettings}
        onSetPetCustomization={vi.fn()}
        onSetPetSpecies={onSetPetSpecies}
        onSaveLoadout={vi.fn()}
        onApplyLoadout={vi.fn()}
      />,
    );

    const speciesSelect = screen.getByLabelText("Species") as HTMLSelectElement;
    expect(speciesSelect.options.length).toBe(1);
    expect(speciesSelect.options[0].textContent).toBe("Penguin");

    await user.click(screen.getByRole("button", { name: "Activate Cat" }));

    expect(onUpdateSettings).toHaveBeenCalledWith({
      validatedSpeciesPacks: ["penguin", "cat"],
    });
    expect(onSetPetSpecies).not.toHaveBeenCalled();
  });

  it("keeps seasonal bundles opt-in and applies presets without notification changes", async () => {
    const user = userEvent.setup();
    const onUpdateSettings = vi.fn();
    const onSetPetSpecies = vi.fn();
    const onSetPetCustomization = vi.fn();

    const view = render(
      <CustomizationPanel
        settings={settings}
        pet={pet}
        loadouts={[]}
        onUpdateSettings={onUpdateSettings}
        onSetPetCustomization={onSetPetCustomization}
        onSetPetSpecies={onSetPetSpecies}
        onSaveLoadout={vi.fn()}
        onApplyLoadout={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Petal Morning/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Spring Blossom"));
    expect(onUpdateSettings).toHaveBeenCalledWith({
      enabledSeasonalPacks: ["spring-blossom"],
    });

    const enabledSettings: Settings = {
      ...settings,
      enabledSeasonalPacks: ["spring-blossom"],
    };

    onUpdateSettings.mockClear();
    view.rerender(
      <CustomizationPanel
        settings={enabledSettings}
        pet={pet}
        loadouts={[]}
        onUpdateSettings={onUpdateSettings}
        onSetPetCustomization={onSetPetCustomization}
        onSetPetSpecies={onSetPetSpecies}
        onSaveLoadout={vi.fn()}
        onApplyLoadout={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Petal Morning/i }));
    expect(onSetPetCustomization).toHaveBeenCalledWith("plush", "meadow");

    const catPack = getSpeciesPackById("cat");
    expect(onSetPetSpecies).toHaveBeenCalledWith(
      "cat",
      catPack.evolutionThresholds,
    );
    expect(onUpdateSettings).toHaveBeenCalledWith({
      uiTheme: "sunrise",
      petSkin: "plush",
      petScene: "meadow",
    });
    expect(onUpdateSettings).toHaveBeenCalledWith({
      validatedSpeciesPacks: ["penguin", "cat"],
    });
    expect(onUpdateSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({
        toastNotificationsEnabled: expect.anything(),
      }),
    );
  });
});
