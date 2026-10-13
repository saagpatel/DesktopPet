import { useState } from "react";
import { useAchievements } from "../../hooks/useAchievements";
import { AchievementBadge } from "../shared/AchievementBadge";
import type { AchievementCategory } from "../../store/types";

const CATEGORIES: { id: AchievementCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "focus", label: "Focus" },
  { id: "streak", label: "Streak" },
  { id: "pet", label: "Pet Care" },
  { id: "progression", label: "Progression" },
  { id: "special", label: "Special" },
];

export function AchievementsPanel() {
  const { achievements, stats, loading, getByCategory, getCompletionPercent } =
    useAchievements();

  const [selectedCategory, setSelectedCategory] = useState<
    AchievementCategory | "all"
  >("all");
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  // Get filtered achievements
  const getFilteredAchievements = () => {
    let filtered = achievements;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = getByCategory(selectedCategory);
    }

    // Filter by unlock status
    if (filter === "unlocked") {
      filtered = filtered.filter((a) => a.unlockedAt !== null);
    } else if (filter === "locked") {
      filtered = filtered.filter((a) => a.unlockedAt === null);
    }

    return filtered;
  };

  const filteredAchievements = getFilteredAchievements();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading achievements...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Achievements
        </h2>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {stats.unlocked}
            </span>{" "}
            / {stats.total} unlocked
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${getCompletionPercent()}%` }}
              />
            </div>
            <span className="font-semibold">{getCompletionPercent()}%</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        {/* Category Filter */}
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Category
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Status
          </div>
          <div className="flex gap-2">
            {(["all", "unlocked", "locked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAchievements.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
            No achievements found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {filteredAchievements.map((achievement) => (
              <div key={achievement.id} className="flex flex-col">
                <AchievementBadge achievement={achievement} size="medium" />
                <div className="mt-2 text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {achievement.description}
                  </div>
                  {achievement.unlockedAt && (
                    <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-500">
                      Unlocked{" "}
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
