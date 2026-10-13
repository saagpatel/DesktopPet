import { describe, it, expect } from "vitest";
import { formatTime, todayDateString, generateId } from "../utils";

describe("formatTime", () => {
  it("formats zero seconds", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats seconds only", () => {
    expect(formatTime(45)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125)).toBe("02:05");
  });

  it("formats exact minutes", () => {
    expect(formatTime(300)).toBe("05:00");
  });

  it("formats 25 minutes (standard pomodoro)", () => {
    expect(formatTime(1500)).toBe("25:00");
  });

  it("formats 50 minutes (long pomodoro)", () => {
    expect(formatTime(3000)).toBe("50:00");
  });

  it("pads single-digit minutes", () => {
    expect(formatTime(61)).toBe("01:01");
  });

  it("pads single-digit seconds", () => {
    expect(formatTime(603)).toBe("10:03");
  });

  it("handles large values", () => {
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("todayDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = todayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a 10-character string", () => {
    expect(todayDateString()).toHaveLength(10);
  });
});

describe("generateId", () => {
  it("returns a valid UUID", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
