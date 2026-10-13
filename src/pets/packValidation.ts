import { SUPPORTED_PACK_SCHEMA_VERSION, type PetSpeciesPack } from "./species";

export type PackValidationRuleId =
  | "schema-version"
  | "id-slug"
  | "stage-names"
  | "thresholds"
  | "sprites"
  | "blink-window"
  | "anchors"
  | "verbs"
  | "behavior-profile";

interface PackValidationRuleSpec {
  label: string;
  remediation: string;
}

export const PACK_VALIDATION_RULEBOOK: Record<
  PackValidationRuleId,
  PackValidationRuleSpec
> = {
  "schema-version": {
    label: "Supported schema version",
    remediation: `Set schemaVersion to ${SUPPORTED_PACK_SCHEMA_VERSION} (current supported schema).`,
  },
  "id-slug": {
    label: "Valid species id slug",
    remediation:
      "Use lowercase letters, numbers, underscores, or hyphens only (example: my_pet).",
  },
  "stage-names": {
    label: "Exactly 3 stage names",
    remediation:
      "Define exactly three names to map to baby, teen, and adult stages.",
  },
  thresholds: {
    label: "Valid ascending evolution thresholds",
    remediation:
      "Set thresholds to [0, mid, final] where mid >= 1 and final > mid.",
  },
  sprites: {
    label: "3 stage sprites resolved with supported format",
    remediation:
      "Provide one non-empty svg/png/webp sprite path for each stage.",
  },
  "blink-window": {
    label: "Idle blink range is sane",
    remediation:
      "Use subtle blink intervals with min >= 1200ms and max greater than min.",
  },
  anchors: {
    label: "Accessory anchors are within sprite bounds",
    remediation:
      "Keep all anchor points between 0 and 200 on both axes so accessories render safely.",
  },
  verbs: {
    label: "All core interaction verbs are present",
    remediation:
      "Include these verbs in interactionVerbs: pet, feed, play, nap, clean, train.",
  },
  "behavior-profile": {
    label: "Behavior profile cadence and posture are valid",
    remediation:
      "Set interactionCadenceMs to [fast, slow] with 250<=fast<=slow<=5000 and choose posture settle/hover/curl.",
  },
};

export interface PackValidationCheck {
  id: PackValidationRuleId;
  label: string;
  pass: boolean;
  detail: string;
  remediation: string;
}

export interface PackValidationResult {
  speciesId: string;
  pass: boolean;
  checks: PackValidationCheck[];
}

function isSlug(value: string) {
  return /^[a-z0-9_-]+$/.test(value);
}

function anchorInBounds(anchor: { x: number; y: number }) {
  return anchor.x >= 0 && anchor.x <= 200 && anchor.y >= 0 && anchor.y <= 200;
}

function makeCheck(
  id: PackValidationRuleId,
  pass: boolean,
  detail: string,
): PackValidationCheck {
  const rule = PACK_VALIDATION_RULEBOOK[id];
  return {
    id,
    label: rule.label,
    remediation: rule.remediation,
    pass,
    detail,
  };
}

export function validateSpeciesPack(
  pack: PetSpeciesPack,
): PackValidationResult {
  const checks: PackValidationCheck[] = [];

  checks.push(
    makeCheck(
      "schema-version",
      pack.schemaVersion === SUPPORTED_PACK_SCHEMA_VERSION,
      `v${pack.schemaVersion}`,
    ),
  );

  checks.push(makeCheck("id-slug", isSlug(pack.id), pack.id));

  checks.push(
    makeCheck(
      "stage-names",
      pack.stageNames.length === 3,
      `${pack.stageNames.length} names`,
    ),
  );

  const thresholds = pack.evolutionThresholds;
  const thresholdsValid =
    thresholds.length === 3 &&
    thresholds[0] === 0 &&
    thresholds[1] >= 1 &&
    thresholds[2] > thresholds[1];
  checks.push(makeCheck("thresholds", thresholdsValid, thresholds.join(" / ")));

  const spriteChecks = pack.stageSprites.every(
    (sprite) => typeof sprite === "string" && sprite.trim().length > 0,
  );
  checks.push(
    makeCheck(
      "sprites",
      spriteChecks && pack.stageSprites.length === 3,
      `${pack.stageSprites.length} sprite assets`,
    ),
  );

  checks.push(
    makeCheck(
      "blink-window",
      pack.idleBehavior.blinkIntervalMs[0] >= 1200 &&
        pack.idleBehavior.blinkIntervalMs[1] >
          pack.idleBehavior.blinkIntervalMs[0],
      `${pack.idleBehavior.blinkIntervalMs[0]}-${pack.idleBehavior.blinkIntervalMs[1]}ms`,
    ),
  );

  const anchors = pack.accessoryAnchors;
  checks.push(
    makeCheck(
      "anchors",
      anchorInBounds(anchors.head) &&
        anchorInBounds(anchors.neck) &&
        anchorInBounds(anchors.left) &&
        anchorInBounds(anchors.right),
      "head/neck/left/right",
    ),
  );

  const verbs = new Set(pack.interactionVerbs.map((verb) => verb.id));
  checks.push(
    makeCheck(
      "verbs",
      verbs.has("pet") &&
        verbs.has("feed") &&
        verbs.has("play") &&
        verbs.has("nap") &&
        verbs.has("clean") &&
        verbs.has("train"),
      `${verbs.size} verbs`,
    ),
  );

  const cadence = pack.behaviorProfile.interactionCadenceMs;
  const posture = pack.behaviorProfile.chillPosture;
  checks.push(
    makeCheck(
      "behavior-profile",
      cadence[0] >= 250 &&
        cadence[1] >= cadence[0] &&
        cadence[1] <= 5000 &&
        (posture === "settle" || posture === "hover" || posture === "curl"),
      `${cadence[0]}-${cadence[1]}ms / ${posture}`,
    ),
  );

  return {
    speciesId: pack.id,
    pass: checks.every((check) => check.pass),
    checks,
  };
}

export function validateSpeciesPacks(packs: PetSpeciesPack[]) {
  return packs.map(validateSpeciesPack);
}
