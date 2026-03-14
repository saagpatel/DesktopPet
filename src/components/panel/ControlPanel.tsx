import { useState, type CSSProperties } from "react";
import { usePomodoro } from "../../hooks/usePomodoro";
import { usePet } from "../../hooks/usePet";
import { useCoins } from "../../hooks/useCoins";
import { useGoals } from "../../hooks/useGoals";
import { useTasks } from "../../hooks/useTasks";
import { useSettings } from "../../hooks/useSettings";
import { useCustomization } from "../../hooks/useCustomization";
import { useFocusGuardrails } from "../../hooks/useFocusGuardrails";
import { useProgress } from "../../hooks/useProgress";
import { useAnalytics } from "../../hooks/useAnalytics";
import { usePetEvents } from "../../hooks/usePetEvents";
import { useContextAwareChill } from "../../hooks/useContextAwareChill";
import { bringPetWindowOnScreen } from "../../lib/petWindow";
import { getThemeTokens } from "../../lib/themes";
import { downloadPetCard } from "../../lib/photoBooth";
import { invokeMaybe } from "../../lib/tauri";
import type { AppDiagnostics, AppSnapshot } from "../../store/types";
import { TimerDisplay } from "./TimerDisplay";
import { CoinDisplay } from "./CoinDisplay";
import { GoalsList } from "./GoalsList";
import { TaskList } from "./TaskList";
import { ShopPanel } from "./ShopPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StatsPanel } from "./StatsPanel";
import { CustomizationPanel } from "./CustomizationPanel";
import { PetPanel } from "./PetPanel";
import { AchievementsPanel } from "./AchievementsPanel";

type Tab =
  | "timer"
  | "pet"
  | "goals"
  | "tasks"
  | "shop"
  | "stats"
  | "achievements"
  | "customize"
  | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "timer", label: "Timer" },
  { id: "pet", label: "Pet" },
  { id: "goals", label: "Goals" },
  { id: "tasks", label: "Tasks" },
  { id: "shop", label: "Shop" },
  { id: "stats", label: "Stats" },
  { id: "achievements", label: "Achievements" },
  { id: "customize", label: "Customize" },
  { id: "settings", label: "Settings" },
];

