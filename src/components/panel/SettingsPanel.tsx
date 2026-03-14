import { useEffect, useRef, useState } from "react";
import { copyTextWithFallback } from "../../lib/clipboard";
import { TIMER_PRESETS } from "../../lib/constants";
import { readLocalStorage } from "../../lib/safeStorage";
import type { TimerPreset } from "../../lib/constants";
import type {
  AppDiagnostics,
  FocusGuardrailEvent,
  FocusGuardrailsStatus,
  Settings,
} from "../../store/types";

export interface SettingsPanelProps {
  preset: TimerPreset;
  settings: Settings;
  onSetPreset: (p: TimerPreset) => void;
  onSetNotificationsEnabled: (enabled: boolean) => void;
  onSetToastNotificationsEnabled: (enabled: boolean) => void;
  onSetTrayBadgeEnabled: (enabled: boolean) => void;
  onSetNotificationWhitelist: (events: string[]) => void;
  onSetSoundsEnabled: (enabled: boolean) => void;
  onSetSoundVolume: (volume: number) => void;
  onSetQuietModeEnabled: (enabled: boolean) => void;
  onSetFocusModeEnabled: (enabled: boolean) => void;
  onSetAnimationBudget: (budget: "low" | "medium" | "high") => void;
  onSetContextAwareChillEnabled: (enabled: boolean) => void;
  onSetChillOnFullscreen: (enabled: boolean) => void;
  onSetChillOnMeetings: (enabled: boolean) => void;
  onSetChillOnHeavyTyping: (enabled: boolean) => void;
  onSetMeetingHosts: (hosts: string[]) => void;
  onSetHeavyTypingThresholdCpm: (threshold: number) => void;
  onSetFocusGuardrailsEnabled: (enabled: boolean) => void;
  onSetFocusGuardrailsWorkOnly: (enabled: boolean) => void;
  onSetFocusAllowlist: (hosts: string[]) => void;
  onSetFocusBlocklist: (hosts: string[]) => void;
  onEvaluateGuardrails: (phase: string, hosts: string[]) => void;
  onInterveneGuardrails: (phase: string, hosts: string[]) => void;
  onExportData: () => Promise<string>;
  onImportData: (rawJson: string) => Promise<string>;
  onResetData: () => Promise<string>;
  onGetDiagnostics: () => Promise<AppDiagnostics | null>;
  onRecoverPetWindow: () => Promise<string>;
  guardrailStatus: FocusGuardrailsStatus | null;
  guardrailEvents: FocusGuardrailEvent[];
  disabled: boolean;
}

const MAX_BACKUP_IMPORT_BYTES = 5 * 1024 * 1024;

