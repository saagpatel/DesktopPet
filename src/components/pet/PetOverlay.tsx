import { useEffect, useState, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  EVENT_PET_STATE_CHANGED,
  EVENT_SETTINGS_CHANGED,
} from "../../lib/events";
import { listenForChillSignals } from "../../lib/chill";
import { repairPetWindowPosition } from "../../lib/petWindow";
import {
  invokeMaybe,
  invokeOr,
  listenSafe,
  startDraggingSafe,
} from "../../lib/tauri";
import { composePetBehavior } from "../../pets/behaviorComposer";
import { getSpeciesPackById } from "../../pets/species";
import type { PetState, Settings } from "../../store/types";
import { PetCharacter } from "./PetCharacter";

export function PetOverlay() {
  const [pet, setPet] = useState<PetState>({
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
  });
  const [settings, setSettings] = useState<
    Pick<
      Settings,
      | "animationBudget"
      | "contextAwareChillEnabled"
      | "focusModeEnabled"
      | "quietModeEnabled"
    >
  >({
    animationBudget: "medium",
    contextAwareChillEnabled: true,
    focusModeEnabled: false,
    quietModeEnabled: true,
  });
  const [isContextChilled, setIsContextChilled] = useState(false);
  const [animOverride, setAnimOverride] = useState<
    PetState["animationState"] | null
  >(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveRepairTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastInteractionAtRef = useRef(0);

  useEffect(() => {
    invokeOr<PetState>("get_pet_state", undefined, {
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
    }).then(setPet);

    let cancelled = false;
    let unlisten = () => {};
    listenSafe<PetState>(EVENT_PET_STATE_CHANGED, (event) => {
      setPet(event.payload);
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

  useEffect(() => {
    invokeOr<Settings>("get_settings", undefined, {
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
    }).then((loaded) =>
      setSettings({
        animationBudget: loaded.animationBudget,
        contextAwareChillEnabled: loaded.contextAwareChillEnabled,
        focusModeEnabled: loaded.focusModeEnabled,
        quietModeEnabled: loaded.quietModeEnabled,
      }),
    );

    let cancelled = false;
    let unlisten = () => {};
    listenSafe<Settings>(EVENT_SETTINGS_CHANGED, (event) => {
      setSettings({
        animationBudget: event.payload.animationBudget,
        contextAwareChillEnabled: event.payload.contextAwareChillEnabled,
        focusModeEnabled: event.payload.focusModeEnabled,
        quietModeEnabled: event.payload.quietModeEnabled,
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

  useEffect(() => {
    return listenForChillSignals((signals) => {
      setIsContextChilled(
        signals.fullscreen ||
          signals.heavyTyping ||
          signals.meeting ||
          signals.focusMode,
      );
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlisten = () => {};

    const scheduleRepair = () => {
      if (moveRepairTimeoutRef.current) {
        clearTimeout(moveRepairTimeoutRef.current);
      }
      // Clamp after drag settles so edge drags still feel natural.
      moveRepairTimeoutRef.current = setTimeout(() => {
        void repairPetWindowPosition(currentWindow);
      }, 180);
    };

    const currentWindow = getCurrentWindow();
    void repairPetWindowPosition(currentWindow);

    currentWindow
      .onMoved(() => {
        scheduleRepair();
      })
      .then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        unlisten = fn;
      })
      .catch((error) => {
        console.warn("[petWindow:onMoved]", error);
      });

    return () => {
      cancelled = true;
      unlisten();
      if (moveRepairTimeoutRef.current) {
        clearTimeout(moveRepairTimeoutRef.current);
      }
    };
  }, []);

  const species = getSpeciesPackById(pet.speciesId);
  const contextChilled = settings.contextAwareChillEnabled && isContextChilled;
  const composedBehavior = composePetBehavior({
    species,
    accessories: pet.accessories,
    lastInteraction: pet.lastInteraction,
    animationState: animOverride ?? pet.animationState,
    animationBudget: settings.animationBudget,
    quietModeEnabled: settings.quietModeEnabled,
    focusModeEnabled: settings.focusModeEnabled,
    contextChilled,
  });

  const handleClick = useCallback(() => {
    setAnimOverride("clicked");
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => setAnimOverride(null), 400);
    const now = Date.now();
    if (
      now - lastInteractionAtRef.current <
      composedBehavior.interactionCooldownMs
    ) {
      return;
    }
    lastInteractionAtRef.current = now;
    void invokeMaybe<PetState>("pet_interact", { action: "pet" });
  }, [composedBehavior.interactionCooldownMs]);

  const handleDrag = useCallback(() => {
    startDraggingSafe();
  }, []);

  useEffect(
    () => () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (moveRepairTimeoutRef.current) {
        clearTimeout(moveRepairTimeoutRef.current);
      }
    },
    [],
  );

  const animClass = `anim-${composedBehavior.animationState}`;
  const budgetClass = `anim-budget-${settings.animationBudget}`;
  const skinClass =
    pet.skin === "neon"
      ? "saturate-150 brightness-110"
      : pet.skin === "pixel"
        ? "contrast-125"
        : pet.skin === "plush"
          ? "brightness-95 saturate-75"
          : "";

  return (
    <div
      className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
      onClick={handleClick}
      onMouseDown={handleDrag}
    >
      <div
        className={`${animClass} ${budgetClass} ${skinClass} ${composedBehavior.speciesIntensityClass} ${composedBehavior.shouldDim ? "chill-dim" : ""}`}
      >
        <div className={composedBehavior.postureClass}>
          <div className={composedBehavior.accessoryClasses}>
            <PetCharacter
              stage={pet.currentStage}
              accessories={pet.accessories}
              speciesId={pet.speciesId}
              speciesMotionClass={composedBehavior.speciesMotionClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