export function ControlPanel() {
  const [tab, setTab] = useState<Tab>("timer");
  const pomo = usePomodoro();
  const {
    pet,
    species,
    stageName,
    progressToNext,
    stageProgress,
    stageSpan,
    setCustomization,
    setSpecies,
    interact,
  } = usePet();
  const { available } = useCoins();
  const { goals } = useGoals();
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const { settings, updateSettings } = useSettings();
  const { loadouts, saveLoadout, applyLoadout } = useCustomization();
  const {
    status: guardrailStatus,
    events: guardrailEvents,
    evaluate,
    intervene,
  } = useFocusGuardrails();
  const { progress } = useProgress();
  const { summaries } = useAnalytics();
  const {
    events: petEvents,
    activeQuest,
    rollFeedback,
    rollEvent,
    resolveEvent,
  } = usePetEvents();
  useContextAwareChill(settings, guardrailStatus);
  const theme = getThemeTokens(settings.uiTheme);

  const exportData = async () => {
    const snapshot = await invokeMaybe<AppSnapshot>("export_app_snapshot");
    if (!snapshot) {
      return "Export failed";
    }
    const filename = `desktop-pet-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const payload = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(payload);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return `Backup exported to ${filename}`;
  };

  const importData = async (rawJson: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return "Import failed: invalid JSON file";
    }
    const result = await invokeMaybe<string>("import_app_snapshot", {
      snapshot: parsed,
    });
    if (!result) {
      return "Import failed";
    }
    window.location.reload();
    return result;
  };

  const resetData = async () => {
    const result = await invokeMaybe<string>("reset_app_state");
    if (!result) {
      return "Reset failed";
    }
    window.location.reload();
    return result;
  };

  const getDiagnostics = async () => {
    return await invokeMaybe<AppDiagnostics>("get_app_diagnostics");
  };

  const recoverPetWindow = async () => {
    const moved = await bringPetWindowOnScreen();
    return moved ? "Pet moved back on screen" : "Pet is already visible";
  };

  return (
    <div
      className="h-screen flex flex-col"
      style={
        {
          backgroundColor: theme.appBg,
          "--app-bg": theme.appBg,
          "--panel-bg": theme.panelBg,
          "--card-bg": theme.cardBg,
          "--border-color": theme.border,
          "--accent-color": theme.accent,
          "--accent-soft": theme.accentSoft,
          "--text-color": theme.text,
          "--muted-color": theme.muted,
          "--tab-inactive": theme.tabInactive,
        } as CSSProperties
      }
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <CoinDisplay
          available={available}
          stageName={stageName}
          progressToNext={progressToNext}
          stageProgress={stageProgress}
          stageSpan={stageSpan}
          level={progress.level}
          streakDays={progress.streakDays}
        />
      </div>

      {/* Tabs */}
      <div
        className="flex px-2"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-xs font-medium transition-colors border-b-2"
            style={{
              color:
                tab === t.id ? "var(--accent-color)" : "var(--tab-inactive)",
              borderBottomColor:
                tab === t.id ? "var(--accent-color)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ color: "var(--text-color)" }}
      >
        {tab === "timer" && (
          <TimerDisplay
            phase={pomo.phase}
            secondsLeft={pomo.secondsLeft}
            totalSeconds={pomo.totalSeconds}
            sessionsCompleted={pomo.sessionsCompleted}
            paused={pomo.paused}
            guardrailMessage={pomo.guardrailMessage}
            onStart={pomo.start}
            onPause={pomo.pause}
            onResume={pomo.resume}
            onReset={pomo.reset}
          />
        )}
        {tab === "pet" && (
          <PetPanel
            pet={pet}
            events={petEvents}
            activeQuest={activeQuest}
            rollFeedback={rollFeedback}
            interactionVerbs={species.interactionVerbs}
            onInteract={interact}
            onCaptureCard={async () => {
              await downloadPetCard({
                pet,
                species,
                stageName,
                coinsAvailable: available,
                progress,
                settings,
              });
              return "Pet card saved.";
            }}
            onRollEvent={rollEvent}
            onResolveEvent={resolveEvent}
          />
        )}
        {tab === "goals" && <GoalsList goals={goals} />}
        {tab === "tasks" && (
          <TaskList
            tasks={tasks}
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        )}
        {tab === "shop" && (
          <ShopPanel available={available} ownedAccessories={pet.accessories} />
        )}
        {tab === "stats" && (
          <StatsPanel progress={progress} summaries={summaries} />
        )}
        {tab === "achievements" && <AchievementsPanel />}
        {tab === "customize" && (
          <CustomizationPanel
            settings={settings}
            pet={pet}
            loadouts={loadouts}
            onUpdateSettings={(patch) => {
              void updateSettings(patch);
            }}
            onSetPetCustomization={(skin, scene) => {
              void setCustomization(skin, scene);
            }}
            onSetPetSpecies={(speciesId, thresholds) => {
              void setSpecies(speciesId, thresholds);
            }}
            onSaveLoadout={(loadout) => {
              void saveLoadout(loadout);
            }}
            onApplyLoadout={(name) => {
              void applyLoadout(name);
            }}
          />
        )}
        {tab === "settings" && (
          <SettingsPanel
            preset={pomo.preset}
            settings={settings}
            onSetPreset={pomo.setPreset}
            onSetNotificationsEnabled={(enabled) =>
              void updateSettings({ notificationsEnabled: enabled })
            }
            onSetToastNotificationsEnabled={(enabled) =>
              void updateSettings({ toastNotificationsEnabled: enabled })
            }
            onSetTrayBadgeEnabled={(enabled) =>
              void updateSettings({ trayBadgeEnabled: enabled })
            }
            onSetNotificationWhitelist={(events) =>
              void updateSettings({ notificationWhitelist: events })
            }
            onSetSoundsEnabled={(enabled) =>
              void updateSettings({ soundsEnabled: enabled })
            }
            onSetSoundVolume={(volume) =>
              void updateSettings({ soundVolume: volume })
            }
            onSetQuietModeEnabled={(enabled) =>
              void updateSettings({ quietModeEnabled: enabled })
            }
            onSetFocusModeEnabled={(enabled) =>
              void updateSettings({ focusModeEnabled: enabled })
            }
            onSetAnimationBudget={(budget) =>
              void updateSettings({ animationBudget: budget })
            }
            onSetContextAwareChillEnabled={(enabled) =>
              void updateSettings({ contextAwareChillEnabled: enabled })
            }
            onSetChillOnFullscreen={(enabled) =>
              void updateSettings({ chillOnFullscreen: enabled })
            }
            onSetChillOnMeetings={(enabled) =>
              void updateSettings({ chillOnMeetings: enabled })
            }
            onSetChillOnHeavyTyping={(enabled) =>
              void updateSettings({ chillOnHeavyTyping: enabled })
            }
            onSetMeetingHosts={(hosts) =>
              void updateSettings({ meetingHosts: hosts })
            }
            onSetHeavyTypingThresholdCpm={(threshold) =>
              void updateSettings({ heavyTypingThresholdCpm: threshold })
            }
            onSetFocusGuardrailsEnabled={(enabled) =>
              void updateSettings({ focusGuardrailsEnabled: enabled })
            }
            onSetFocusGuardrailsWorkOnly={(enabled) =>
              void updateSettings({ focusGuardrailsWorkOnly: enabled })
            }
            onSetFocusAllowlist={(hosts) =>
              void updateSettings({ focusAllowlist: hosts })
            }
            onSetFocusBlocklist={(hosts) =>
              void updateSettings({ focusBlocklist: hosts })
            }
            onEvaluateGuardrails={(phase, hosts) => {
              void evaluate(phase, hosts);
            }}
            onInterveneGuardrails={(phase, hosts) => {
              void intervene(phase, hosts);
            }}
            onExportData={exportData}
            onImportData={importData}
            onResetData={resetData}
            onGetDiagnostics={getDiagnostics}
            onRecoverPetWindow={recoverPetWindow}
            guardrailStatus={guardrailStatus}
            guardrailEvents={guardrailEvents}
            disabled={pomo.phase !== "idle"}
          />
        )}
      </div>
    </div>
  );
}
