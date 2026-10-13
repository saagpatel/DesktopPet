import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAchievements } from "../useAchievements";
import type { Achievement } from "../../store/types";

// Mock the tauri module
vi.mock("../../lib/tauri", () => ({
  getAchievements: vi.fn(async () => mockAchievements),
  getAchievementStats: vi.fn(async () => ({
    total: 20,
    unlocked: 2,
    locked: 18,
  })),
  checkAchievementProgress: vi.fn(async () => []),
  listenSafe: vi.fn(() => Promise.resolve(() => {})),
}));

const mockAchievements: Achievement[] = [
  {
    id: "first_session",
    category: "focus",
    title: "First Steps",
    description: "Complete your first focus session",
    icon: "🎯",
    unlockedAt: "2026-02-15T10:00:00Z",
    progress: 1,
    target: 1,
    hidden: false,
  },
  {
    id: "focused_5",
    category: "focus",
    title: "Getting Started",
    description: "Complete 5 focus sessions",
    icon: "🔥",
    unlockedAt: null,
    progress: 2,
    target: 5,
    hidden: false,
  },
  {
    id: "streak_3",
    category: "streak",
    title: "Consistency",
    description: "Maintain a 3-day streak",
    icon: "📅",
    unlockedAt: "2026-02-14T08:00:00Z",
    progress: 3,
    target: 3,
    hidden: false,
  },
  {
    id: "pet_evolved",
    category: "pet",
    title: "Growing Up",
    description: "Evolve your pet to stage 2",
    icon: "🌱",
    unlockedAt: null,
    progress: 1,
    target: 1,
    hidden: false,
  },
];

describe("useAchievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load achievements on mount", async () => {
    const { result } = renderHook(() => useAchievements());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.achievements).toHaveLength(4);
    expect(result.current.stats.total).toBe(20);
    expect(result.current.stats.unlocked).toBe(2);
  });

  it("should filter achievements by category", async () => {
    const { result } = renderHook(() => useAchievements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const focusAchievements = result.current.getByCategory("focus");
    expect(focusAchievements).toHaveLength(2);
    expect(focusAchievements.every((a) => a.category === "focus")).toBe(true);

    const streakAchievements = result.current.getByCategory("streak");
    expect(streakAchievements).toHaveLength(1);
  });

  it("should filter unlocked achievements", async () => {
    const { result } = renderHook(() => useAchievements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const unlocked = result.current.getUnlocked();
    expect(unlocked).toHaveLength(2);
    expect(unlocked.every((a) => a.unlockedAt !== null)).toBe(true);
  });

  it("should filter locked achievements", async () => {
    const { result } = renderHook(() => useAchievements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const locked = result.current.getLocked();
    expect(locked).toHaveLength(2);
    expect(locked.every((a) => a.unlockedAt === null)).toBe(true);
  });

  it("should calculate progress percentage", async () => {
    const { result } = renderHook(() => useAchievements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const achievement = result.current.achievements.find(
      (a) => a.id === "focused_5",
    );
    if (!achievement) throw new Error("Achievement not found");

    const percent = result.current.getProgressPercent(achievement);
    expect(percent).toBe(40); // 2/5 = 40%
  });

  it("should calculate completion percentage", async () => {
    const { result } = renderHook(() => useAchievements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const completionPercent = result.current.getCompletionPercent();
    expect(completionPercent).toBe(10); // 2/20 = 10%
  });
});
