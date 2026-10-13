import { describe, expect, it } from "vitest";
import { getSpeciesPackById, getSpeciesPacks } from "../species";

describe("species packs", () => {
  it("loads built-in species packs", () => {
    const packs = getSpeciesPacks();
    const ids = packs.map((pack) => pack.id);
    expect(ids).toContain("penguin");
    expect(ids).toContain("cat");
    expect(ids).toContain("corgi");
    expect(ids).toContain("axolotl");
  });

  it("ensures each pack has 3 stages and ascending thresholds", () => {
    for (const pack of getSpeciesPacks()) {
      expect(pack.schemaVersion).toBe(1);
      expect(pack.stageSprites).toHaveLength(3);
      expect(pack.stageNames).toHaveLength(3);
      expect(pack.evolutionThresholds[0]).toBe(0);
      expect(pack.evolutionThresholds[1]).toBeGreaterThanOrEqual(1);
      expect(pack.evolutionThresholds[2]).toBeGreaterThan(
        pack.evolutionThresholds[1],
      );
      expect(
        pack.behaviorProfile.interactionCadenceMs[0],
      ).toBeGreaterThanOrEqual(250);
      expect(
        pack.behaviorProfile.interactionCadenceMs[1],
      ).toBeGreaterThanOrEqual(pack.behaviorProfile.interactionCadenceMs[0]);
    }
  });

  it("falls back to penguin for unknown id", () => {
    const fallback = getSpeciesPackById("unknown");
    expect(fallback.id).toBe("penguin");
  });
});
