import type { AnimationState, ShopItemId } from "../lib/constants";
import { ACCESSORY_BEHAVIOR_PROFILES } from "./accessoryBehavior";
import type { PetSpeciesPack } from "./species";

type AnimationBudget = "low" | "medium" | "high";

interface ComposePetBehaviorInput {
  species: PetSpeciesPack;
  accessories: ShopItemId[];
  lastInteraction: string | null;
  animationState: AnimationState;
  animationBudget: AnimationBudget;
  quietModeEnabled: boolean;
  focusModeEnabled: boolean;
  contextChilled: boolean;
}

export interface PetBehaviorComposition {
  animationState: AnimationState;
  shouldChill: boolean;
  shouldDim: boolean;
  motionLevel: 0 | 1 | 2 | 3;
  speciesMotionClass: string;
  speciesIntensityClass:
    | "species-intensity-still"
    | "species-intensity-subtle"
    | "species-intensity-standard"
    | "species-intensity-lively";
  postureClass:
    | ""
    | "species-posture-settle"
    | "species-posture-hover"
    | "species-posture-curl";
  accessoryClasses: string;
  interactionCooldownMs: number;
}

const BUDGET_MOTION_CAP: Record<AnimationBudget, 0 | 1 | 2 | 3> = {
  low: 1,
  medium: 2,
  high: 3,
};

const BUDGET_COOLDOWN_MULTIPLIER: Record<AnimationBudget, number> = {
  low: 1.2,
  medium: 1,
  high: 0.9,
};

function clampMotionLevel(value: number): 0 | 1 | 2 | 3 {
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  return 3;
}

function baselineMotionLevel(species: PetSpeciesPack) {
  const baseAnimationLevel =
    species.idleBehavior.baseAnimation === "bounce"
      ? 2
      : species.idleBehavior.baseAnimation === "sway"
        ? 1
        : 1;
  const biasDelta =
    species.behaviorProfile.motionBias === "playful"
      ? 1
      : species.behaviorProfile.motionBias === "calm"
        ? -1
        : 0;
  return clampMotionLevel(baseAnimationLevel + biasDelta);
}

function shouldPreserveAnimationState(animationState: AnimationState) {
  return animationState === "evolving" || animationState === "clicked";
}

function buildAccessoryClasses(
  accessories: ShopItemId[],
  shouldChill: boolean,
  motionLevel: 0 | 1 | 2 | 3,
  lastInteraction: string | null,
) {
  const classes = new Set<string>();
  let questAccent: string | null = null;
  for (const accessory of accessories) {
    const profile = ACCESSORY_BEHAVIOR_PROFILES[accessory];
    if (!profile || !profile.behaviorClass) {
      continue;
    }
    if (shouldChill && !profile.allowWhenChilled) {
      continue;
    }
    if (motionLevel < profile.minMotionLevel) {
      continue;
    }
    classes.add(profile.behaviorClass);
    if (
      questAccent === null &&
      lastInteraction === "quest_complete" &&
      profile.questAccentClass
    ) {
      questAccent = profile.questAccentClass;
    }
  }
  if (questAccent && motionLevel >= 1) {
    classes.add(questAccent);
  }
  return Array.from(classes).join(" ");
}

export function composePetBehavior(
  input: ComposePetBehaviorInput,
): PetBehaviorComposition {
  const hardChill = input.focusModeEnabled || input.contextChilled;
  const shouldChill = input.quietModeEnabled || hardChill;

  let motionLevel = baselineMotionLevel(input.species);
  for (const accessory of input.accessories) {
    motionLevel = clampMotionLevel(
      motionLevel + ACCESSORY_BEHAVIOR_PROFILES[accessory].motionBoost,
    );
  }

  // Precedence order: species baseline -> accessory modifiers -> chill clamp -> budget clamp.
  if (shouldChill) {
    motionLevel = clampMotionLevel(Math.min(motionLevel, 1));
  }
  motionLevel = clampMotionLevel(
    Math.min(motionLevel, BUDGET_MOTION_CAP[input.animationBudget]),
  );

  const animationState =
    hardChill && !shouldPreserveAnimationState(input.animationState)
      ? "idle"
      : input.animationState;

  const cadenceBase = shouldChill
    ? input.species.behaviorProfile.interactionCadenceMs[1]
    : input.species.behaviorProfile.interactionCadenceMs[0];
  const interactionCooldownMs = Math.max(
    250,
    Math.min(
      6000,
      Math.round(
        cadenceBase * BUDGET_COOLDOWN_MULTIPLIER[input.animationBudget],
      ),
    ),
  );

  const speciesIntensityClass =
    motionLevel === 0
      ? "species-intensity-still"
      : motionLevel === 1
        ? "species-intensity-subtle"
        : motionLevel === 2
          ? "species-intensity-standard"
          : "species-intensity-lively";

  const postureClass = hardChill
    ? input.species.behaviorProfile.chillPosture === "hover"
      ? "species-posture-hover"
      : input.species.behaviorProfile.chillPosture === "curl"
        ? "species-posture-curl"
        : "species-posture-settle"
    : "";

  return {
    animationState,
    shouldChill,
    shouldDim: hardChill || input.animationBudget === "low",
    motionLevel,
    speciesMotionClass: `species-${input.species.idleBehavior.baseAnimation}`,
    speciesIntensityClass,
    postureClass,
    accessoryClasses: buildAccessoryClasses(
      input.accessories,
      shouldChill,
      motionLevel,
      input.lastInteraction,
    ),
    interactionCooldownMs,
  };
}
