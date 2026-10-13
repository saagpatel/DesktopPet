import { useState } from "react";
import { copyTextWithFallback } from "../../lib/clipboard";
import {
  type PackValidationResult,
  validateSpeciesPacks,
} from "../../pets/packValidation";
import { getSpeciesPackById, getSpeciesPacks } from "../../pets/species";
import { getSeasonalPacks } from "../../pets/seasonalPacks";
import type {
  CustomizationLoadout,
  PetState,
  Settings,
  SettingsPatch,
} from "../../store/types";

interface Props {
  settings: Settings;
  pet: PetState;
  loadouts: CustomizationLoadout[];
  onUpdateSettings: (patch: SettingsPatch) => void;
  onSetPetCustomization: (skin?: string, scene?: string) => void;
  onSetPetSpecies: (speciesId: string, evolutionThresholds: number[]) => void;
  onSaveLoadout: (loadout: CustomizationLoadout) => void;
  onApplyLoadout: (name: string) => void;
}

const THEMES = ["sunrise", "dusk", "mint", "mono"] as const;
const SKINS = ["classic", "neon", "pixel", "plush"] as const;
const SCENES = ["meadow", "forest", "space", "cozy_room"] as const;
const STYLE_BUNDLES = [
  {
    name: "Focus Studio",
    uiTheme: "mono",
    petSkin: "pixel",
    petScene: "cozy_room",
  },
  {
    name: "Cozy Flow",
    uiTheme: "sunrise",
    petSkin: "plush",
    petScene: "meadow",
  },
  {
    name: "Deep Work Orbit",
    uiTheme: "dusk",
    petSkin: "neon",
    petScene: "space",
  },
] as const;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function buildValidationFailureReport(
  packName: string,
  result: PackValidationResult,
) {
  const failures = result.checks.filter((check) => !check.pass);
  if (failures.length === 0) {
    return `${packName} (${result.speciesId}) has no validation failures.`;
  }
  return [
    `Species: ${packName} (${result.speciesId})`,
    `Failed checks: ${failures.length}`,
    ...failures.flatMap((check, index) => [
      `${index + 1}. ${check.label}`,
      `Observed: ${check.detail}`,
      `Fix: ${check.remediation}`,
    ]),
  ].join("\n");
}

