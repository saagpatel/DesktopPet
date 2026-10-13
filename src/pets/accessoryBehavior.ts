import type { ShopItemId } from "../lib/constants";

export interface AccessoryBehaviorProfile {
  id: ShopItemId;
  behaviorClass: string | null;
  questAccentClass: string | null;
  minMotionLevel: 0 | 1 | 2 | 3;
  allowWhenChilled: boolean;
  motionBoost: 0 | 1;
  shopHint: string;
}

export const ACCESSORY_BEHAVIOR_PROFILES: Record<
  ShopItemId,
  AccessoryBehaviorProfile
> = {
  party_hat: {
    id: "party_hat",
    behaviorClass: "behavior-partyhat",
    questAccentClass: "quest-accent-partyhat",
    minMotionLevel: 2,
    allowWhenChilled: false,
    motionBoost: 1,
    shopHint: "Adds a tiny celebratory tilt when your pet feels playful.",
  },
  bow_tie: {
    id: "bow_tie",
    behaviorClass: "behavior-bowtie",
    questAccentClass: "quest-accent-bowtie",
    minMotionLevel: 2,
    allowWhenChilled: false,
    motionBoost: 1,
    shopHint: "Adds a polite twinkle bob during active idle moments.",
  },
  sunglasses: {
    id: "sunglasses",
    behaviorClass: "behavior-sunglasses",
    questAccentClass: "quest-accent-sunglasses",
    minMotionLevel: 0,
    allowWhenChilled: true,
    motionBoost: 0,
    shopHint: "Adds a cool low-contrast look without extra movement.",
  },
  scarf: {
    id: "scarf",
    behaviorClass: "behavior-scarf",
    questAccentClass: "quest-accent-scarf",
    minMotionLevel: 0,
    allowWhenChilled: true,
    motionBoost: 0,
    shopHint: "Adds cozy warmth shading that stays calm in focus mode.",
  },
  apple: {
    id: "apple",
    behaviorClass: "behavior-apple",
    questAccentClass: "quest-accent-snack",
    minMotionLevel: 1,
    allowWhenChilled: false,
    motionBoost: 0,
    shopHint: "Adds a tiny snack bob when motion budget allows.",
  },
  cookie: {
    id: "cookie",
    behaviorClass: "behavior-cookie",
    questAccentClass: "quest-accent-snack",
    minMotionLevel: 1,
    allowWhenChilled: false,
    motionBoost: 0,
    shopHint: "Adds a gentle cookie sparkle with active idle behavior.",
  },
};

export function getAccessoryBehaviorProfile(accessoryId: ShopItemId) {
  return ACCESSORY_BEHAVIOR_PROFILES[accessoryId];
}
