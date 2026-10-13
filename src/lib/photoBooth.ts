import type { PetState, Settings, UserProgress } from "../store/types";
import type { PetSpeciesPack } from "../pets/species";

interface PetCardInput {
  pet: PetState;
  species: PetSpeciesPack;
  stageName: string;
  coinsAvailable: number;
  progress: UserProgress;
  settings: Settings;
}

interface PetCardTheme {
  id: string;
  name: string;
  gradientStart: string;
  gradientEnd: string;
  panelFill: string;
  titleColor: string;
  subtitleColor: string;
  statColor: string;
  footerColor: string;
}

const PHOTO_CARD_THEMES: Record<string, PetCardTheme> = {
  "cat:cozy_room": {
    id: "cat-cozy-night",
    name: "Cozy Night",
    gradientStart: "#fff7ed",
    gradientEnd: "#ede9fe",
    panelFill: "rgba(255, 255, 255, 0.9)",
    titleColor: "#3f3b63",
    subtitleColor: "#625f83",
    statColor: "#2e2d4d",
    footerColor: "#7c7aa0",
  },
  "corgi:meadow": {
    id: "corgi-sunburst",
    name: "Sunburst Meadow",
    gradientStart: "#fef3c7",
    gradientEnd: "#dcfce7",
    panelFill: "rgba(255, 255, 255, 0.88)",
    titleColor: "#7c3b12",
    subtitleColor: "#93521f",
    statColor: "#4a2a10",
    footerColor: "#8b5b35",
  },
  "axolotl:space": {
    id: "axolotl-lumen",
    name: "Lumen Drift",
    gradientStart: "#ecfeff",
    gradientEnd: "#dbeafe",
    panelFill: "rgba(246, 255, 255, 0.9)",
    titleColor: "#155e75",
    subtitleColor: "#0f766e",
    statColor: "#164e63",
    footerColor: "#0f766e",
  },
  "penguin:space": {
    id: "penguin-aurora",
    name: "Aurora Calm",
    gradientStart: "#eef2ff",
    gradientEnd: "#dbeafe",
    panelFill: "rgba(246, 248, 255, 0.9)",
    titleColor: "#1e3a8a",
    subtitleColor: "#334155",
    statColor: "#0f172a",
    footerColor: "#475569",
  },
};

const SPECIES_FALLBACK_THEME: Record<string, PetCardTheme> = {
  cat: {
    id: "cat-soft",
    name: "Soft Purr",
    gradientStart: "#fff7ed",
    gradientEnd: "#f5f3ff",
    panelFill: "rgba(255, 255, 255, 0.9)",
    titleColor: "#4c1d95",
    subtitleColor: "#6d28d9",
    statColor: "#312e81",
    footerColor: "#6b7280",
  },
  corgi: {
    id: "corgi-warm",
    name: "Warm Loaf",
    gradientStart: "#fff7ed",
    gradientEnd: "#fef3c7",
    panelFill: "rgba(255, 255, 255, 0.89)",
    titleColor: "#9a3412",
    subtitleColor: "#b45309",
    statColor: "#7c2d12",
    footerColor: "#7c5a3b",
  },
  axolotl: {
    id: "axolotl-water",
    name: "Water Bloom",
    gradientStart: "#ecfeff",
    gradientEnd: "#e0f2fe",
    panelFill: "rgba(247, 255, 255, 0.9)",
    titleColor: "#0e7490",
    subtitleColor: "#0891b2",
    statColor: "#155e75",
    footerColor: "#0f766e",
  },
  penguin: {
    id: "penguin-calm",
    name: "Calm Frost",
    gradientStart: "#f8fafc",
    gradientEnd: "#dbeafe",
    panelFill: "rgba(255, 255, 255, 0.88)",
    titleColor: "#1e293b",
    subtitleColor: "#334155",
    statColor: "#0f172a",
    footerColor: "#64748b",
  },
};

const DEFAULT_THEME: PetCardTheme = {
  id: "default-calm",
  name: "Calm Classic",
  gradientStart: "#fef9f2",
  gradientEnd: "#e0f2fe",
  panelFill: "rgba(255, 255, 255, 0.86)",
  titleColor: "#1f2937",
  subtitleColor: "#475569",
  statColor: "#0f172a",
  footerColor: "#64748b",
};

export function resolvePetCardTheme(
  input: Pick<PetCardInput, "pet" | "species" | "settings">,
) {
  const key = `${input.species.id}:${input.settings.petScene}`;
  let theme =
    PHOTO_CARD_THEMES[key] ??
    SPECIES_FALLBACK_THEME[input.species.id] ??
    DEFAULT_THEME;
  if (input.settings.petSkin === "neon") {
    theme = {
      ...theme,
      titleColor: "#0f172a",
      subtitleColor: "#1d4ed8",
      statColor: "#0f172a",
    };
  }
  if (input.settings.petSkin === "plush") {
    theme = {
      ...theme,
      panelFill: "rgba(255, 255, 255, 0.93)",
      footerColor: "#6b7280",
    };
  }
  return theme;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load pet sprite"));
    image.src = url;
  });
}

export async function downloadPetCard(input: PetCardInput) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  const theme = resolvePetCardTheme(input);
  const bg = ctx.createLinearGradient(0, 0, 960, 540);
  bg.addColorStop(0, theme.gradientStart);
  bg.addColorStop(1, theme.gradientEnd);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 960, 540);

  roundedRect(ctx, 44, 44, 872, 452, 28);
  ctx.fillStyle = theme.panelFill;
  ctx.fill();

  ctx.fillStyle = theme.titleColor;
  ctx.font = "700 38px 'Avenir Next', 'Segoe UI', sans-serif";
  ctx.fillText(`${input.species.name} Pet Card`, 82, 110);
  ctx.font = "500 22px 'Avenir Next', 'Segoe UI', sans-serif";
  ctx.fillStyle = theme.subtitleColor;
  ctx.fillText(`Stage: ${input.stageName}   Mood: ${input.pet.mood}`, 82, 148);
  ctx.fillText(`Theme: ${theme.name}`, 82, 176);

  const sprite = await loadImage(
    input.species.stageSprites[
      Math.max(0, Math.min(2, input.pet.currentStage))
    ],
  );
  ctx.drawImage(sprite, 88, 198, 250, 250);

  ctx.fillStyle = theme.statColor;
  ctx.font = "600 24px 'Avenir Next', 'Segoe UI', sans-serif";
  ctx.fillText(`Coins: ${input.coinsAvailable}`, 390, 216);
  ctx.fillText(`Level: ${input.progress.level}`, 390, 258);
  ctx.fillText(`Streak: ${input.progress.streakDays} days`, 390, 300);
  ctx.fillText(`Total Sessions: ${input.pet.totalPomodoros}`, 390, 342);
  ctx.fillText(`Theme: ${input.settings.uiTheme}`, 390, 384);
  ctx.fillText(
    `Loadout: ${input.settings.petSkin} / ${input.settings.petScene}`,
    390,
    426,
  );

  ctx.font = "500 16px 'Avenir Next', 'Segoe UI', sans-serif";
  ctx.fillStyle = theme.footerColor;
  ctx.fillText("Generated in DesktopPet Photo Booth", 82, 478);
  ctx.fillText(new Date().toLocaleString(), 690, 478);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/png"),
  );

  if (!blob) {
    throw new Error("Unable to render pet card");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `desktop-pet-card-${input.species.id}-${new Date()
    .toISOString()
    .slice(0, 10)}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}
