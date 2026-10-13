export interface SeasonalBundle {
  name: string;
  uiTheme: string;
  petSkin: string;
  petScene: string;
  speciesId: string;
}

export interface SeasonalPack {
  id: string;
  name: string;
  description: string;
  activeMonths: number[];
  bundles: SeasonalBundle[];
}

const seasonalModules = import.meta.glob("./seasonal/*.json", { eager: true });

const SEASONAL_PACKS: SeasonalPack[] = Object.values(seasonalModules)
  .map((module) => (module as { default: SeasonalPack }).default)
  .map((pack) => ({
    ...pack,
    id: pack.id.trim().toLowerCase(),
    activeMonths: pack.activeMonths.map((month) =>
      Math.max(1, Math.min(12, month)),
    ),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getSeasonalPacks() {
  return SEASONAL_PACKS;
}

export function getEnabledSeasonalPacks(ids: string[]) {
  return SEASONAL_PACKS.filter((pack) => ids.includes(pack.id));
}
