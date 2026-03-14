import { describe, expect, it } from "vitest";
import { clampWindowRectToVisibleArea } from "../petWindow";

describe("petWindow visibility clamp", () => {
  it("keeps an already visible window in place", () => {
    const result = clampWindowRectToVisibleArea(
      {
        x: 100,
        y: 100,
        width: 380,
        height: 380,
      },
      [{ x: 0, y: 0, width: 1440, height: 900 }],
    );

    expect(result).toEqual({
      x: 100,
      y: 100,
      changed: false,
    });
  });

  it("pulls a stranded window back inside the nearest work area", () => {
    const result = clampWindowRectToVisibleArea(
      {
        x: -164,
        y: 1017,
        width: 380,
        height: 380,
      },
      [{ x: 0, y: 0, width: 1512, height: 945 }],
    );

    expect(result.changed).toBe(true);
    expect(result.x).toBeGreaterThanOrEqual(16);
    expect(result.y).toBeLessThanOrEqual(549);
  });

  it("chooses the monitor with the strongest overlap before clamping", () => {
    const result = clampWindowRectToVisibleArea(
      {
        x: 2920,
        y: 40,
        width: 380,
        height: 380,
      },
      [
        { x: 0, y: 0, width: 1512, height: 945 },
        { x: 1512, y: 0, width: 1728, height: 1117 },
      ],
    );

    expect(result.changed).toBe(true);
    expect(result.x).toBeLessThanOrEqual(2844);
    expect(result.x).toBeGreaterThanOrEqual(1528);
    expect(result.y).toBe(40);
  });
});
