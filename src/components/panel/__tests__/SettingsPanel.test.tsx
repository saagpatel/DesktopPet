import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPanel } from "../SettingsPanel";
import type { SettingsPanelProps } from "../SettingsPanel";
import type { AppDiagnostics, Settings } from "../../../store/types";

const baseSettings: Settings = {
  timerPreset: "standard",
  notificationsEnabled: true,
  toastNotificationsEnabled: false,
  trayBadgeEnabled: true,
  notificationWhitelist: ["session_complete", "guardrail_alert"],
  soundsEnabled: true,
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

function createProps(
  overrides: Partial<SettingsPanelProps> = {},
): SettingsPanelProps {
  return {
    preset: "standard",
    settings: baseSettings,
    onSetPreset: vi.fn(),
    onSetNotificationsEnabled: vi.fn(),
    onSetToastNotificationsEnabled: vi.fn(),
    onSetTrayBadgeEnabled: vi.fn(),
    onSetNotificationWhitelist: vi.fn(),
    onSetSoundsEnabled: vi.fn(),
    onSetSoundVolume: vi.fn(),
    onSetQuietModeEnabled: vi.fn(),
    onSetFocusModeEnabled: vi.fn(),
    onSetAnimationBudget: vi.fn(),
    onSetContextAwareChillEnabled: vi.fn(),
    onSetChillOnFullscreen: vi.fn(),
    onSetChillOnMeetings: vi.fn(),
    onSetChillOnHeavyTyping: vi.fn(),
    onSetMeetingHosts: vi.fn(),
    onSetHeavyTypingThresholdCpm: vi.fn(),
    onSetFocusGuardrailsEnabled: vi.fn(),
    onSetFocusGuardrailsWorkOnly: vi.fn(),
    onSetFocusAllowlist: vi.fn(),
    onSetFocusBlocklist: vi.fn(),
    onEvaluateGuardrails: vi.fn(),
    onInterveneGuardrails: vi.fn(),
    onExportData: vi.fn(async () => "Backup exported"),
    onImportData: vi.fn(async () => "Import complete"),
    onResetData: vi.fn(async () => "Reset complete"),
    onGetDiagnostics: vi.fn(async () => null),
    onRecoverPetWindow: vi.fn(async () => "Pet moved back on screen"),
    guardrailStatus: null,
    guardrailEvents: [],
    disabled: false,
    ...overrides,
  };
}

describe("SettingsPanel data operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs export and displays operation result", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<SettingsPanel {...props} />);

    await user.click(screen.getByRole("button", { name: "Export Backup" }));

    expect(props.onExportData).toHaveBeenCalledTimes(1);
    await screen.findByText("Backup exported");
  });

  it("runs reset when confirmed", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<SettingsPanel {...props} />);

    await user.click(screen.getByRole("button", { name: "Reset App Data" }));
    await user.click(screen.getByRole("button", { name: "Confirm Reset" }));

    expect(props.onResetData).toHaveBeenCalledTimes(1);
    await screen.findByText("Reset complete");
  });

  it("does not run reset when the inline confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<SettingsPanel {...props} />);

    await user.click(screen.getByRole("button", { name: "Reset App Data" }));
    await user.click(screen.getByRole("button", { name: "Keep My Data" }));

    expect(props.onResetData).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Confirm Reset" }),
    ).not.toBeInTheDocument();
  });

  it("rejects oversize backup import before invoking import command", async () => {
    const props = createProps();
    render(<SettingsPanel {...props} />);

    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const oversizedFile = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "big.json",
      {
        type: "application/json",
      },
    );

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(props.onImportData).not.toHaveBeenCalled();
    await screen.findByText("Import failed: backup file is larger than 5 MB");
  });

  it("imports valid backup content", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<SettingsPanel {...props} />);

    const fileInput = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const validJson = '{"schemaVersion":4}';
    const backupFile = new File([validJson], "backup.json", {
      type: "application/json",
    });
    Object.defineProperty(backupFile, "text", {
      configurable: true,
      value: vi.fn().mockResolvedValue(validJson),
    });

    await user.upload(fileInput, backupFile);

    await waitFor(() => {
      expect(props.onImportData).toHaveBeenCalledWith(validJson);
    });
    await screen.findByText("Import complete");
  });

  it("shows diagnostics payload when clipboard is unavailable", async () => {
    const user = userEvent.setup();
    const diagnostics: AppDiagnostics = {
      appVersion: "0.1.0",
      schemaVersion: 4,
      currentSchemaVersion: 4,
      exportedAt: "2026-02-07T00:00:00Z",
      os: "macos",
      arch: "aarch64",
      tasksCount: 1,
      sessionsCount: 2,
      summariesCount: 3,
      guardrailEventsCount: 0,
      hasActiveQuest: false,
    };

    const props = createProps({
      onGetDiagnostics: vi.fn(async () => diagnostics),
    });
    // Simulate clipboard API not being available.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    render(<SettingsPanel {...props} />);
    await user.click(screen.getByRole("button", { name: "Copy Diagnostics" }));

    await screen.findByText((text) =>
      text.includes("Clipboard unavailable. Diagnostics:"),
    );
  });

  it("copies diagnostics via legacy document fallback when clipboard write is blocked", async () => {
    const user = userEvent.setup();
    const diagnostics: AppDiagnostics = {
      appVersion: "1.0.0",
      schemaVersion: 4,
      currentSchemaVersion: 4,
      exportedAt: "2026-03-14T00:00:00Z",
      os: "macos",
      arch: "aarch64",
      tasksCount: 0,
      sessionsCount: 0,
      summariesCount: 0,
      guardrailEventsCount: 0,
      hasActiveQuest: false,
    };

    const writeText = vi.fn().mockRejectedValue(new Error("blocked"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    document.execCommand = vi.fn().mockReturnValue(true);

    const props = createProps({
      onGetDiagnostics: vi.fn(async () => diagnostics),
    });

    render(<SettingsPanel {...props} />);
    await user.click(screen.getByRole("button", { name: "Copy Diagnostics" }));

    await screen.findByText("Diagnostics copied to clipboard");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("runs pet recovery from settings", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<SettingsPanel {...props} />);

    await user.click(
      screen.getByRole("button", { name: "Bring Pet On Screen" }),
    );

    expect(props.onRecoverPetWindow).toHaveBeenCalledTimes(1);
    await screen.findByText("Pet moved back on screen");
  });
});