export function SettingsPanel({
  preset,
  settings,
  onSetPreset,
  onSetNotificationsEnabled,
  onSetToastNotificationsEnabled,
  onSetTrayBadgeEnabled,
  onSetNotificationWhitelist,
  onSetSoundsEnabled,
  onSetSoundVolume,
  onSetQuietModeEnabled,
  onSetFocusModeEnabled,
  onSetAnimationBudget,
  onSetContextAwareChillEnabled,
  onSetChillOnFullscreen,
  onSetChillOnMeetings,
  onSetChillOnHeavyTyping,
  onSetMeetingHosts,
  onSetHeavyTypingThresholdCpm,
  onSetFocusGuardrailsEnabled,
  onSetFocusGuardrailsWorkOnly,
  onSetFocusAllowlist,
  onSetFocusBlocklist,
  onEvaluateGuardrails,
  onInterveneGuardrails,
  onExportData,
  onImportData,
  onResetData,
  onGetDiagnostics,
  onRecoverPetWindow,
  guardrailStatus,
  guardrailEvents,
  disabled,
}: SettingsPanelProps) {
  const presets = Object.entries(TIMER_PRESETS) as [
    TimerPreset,
    (typeof TIMER_PRESETS)[TimerPreset],
  ][];
  const [hostPreview, setHostPreview] = useState(
    settings.focusBlocklist.join(", "),
  );
  const [opsMessage, setOpsMessage] = useState<string | null>(null);
  const [opsBusy, setOpsBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [trayFallbackCount, setTrayFallbackCount] = useState<number | null>(
    null,
  );
  const importFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHostPreview(settings.focusBlocklist.join(", "));
  }, [settings.focusBlocklist]);

  useEffect(() => {
    const raw = readLocalStorage("desktop-pet-tray-fallback-count");
    if (!raw) {
      setTrayFallbackCount(null);
      return;
    }
    const count = Number(raw);
    setTrayFallbackCount(Number.isFinite(count) ? count : null);
  }, [settings.trayBadgeEnabled, opsMessage]);

  const runDataOperation = async (operation: () => Promise<string>) => {
    setOpsBusy(true);
    try {
      const message = await operation();
      setConfirmingReset(false);
      setOpsMessage(message);
    } catch {
      setOpsMessage("Operation failed. Please try again.");
    } finally {
      setOpsBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3
        className="text-sm font-medium"
        style={{ color: "var(--muted-color)" }}
      >
        Timer Mode
      </h3>
      <div className="flex flex-col gap-2">
        {presets.map(([key, val]) => (
          <button
            key={key}
            onClick={() => onSetPreset(key)}
            disabled={disabled}
            className={`p-3 rounded-lg border text-left transition-opacity ${disabled ? "opacity-60" : ""}`}
            style={{
              backgroundColor:
                preset === key ? "var(--accent-soft)" : "var(--card-bg)",
              borderColor:
                preset === key
                  ? "color-mix(in srgb, var(--accent-color) 35%, white)"
                  : "var(--border-color)",
              color: disabled ? "var(--muted-color)" : "var(--text-color)",
            }}
          >
            <div className="text-sm font-medium">{val.label}</div>
            <div className="text-xs" style={{ color: "var(--muted-color)" }}>
              {val.work / 60}min work / {val.break / 60}min break
            </div>
          </button>
        ))}
      </div>
      {disabled && (
        <p className="text-xs" style={{ color: "var(--muted-color)" }}>
          Timer mode can only be changed when the timer is idle.
        </p>
      )}

      <div
        className="pt-2 border-t flex flex-col gap-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--muted-color)" }}
        >
          Calm Controls
        </h3>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>
            Quiet mode (default)
          </span>
          <input
            type="checkbox"
            checked={settings.quietModeEnabled}
            onChange={(event) => onSetQuietModeEnabled(event.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>Focus mode</span>
          <input
            type="checkbox"
            checked={settings.focusModeEnabled}
            onChange={(event) => onSetFocusModeEnabled(event.target.checked)}
          />
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Animation budget
          <select
            value={settings.animationBudget}
            onChange={(event) =>
              onSetAnimationBudget(
                event.target.value as "low" | "medium" | "high",
              )
            }
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
          >
            <option value="low">Low (battery saver)</option>
            <option value="medium">Medium</option>
            <option value="high">High (more lively)</option>
          </select>
        </label>
      </div>

      <div
        className="pt-2 border-t flex flex-col gap-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--muted-color)" }}
        >
          Notifications
        </h3>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>
            Desktop notifications
          </span>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(event) =>
              onSetNotificationsEnabled(event.target.checked)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>
            Toast popups (opt-in)
          </span>
          <input
            type="checkbox"
            checked={settings.toastNotificationsEnabled}
            onChange={(event) =>
              onSetToastNotificationsEnabled(event.target.checked)
            }
            disabled={!settings.notificationsEnabled}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>Tray badge updates</span>
          <input
            type="checkbox"
            checked={settings.trayBadgeEnabled}
            onChange={(event) => onSetTrayBadgeEnabled(event.target.checked)}
          />
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Toast whitelist (comma-separated event ids)
          <input
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
            value={settings.notificationWhitelist.join(", ")}
            onChange={(event) =>
              onSetNotificationWhitelist(
                event.target.value
                  .split(",")
                  .map((item) => item.trim().toLowerCase())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>Sound cues</span>
          <input
            type="checkbox"
            checked={settings.soundsEnabled}
            onChange={(event) => onSetSoundsEnabled(event.target.checked)}
            disabled={settings.quietModeEnabled}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span
            className={
              !settings.soundsEnabled || settings.quietModeEnabled
                ? "opacity-50"
                : ""
            }
            style={{ color: "var(--text-color)" }}
          >
            Sound volume ({Math.round(settings.soundVolume * 100)}%)
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.soundVolume}
            onChange={(event) => onSetSoundVolume(Number(event.target.value))}
            disabled={!settings.soundsEnabled || settings.quietModeEnabled}
          />
        </label>
      </div>

      <div
        className="pt-2 border-t flex flex-col gap-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--muted-color)" }}
        >
          Context-aware Chill
        </h3>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>Enable auto chill</span>
          <input
            type="checkbox"
            checked={settings.contextAwareChillEnabled}
            onChange={(event) =>
              onSetContextAwareChillEnabled(event.target.checked)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>
            Chill during fullscreen
          </span>
          <input
            type="checkbox"
            checked={settings.chillOnFullscreen}
            onChange={(event) => onSetChillOnFullscreen(event.target.checked)}
            disabled={!settings.contextAwareChillEnabled}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>
            Chill during meetings
          </span>
          <input
            type="checkbox"
            checked={settings.chillOnMeetings}
            onChange={(event) => onSetChillOnMeetings(event.target.checked)}
            disabled={!settings.contextAwareChillEnabled}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>
            Chill during heavy typing
          </span>
          <input
            type="checkbox"
            checked={settings.chillOnHeavyTyping}
            onChange={(event) => onSetChillOnHeavyTyping(event.target.checked)}
            disabled={!settings.contextAwareChillEnabled}
          />
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Meeting hosts (comma-separated)
          <input
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
            value={settings.meetingHosts.join(", ")}
            onChange={(event) =>
              onSetMeetingHosts(
                event.target.value
                  .split(",")
                  .map((item) => item.trim().toLowerCase())
                  .filter(Boolean),
              )
            }
            disabled={
              !settings.contextAwareChillEnabled || !settings.chillOnMeetings
            }
          />
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Heavy typing threshold ({settings.heavyTypingThresholdCpm} chars/min)
          <input
            type="range"
            min={80}
            max={420}
            step={10}
            value={settings.heavyTypingThresholdCpm}
            onChange={(event) =>
              onSetHeavyTypingThresholdCpm(Number(event.target.value))
            }
            disabled={
              !settings.contextAwareChillEnabled || !settings.chillOnHeavyTyping
            }
          />
        </label>
      </div>

      <div
        className="pt-2 border-t flex flex-col gap-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--muted-color)" }}
        >
          Focus Guardrails
        </h3>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>Enable guardrails</span>
          <input
            type="checkbox"
            checked={settings.focusGuardrailsEnabled}
            onChange={(event) =>
              onSetFocusGuardrailsEnabled(event.target.checked)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span style={{ color: "var(--text-color)" }}>
            Only during work sessions
          </span>
          <input
            type="checkbox"
            checked={settings.focusGuardrailsWorkOnly}
            onChange={(event) =>
              onSetFocusGuardrailsWorkOnly(event.target.checked)
            }
            disabled={!settings.focusGuardrailsEnabled}
          />
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Allowed hosts (comma-separated)
          <textarea
            rows={2}
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
            value={settings.focusAllowlist.join(", ")}
            onChange={(event) =>
              onSetFocusAllowlist(
                event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            disabled={!settings.focusGuardrailsEnabled}
          />
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Blocked hosts (comma-separated)
          <textarea
            rows={2}
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
            value={settings.focusBlocklist.join(", ")}
            onChange={(event) =>
              onSetFocusBlocklist(
                event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            disabled={!settings.focusGuardrailsEnabled}
          />
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Host check preview (comma-separated)
          <input
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
            value={hostPreview}
            onChange={(event) => setHostPreview(event.target.value)}
            disabled={!settings.focusGuardrailsEnabled}
          />
        </label>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--accent-color)" }}
            disabled={!settings.focusGuardrailsEnabled}
            onClick={() =>
              onEvaluateGuardrails(
                "work",
                hostPreview
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          >
            Evaluate
          </button>
          <button
            className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-color) 60%, #f59e0b)",
            }}
            disabled={!settings.focusGuardrailsEnabled}
            onClick={() =>
              onInterveneGuardrails(
                "work",
                hostPreview
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          >
            Intervene
          </button>
        </div>
        {guardrailStatus && (
          <div
            className="text-xs border rounded-md px-2 py-1"
            style={{
              color: "var(--text-color)",
              backgroundColor:
                "color-mix(in srgb, var(--accent-soft) 20%, var(--card-bg))",
              borderColor: "var(--border-color)",
            }}
          >
            <div>{guardrailStatus.message}</div>
            <div>
              level: {guardrailStatus.nudgeLevel} • action:{" "}
              {guardrailStatus.recommendedAction}
            </div>
          </div>
        )}
        {guardrailEvents.length > 0 && (
          <div className="flex flex-col gap-1">
            <div
              className="text-xs font-medium"
              style={{ color: "var(--muted-color)" }}
            >
              Recent interventions
            </div>
            {guardrailEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="text-[11px] px-2 py-1 border rounded-md"
                style={{
                  color: "var(--text-color)",
                  borderColor: "var(--border-color)",
                  backgroundColor: "var(--card-bg)",
                }}
              >
                <div className="capitalize">
                  {event.phase} • {event.nudgeLevel} •{" "}
                  {event.recommendedAction.replace("_", " ")}
                </div>
                <div style={{ color: "var(--muted-color)" }}>
                  {new Date(event.createdAt).toLocaleTimeString()} •{" "}
                  {event.matchedBlocklist.join(", ") || "no host details"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="pt-2 border-t flex flex-col gap-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--muted-color)" }}
        >
          Data & Diagnostics
        </h3>
        <div className="flex gap-2 flex-wrap">
          <button
            className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--accent-color)" }}
            disabled={opsBusy}
            onClick={() => runDataOperation(onExportData)}
          >
            Export Backup
          </button>
          <button
            className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-color) 75%, #0ea5e9)",
            }}
            disabled={opsBusy}
            onClick={() => importFileRef.current?.click()}
          >
            Import Backup
          </button>
          <button
            className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
            style={{ backgroundColor: "#b91c1c" }}
            disabled={opsBusy}
            onClick={() => {
              setConfirmingReset((current) => !current);
            }}
          >
            {confirmingReset ? "Cancel Reset" : "Reset App Data"}
          </button>
          <button
            className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-color) 65%, #4b5563)",
            }}
            disabled={opsBusy}
            onClick={() =>
              void runDataOperation(async () => {
                const diagnostics = await onGetDiagnostics();
                if (!diagnostics) {
                  return "Unable to load diagnostics";
                }
                return copyTextWithFallback(
                  JSON.stringify(diagnostics, null, 2),
                  "Diagnostics",
                );
              })
            }
          >
            Copy Diagnostics
          </button>
          <button
            className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-color) 80%, #059669)",
            }}
            disabled={opsBusy}
            onClick={() => void runDataOperation(onRecoverPetWindow)}
          >
            Bring Pet On Screen
          </button>
        </div>
        {confirmingReset && (
          <div
            className="text-xs border rounded-md px-2 py-2 flex flex-col gap-2"
            style={{
              color: "var(--text-color)",
              borderColor: "#b91c1c",
              backgroundColor: "color-mix(in srgb, #b91c1c 8%, var(--card-bg))",
            }}
          >
            <div>Reset all local app data? This cannot be undone.</div>
            <div className="flex gap-2 flex-wrap">
              <button
                className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-40"
                style={{ backgroundColor: "#b91c1c" }}
                disabled={opsBusy}
                onClick={() => void runDataOperation(onResetData)}
              >
                Confirm Reset
              </button>
              <button
                className="px-2 py-1 rounded-md text-xs"
                style={{
                  color: "var(--text-color)",
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                }}
                disabled={opsBusy}
                onClick={() => setConfirmingReset(false)}
              >
                Keep My Data
              </button>
            </div>
          </div>
        )}
        <input
          ref={importFileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            if (file.size > MAX_BACKUP_IMPORT_BYTES) {
              setOpsMessage("Import failed: backup file is larger than 5 MB");
              event.currentTarget.value = "";
              return;
            }
            void runDataOperation(async () => onImportData(await file.text()));
            event.currentTarget.value = "";
          }}
        />
        {opsMessage && (
          <div
            className="text-xs border rounded-md px-2 py-1"
            style={{
              color: "var(--text-color)",
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
            }}
          >
            {opsMessage}
          </div>
        )}
        {trayFallbackCount !== null && (
          <div
            className="text-[11px] border rounded-md px-2 py-1"
            style={{
              color: "var(--muted-color)",
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
            }}
          >
            Tray title badges are unavailable on this platform. Fallback count:{" "}
            {trayFallbackCount}
          </div>
        )}
      </div>
    </div>
  );
}
