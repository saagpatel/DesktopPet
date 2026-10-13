export interface PetSpeciesPack {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  stageNames: [string, string, string];
  evolutionThresholds: [number, number, number];
  idleBehavior: {
    baseAnimation: "bounce" | "sway" | "float";
    blinkIntervalMs: [number, number];
  };
  interactionVerbs: Array<{
    id: "pet" | "feed" | "play" | "nap" | "clean" | "train";
    label: string;
  }>;
  behaviorProfile: {
    motionBias: "calm" | "balanced" | "playful";
    interactionCadenceMs: [number, number];
    chillPosture: "settle" | "hover" | "curl";
  };
  stageSprites: [string, string, string];
  accessoryAnchors: {
    head: { x: number; y: number };
    neck: { x: number; y: number };
    left: { x: number; y: number };
    right: { x: number; y: number };
  };
}

interface RawSpeciesPack {
  schemaVersion: number;
  id: string;
  name: string;
  description: string;
  stageNames: [string, string, string];
  evolutionThresholds: [number, number, number];
  idleBehavior: {
    baseAnimation: "bounce" | "sway" | "float";
    blinkIntervalMs: [number, number];
  };
  interactionVerbs: Array<{
    id: "pet" | "feed" | "play" | "nap" | "clean" | "train";
    label: string;
  }>;
  behaviorProfile?: PetSpeciesPack["behaviorProfile"];
  stageSpriteFiles: [string, string, string];
  accessoryAnchors: PetSpeciesPack["accessoryAnchors"];
}

const rawPacks = import.meta.glob("./packs/*.json", { eager: true });
const spriteAssets = {
  ...(import.meta.glob("./sprites/*.svg", {
    eager: true,
    import: "default",
  }) as Record<string, string>),
  ...(import.meta.glob("./sprites/*.png", {
    eager: true,
    import: "default",
  }) as Record<string, string>),
  ...(import.meta.glob("./sprites/*.webp", {
    eager: true,
    import: "default",
  }) as Record<string, string>),
};

export const SUPPORTED_PACK_SCHEMA_VERSION = 1 as const;

function resolveSprite(fileName: string): string {
  const entry = Object.entries(spriteAssets).find(([path]) =>
    path.endsWith(`/${fileName}`),
  );
  if (!entry) {
    throw new Error(`Missing species sprite asset: ${fileName}`);
  }
  return entry[1];
}

function normalizeThresholds(
  thresholds: [number, number, number],
): [number, number, number] {
  const stage1 = Math.max(1, thresholds[1]);
  const stage2 = Math.max(stage1 + 1, thresholds[2]);
  return [0, stage1, stage2];
}

function normalizePack(
  input: RawSpeciesPack,
  sourcePath: string,
): PetSpeciesPack {
  if (input.schemaVersion !== SUPPORTED_PACK_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported species pack schemaVersion=${input.schemaVersion} in ${sourcePath}. Supported: ${SUPPORTED_PACK_SCHEMA_VERSION}.`,
    );
  }

  const stageSprites: [string, string, string] = [
    resolveSprite(input.stageSpriteFiles[0]),
    resolveSprite(input.stageSpriteFiles[1]),
    resolveSprite(input.stageSpriteFiles[2]),
  ];
  const defaultProfile: PetSpeciesPack["behaviorProfile"] = {
    motionBias: "balanced",
    interactionCadenceMs: [500, 900],
    chillPosture: "settle",
  };
  const behaviorProfile = input.behaviorProfile ?? defaultProfile;
  const cadenceFast = Math.max(
    250,
    Math.min(3000, behaviorProfile.interactionCadenceMs[0]),
  );
  const cadenceSlow = Math.max(
    cadenceFast,
    Math.min(5000, behaviorProfile.interactionCadenceMs[1]),
  );

  return {
    schemaVersion: SUPPORTED_PACK_SCHEMA_VERSION,
    id: input.id.trim().toLowerCase(),
    name: input.name.trim(),
    description: input.description.trim(),
    stageNames: input.stageNames,
    evolutionThresholds: normalizeThresholds(input.evolutionThresholds),
    idleBehavior: input.idleBehavior,
    interactionVerbs: input.interactionVerbs,
    behaviorProfile: {
      motionBias: behaviorProfile.motionBias,
      interactionCadenceMs: [cadenceFast, cadenceSlow],
      chillPosture: behaviorProfile.chillPosture,
    },
    stageSprites,
    accessoryAnchors: input.accessoryAnchors,
  };
}

const SPECIES_PACKS: PetSpeciesPack[] = Object.entries(rawPacks)
  .map(([sourcePath, entry]) =>
    normalizePack((entry as { default: RawSpeciesPack }).default, sourcePath),
  )
  .sort((a, b) => a.name.localeCompare(b.name));

export function getSpeciesPacks() {
  return SPECIES_PACKS;
}

export function getSpeciesPackById(speciesId: string) {
  return (
    SPECIES_PACKS.find((pack) => pack.id === speciesId) ??
    SPECIES_PACKS.find((pack) => pack.id === "penguin") ??
    SPECIES_PACKS[0]
  );
}
