import { useEffect, useState } from "react";
import {
  getAchievements,
  getAchievementStats,
  checkAchievementProgress,
} from "../lib/tauri";
import { listenSafe } from "../lib/tauri";
import type { Achievement, AchievementStats } from "../store/types";

interface AchievementUnlockedPayload {
  id: string;
  title: string;
  icon: string;
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>({
    total: 0,
    unlocked: 0,
    locked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentUnlock, setRecentUnlock] =
    useState<AchievementUnlockedPayload | null>(null);

  // Load achievements on mount
  useEffect(() => {
    const loadAchievements = async () => {
      setLoading(true);
      const data = await getAchievements();
      setAchievements(data);

      const statsData = await getAchievementStats();
      setStats(statsData);

      setLoading(false);
    };

    loadAchievements();
  }, []);

  // Listen for achievement unlocks
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listenSafe<AchievementUnlockedPayload>(
        "achievement_unlocked",
        (event) => {
          setRecentUnlock(event.payload);

          // Reload achievements to get updated state
          getAchievements().then(setAchievements);
          getAchievementStats().then(setStats);

          // Clear recent unlock after 5 seconds
          setTimeout(() => setRecentUnlock(null), 5000);
        },
      );
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Check achievement progress
  const checkProgress = async () => {
    const newlyUnlocked = await checkAchievementProgress();
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      // Reload achievements
      const data = await getAchievements();
      setAchievements(data);

      const statsData = await getAchievementStats();
      setStats(statsData);
    }
    return newlyUnlocked || [];
  };

  // Get achievements by category
  const getByCategory = (category: string) => {
    return achievements.filter((a) => a.category === category);
  };

  // Get unlocked achievements
  const getUnlocked = () => {
    return achievements.filter((a) => a.unlockedAt !== null);
  };

  // Get locked achievements
  const getLocked = () => {
    return achievements.filter((a) => a.unlockedAt === null);
  };

  // Get achievement progress percentage
  const getProgressPercent = (achievement: Achievement) => {
    if (achievement.target === 0) return 0;
    return Math.min(
      100,
      Math.round((achievement.progress / achievement.target) * 100),
    );
  };

  // Get overall completion percentage
  const getCompletionPercent = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.unlocked / stats.total) * 100);
  };

  return {
    achievements,
    stats,
    loading,
    recentUnlock,
    checkProgress,
    getByCategory,
    getUnlocked,
    getLocked,
    getProgressPercent,
    getCompletionPercent,
  };
}
