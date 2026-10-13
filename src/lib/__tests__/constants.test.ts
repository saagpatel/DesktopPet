import { describe, it, expect } from "vitest";
import {
  TIMER_PRESETS,
  DEFAULT_PRESET,
  COINS_PER_POMODORO,
  EVOLUTION_THRESHOLDS,
  SHOP_ITEMS,
  ANIMATION_STATES,
  DEFAULT_DAILY_GOALS,
} from "../constants";

describe("TIMER_PRESETS", () => {
  it("has short, standard, and long presets", () => {
    expect(TIMER_PRESETS).toHaveProperty("short");
    expect(TIMER_PRESETS).toHaveProperty("standard");
    expect(TIMER_PRESETS).toHaveProperty("long");
  });

  it("short preset is 15min work / 5min break", () => {
    expect(TIMER_PRESETS.short.work).toBe(15 * 60);
    expect(TIMER_PRESETS.short.break).toBe(5 * 60);
  });

  it("standard preset is 25min work / 5min break", () => {
    expect(TIMER_PRESETS.standard.work).toBe(25 * 60);
    expect(TIMER_PRESETS.standard.break).toBe(5 * 60);
  });

  it("long preset is 50min work / 10min break", () => {
    expect(TIMER_PRESETS.long.work).toBe(50 * 60);
    expect(TIMER_PRESETS.long.break).toBe(10 * 60);
  });

  it("all presets have labels", () => {
    for (const key of Object.keys(
      TIMER_PRESETS,
    ) as (keyof typeof TIMER_PRESETS)[]) {
      expect(TIMER_PRESETS[key].label).toBeTruthy();
    }
  });
});

describe("DEFAULT_PRESET", () => {
  it("is 'standard'", () => {
    expect(DEFAULT_PRESET).toBe("standard");
  });

  it("exists in TIMER_PRESETS", () => {
    expect(TIMER_PRESETS[DEFAULT_PRESET]).toBeDefined();
  });
});

describe("COINS_PER_POMODORO", () => {
  it("is 10", () => {
    expect(COINS_PER_POMODORO).toBe(10);
  });
});

describe("EVOLUTION_THRESHOLDS", () => {
  it("stage1 < stage2", () => {
    expect(EVOLUTION_THRESHOLDS.stage1).toBeLessThan(
      EVOLUTION_THRESHOLDS.stage2,
    );
  });

  it("stage1 is 5", () => {
    expect(EVOLUTION_THRESHOLDS.stage1).toBe(5);
  });

  it("stage2 is 15", () => {
    expect(EVOLUTION_THRESHOLDS.stage2).toBe(15);
  });
});

describe("SHOP_ITEMS", () => {
  it("has 6 items", () => {
    expect(SHOP_ITEMS).toHaveLength(6);
  });

  it("all items have required fields", () => {
    for (const item of SHOP_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.cost).toBeGreaterThan(0);
      expect(item.icon).toBeTruthy();
    }
  });

  it("has no duplicate IDs", () => {
    const ids = SHOP_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains expected items", () => {
    const ids = SHOP_ITEMS.map((i) => i.id);
    expect(ids).toContain("party_hat");
    expect(ids).toContain("bow_tie");
    expect(ids).toContain("sunglasses");
    expect(ids).toContain("scarf");
    expect(ids).toContain("apple");
    expect(ids).toContain("cookie");
  });
});

describe("ANIMATION_STATES", () => {
  it("includes all expected states", () => {
    expect(ANIMATION_STATES).toContain("idle");
    expect(ANIMATION_STATES).toContain("working");
    expect(ANIMATION_STATES).toContain("break");
    expect(ANIMATION_STATES).toContain("celebrating");
    expect(ANIMATION_STATES).toContain("evolving");
    expect(ANIMATION_STATES).toContain("clicked");
  });

  it("has 6 states", () => {
    expect(ANIMATION_STATES).toHaveLength(6);
  });
});

describe("DEFAULT_DAILY_GOALS", () => {
  it("has 4 goals", () => {
    expect(DEFAULT_DAILY_GOALS).toHaveLength(4);
  });

  it("has pomodoros, breaks, tasks, and focus_minutes goals", () => {
    const ids = DEFAULT_DAILY_GOALS.map((g) => g.id);
    expect(ids).toContain("pomodoros");
    expect(ids).toContain("breaks");
    expect(ids).toContain("tasks");
    expect(ids).toContain("focus_minutes");
  });

  it("all goals have positive targets", () => {
    for (const goal of DEFAULT_DAILY_GOALS) {
      expect(goal.target).toBeGreaterThan(0);
    }
  });
});