export function CustomizationPanel({
  settings,
  pet,
  loadouts,
  onUpdateSettings,
  onSetPetCustomization,
  onSetPetSpecies,
  onSaveLoadout,
  onApplyLoadout,
}: Props) {
  const [loadoutName, setLoadoutName] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const speciesPacks = getSpeciesPacks();
  const speciesValidation = validateSpeciesPacks(speciesPacks);
  const selectableSpeciesIds = new Set([
    ...settings.validatedSpeciesPacks,
    pet.speciesId,
  ]);
  const seasonalPacks = getSeasonalPacks();
  const seasonalBundleNotice =
    "Seasonal bundles are optional style presets only. They never trigger toasts or urgency prompts.";

  return (
    <div className="flex flex-col gap-4">
      <div
        className="p-3 rounded-lg border flex flex-col gap-3"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-color)" }}
        >
          Theme
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme}
              onClick={() => onUpdateSettings({ uiTheme: theme })}
              className="px-2 py-2 rounded-md border text-xs capitalize"
              style={{
                backgroundColor:
                  settings.uiTheme === theme
                    ? "var(--accent-soft)"
                    : "var(--card-bg)",
                borderColor:
                  settings.uiTheme === theme
                    ? "color-mix(in srgb, var(--accent-color) 35%, white)"
                    : "var(--border-color)",
                color:
                  settings.uiTheme === theme
                    ? "var(--accent-color)"
                    : "var(--muted-color)",
              }}
            >
              {theme.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div
        className="p-3 rounded-lg border flex flex-col gap-3"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-color)" }}
        >
          Pet Style
        </h3>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Species
          <select
            value={pet.speciesId}
            onChange={(event) => {
              const selected = speciesPacks.find(
                (pack) => pack.id === event.target.value,
              );
              if (!selected) {
                return;
              }
              onSetPetSpecies(selected.id, selected.evolutionThresholds);
            }}
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
          >
            {speciesPacks
              .filter((pack) => selectableSpeciesIds.has(pack.id))
              .map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name}
                </option>
              ))}
          </select>
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Skin
          <select
            value={settings.petSkin}
            onChange={(event) => {
              const skin = event.target.value;
              onUpdateSettings({ petSkin: skin });
              onSetPetCustomization(skin, undefined);
            }}
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
          >
            {SKINS.map((skin) => (
              <option key={skin} value={skin}>
                {skin}
              </option>
            ))}
          </select>
        </label>
        <label
          className="text-xs flex flex-col gap-1"
          style={{ color: "var(--muted-color)" }}
        >
          Scene
          <select
            value={settings.petScene}
            onChange={(event) => {
              const scene = event.target.value;
              onUpdateSettings({ petScene: scene });
              onSetPetCustomization(undefined, scene);
            }}
            className="px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
          >
            {SCENES.map((scene) => (
              <option key={scene} value={scene}>
                {scene.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className="p-3 rounded-lg border flex flex-col gap-2"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-medium"
            style={{ color: "var(--text-color)" }}
          >
            Species Pack Validator
          </h3>
        </div>
        <p className="text-xs" style={{ color: "var(--muted-color)" }}>
          New drop-in species stay locked until all checks pass and you activate
          the pack.
        </p>
        {validationMessage && (
          <div
            className="text-[11px] rounded-md border px-2 py-1 whitespace-pre-wrap break-words"
            style={{
              color: "var(--muted-color)",
              borderColor: "var(--border-color)",
            }}
          >
            {validationMessage}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {speciesValidation.map((result) => {
            const pack = speciesPacks.find(
              (item) => item.id === result.speciesId,
            );
            if (!pack) {
              return null;
            }
            const activated = settings.validatedSpeciesPacks.includes(pack.id);
            return (
              <div
                key={pack.id}
                className="rounded-md border p-2"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--text-color)" }}
                    >
                      {pack.name}
                    </div>
                    <div
                      className="text-xs capitalize"
                      style={{ color: "var(--muted-color)" }}
                    >
                      {result.pass ? "checks passed" : "checks failed"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!result.pass && (
                      <button
                        aria-label={`Copy ${pack.name} validation report`}
                        onClick={() => {
                          void (async () => {
                            const report = buildValidationFailureReport(
                              pack.name,
                              result,
                            );
                            const message = await copyTextWithFallback(
                              report,
                              "Species validation report",
                            );
                            setValidationMessage(message);
                          })();
                        }}
                        className="px-2 py-1 rounded-md text-xs"
                        style={{
                          color: "var(--text-color)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        Copy Report
                      </button>
                    )}
                    <button
                      aria-label={
                        activated
                          ? `Deactivate ${pack.name}`
                          : `Activate ${pack.name}`
                      }
                      disabled={!result.pass}
                      onClick={() => {
                        if (activated) {
                          onUpdateSettings({
                            validatedSpeciesPacks:
                              settings.validatedSpeciesPacks.filter(
                                (id) => id !== pack.id,
                              ),
                          });
                          return;
                        }
                        onUpdateSettings({
                          validatedSpeciesPacks: Array.from(
                            new Set([
                              ...settings.validatedSpeciesPacks,
                              pack.id,
                            ]),
                          ),
                        });
                      }}
                      className="px-2 py-1 rounded-md text-xs text-white disabled:opacity-50"
                      style={{
                        backgroundColor: activated
                          ? "#334155"
                          : "var(--accent-color)",
                      }}
                    >
                      {activated ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {result.checks.map((check) => (
                    <div
                      key={check.id}
                      className="rounded-sm border px-2 py-1 text-[11px]"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div
                        style={{ color: check.pass ? "#16a34a" : "#dc2626" }}
                      >
                        {check.pass ? "PASS" : "FAIL"} {check.label}
                      </div>
                      <div style={{ color: "var(--muted-color)" }}>
                        Observed: {check.detail}
                      </div>
                      {!check.pass && (
                        <div style={{ color: "var(--muted-color)" }}>
                          Fix: {check.remediation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="p-3 rounded-lg border flex flex-col gap-2"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-color)" }}
        >
          Style Bundles
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {STYLE_BUNDLES.map((bundle) => (
            <button
              key={bundle.name}
              onClick={() => {
                onUpdateSettings({
                  uiTheme: bundle.uiTheme,
                  petSkin: bundle.petSkin,
                  petScene: bundle.petScene,
                });
                onSetPetCustomization(bundle.petSkin, bundle.petScene);
              }}
              className="text-left px-2 py-2 rounded-md border text-xs transition-opacity hover:opacity-90"
              style={{
                borderColor: "var(--border-color)",
                color: "var(--text-color)",
              }}
            >
              <div className="font-medium">{bundle.name}</div>
              <div style={{ color: "var(--muted-color)" }}>
                {bundle.uiTheme} • {bundle.petSkin} • {bundle.petScene}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        className="p-3 rounded-lg border flex flex-col gap-2"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-color)" }}
        >
          Seasonal Cosmetic Packs (Optional)
        </h3>
        <p className="text-xs" style={{ color: "var(--muted-color)" }}>
          No timed nudges. Enable only what you want.
        </p>
        <p className="text-[11px]" style={{ color: "var(--muted-color)" }}>
          {seasonalBundleNotice}
        </p>
        <div className="flex flex-col gap-2">
          {seasonalPacks.map((pack) => {
            const enabled = settings.enabledSeasonalPacks.includes(pack.id);
            const activeMonths = pack.activeMonths
              .map((month) => MONTH_NAMES[Math.max(0, Math.min(11, month - 1))])
              .join(", ");
            return (
              <div
                key={pack.id}
                className="rounded-md border p-2"
                style={{ borderColor: "var(--border-color)" }}
              >
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span style={{ color: "var(--text-color)" }}>
                    {pack.name}
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? Array.from(
                            new Set([
                              ...settings.enabledSeasonalPacks,
                              pack.id,
                            ]),
                          )
                        : settings.enabledSeasonalPacks.filter(
                            (id) => id !== pack.id,
                          );
                      onUpdateSettings({ enabledSeasonalPacks: next });
                    }}
                  />
                </label>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--muted-color)" }}
                >
                  {pack.description}
                </div>
                <div
                  className="text-[11px] mt-1"
                  style={{ color: "var(--muted-color)" }}
                >
                  Suggested season: {activeMonths}
                </div>
                {enabled && (
                  <div className="mt-2 flex flex-col gap-1">
                    {pack.bundles.map((bundle) => (
                      <button
                        key={bundle.name}
                        onClick={() => {
                          onUpdateSettings({
                            uiTheme: bundle.uiTheme,
                            petSkin: bundle.petSkin,
                            petScene: bundle.petScene,
                          });
                          onSetPetCustomization(
                            bundle.petSkin,
                            bundle.petScene,
                          );
                          const species = getSpeciesPackById(bundle.speciesId);
                          onUpdateSettings({
                            validatedSpeciesPacks: Array.from(
                              new Set([
                                ...settings.validatedSpeciesPacks,
                                species.id,
                              ]),
                            ),
                          });
                          onSetPetSpecies(
                            species.id,
                            species.evolutionThresholds,
                          );
                        }}
                        className="text-left px-2 py-2 rounded-md border text-xs transition-opacity hover:opacity-90"
                        style={{
                          borderColor: "var(--border-color)",
                          color: "var(--text-color)",
                        }}
                      >
                        <div className="font-medium">{bundle.name}</div>
                        <div style={{ color: "var(--muted-color)" }}>
                          {bundle.uiTheme} • {bundle.petSkin} •{" "}
                          {bundle.petScene} • {bundle.speciesId}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="p-3 rounded-lg border flex flex-col gap-2"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-color)" }}
        >
          Loadouts
        </h3>
        <div className="flex gap-2">
          <input
            value={loadoutName}
            onChange={(event) => setLoadoutName(event.target.value)}
            placeholder="Loadout name"
            className="flex-1 px-2 py-1 border rounded-md text-sm"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-color)",
            }}
          />
          <button
            onClick={() => {
              const name = loadoutName.trim();
              if (!name) return;
              onSaveLoadout({
                name,
                uiTheme: settings.uiTheme,
                petSkin: settings.petSkin,
                petScene: settings.petScene,
                accessories: pet.accessories,
              });
              setLoadoutName("");
            }}
            className="px-3 py-1 text-white rounded-md text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--accent-color)" }}
          >
            Save
          </button>
        </div>
        {loadouts.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--muted-color)" }}>
            No loadouts saved yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {loadouts.map((loadout) => (
              <button
                key={loadout.name}
                onClick={() => onApplyLoadout(loadout.name)}
                className="text-left px-2 py-2 rounded-md border text-xs transition-opacity hover:opacity-90"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="font-medium"
                  style={{ color: "var(--text-color)" }}
                >
                  {loadout.name}
                </div>
                <div style={{ color: "var(--muted-color)" }}>
                  {loadout.uiTheme} • {loadout.petSkin} • {loadout.petScene}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
