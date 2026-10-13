import { invoke } from "@tauri-apps/api/core";
import { listen, type EventCallback } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Achievement, AchievementStats } from "../store/types";

const noop = () => {};

function warn(tag: string, error: unknown) {
  console.warn(`[${tag}]`, error);
}

export async function invokeOr<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  fallback: T,
  tag = cmd,
) {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    warn(tag, error);
    return fallback;
  }
}

export async function invokeMaybe<T>(
  cmd: string,
  args?: Record<string, unknown>,
  tag = cmd,
) {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    warn(tag, error);
    return null;
  }
}

export function invokeQuiet(
  cmd: string,
  args?: Record<string, unknown>,
  tag = cmd,
) {
  try {
    invoke(cmd, args).catch((error) => warn(tag, error));
  } catch (error) {
    warn(tag, error);
  }
}

export async function listenSafe<T>(
  event: string,
  handler: EventCallback<T>,
  tag = `listen:${event}`,
) {
  try {
    return await listen<T>(event, handler);
  } catch (error) {
    warn(tag, error);
    return noop;
  }
}

export function startDraggingSafe() {
  try {
    getCurrentWindow()
      .startDragging()
      .catch((error) => warn("startDragging", error));
  } catch (error) {
    warn("startDragging", error);
  }
}

// Achievement commands
export async function getAchievements(): Promise<Achievement[]> {
  return invokeOr<Achievement[]>(
    "get_achievements",
    undefined,
    [],
    "achievements:get",
  );
}

export async function getAchievementStats(): Promise<AchievementStats> {
  return invokeOr<AchievementStats>(
    "get_achievement_stats",
    undefined,
    { total: 0, unlocked: 0, locked: 0 },
    "achievements:stats",
  );
}

export async function checkAchievementProgress(): Promise<string[] | null> {
  return invokeMaybe<string[]>(
    "check_achievement_progress",
    undefined,
    "achievements:check",
  );
}
