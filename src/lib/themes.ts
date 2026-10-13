export type ThemeName = "sunrise" | "dusk" | "mint" | "mono";

export interface ThemeTokens {
  appBg: string;
  panelBg: string;
  cardBg: string;
  border: string;
  accent: string;
  accentSoft: string;
  text: string;
  muted: string;
  tabInactive: string;
}

export const THEME_TOKENS: Record<ThemeName, ThemeTokens> = {
  sunrise: {
    appBg: "#f8fafc",
    panelBg: "#ffffff",
    cardBg: "#ffffff",
    border: "#e2e8f0",
    accent: "#2563eb",
    accentSoft: "#dbeafe",
    text: "#1f2937",
    muted: "#64748b",
    tabInactive: "#94a3b8",
  },
  dusk: {
    appBg: "#111827",
    panelBg: "#0f172a",
    cardBg: "#111827",
    border: "#334155",
    accent: "#38bdf8",
    accentSoft: "#0c4a6e",
    text: "#e2e8f0",
    muted: "#94a3b8",
    tabInactive: "#64748b",
  },
  mint: {
    appBg: "#ecfdf5",
    panelBg: "#f0fdf4",
    cardBg: "#ffffff",
    border: "#bbf7d0",
    accent: "#059669",
    accentSoft: "#d1fae5",
    text: "#14532d",
    muted: "#166534",
    tabInactive: "#4b5563",
  },
  mono: {
    appBg: "#f4f4f5",
    panelBg: "#ffffff",
    cardBg: "#ffffff",
    border: "#d4d4d8",
    accent: "#27272a",
    accentSoft: "#e4e4e7",
    text: "#18181b",
    muted: "#52525b",
    tabInactive: "#71717a",
  },
};

export function getThemeTokens(theme: string): ThemeTokens {
  const normalized = (["sunrise", "dusk", "mint", "mono"] as const).includes(
    theme as ThemeName,
  )
    ? (theme as ThemeName)
    : "sunrise";
  return THEME_TOKENS[normalized];
}
