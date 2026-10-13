import { describe, expect, it } from "vitest";
import {
  PACK_VALIDATION_RULEBOOK,
  validateSpeciesPack,
} from "../packValidation";
import { getSpeciesPackById } from "../species";

describe("pack validation", () => {
  it("passes built-in packs", () => {
    const penguin = getSpeciesPackById("penguin");
    const result = validateSpeciesPack(penguin);
    expect(result.pass).toBe(true);
    expect(result.checks.every((check) => check.pass)).toBe(true);
    expect(result.checks.every((check) => check.remediation.length > 0)).toBe(
      true,
    );
  });

  it("fails malformed thresholds", () => {
    const pack = {
      ...getSpeciesPackById("cat"),
      evolutionThresholds: [0, 8, 4] as [number, number, number],
    };
    const result = validateSpeciesPack(pack);
    expect(result.pass).toBe(false);
    const thresholds = result.checks.find((check) => check.id === "thresholds");
    expect(thresholds?.pass).toBe(false);
    expect(thresholds?.remediation).toContain("Set thresholds");
  });

  it("fails unsupported schema versions", () => {
    const pack = {
      ...getSpeciesPackById("penguin"),
      schemaVersion: 99 as unknown as 1,
    };
    const result = validateSpeciesPack(pack);
    expect(result.pass).toBe(false);
    const schema = result.checks.find((check) => check.id === "schema-version");
    expect(schema?.pass).toBe(false);
    expect(schema?.remediation).toContain("schemaVersion");
  });

  it("keeps validation checks aligned with the rulebook metadata", () => {
    const result = validateSpeciesPack(getSpeciesPackById("corgi"));
    const ruleIds = Object.keys(PACK_VALIDATION_RULEBOOK).sort();
    const checkIds = result.checks.map((check) => check.id).sort();
    expect(checkIds).toEqual(ruleIds);
    result.checks.forEach((check) => {
      const rule = PACK_VALIDATION_RULEBOOK[check.id];
      expect(check.label).toBe(rule.label);
      expect(check.remediation).toBe(rule.remediation);
    });
  });
});
