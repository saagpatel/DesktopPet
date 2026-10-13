import type { Achievement } from "../../store/types";

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "small" | "medium" | "large";
  showProgress?: boolean;
}

export function AchievementBadge({
  achievement,
  size = "medium",
  showProgress = true,
}: AchievementBadgeProps) {
  const isUnlocked = achievement.unlockedAt !== null;
  const progressPercent =
    achievement.target > 0
      ? Math.min(
          100,
          Math.round((achievement.progress / achievement.target) * 100),
        )
      : 0;

  const sizeClasses = {
    small: "w-16 h-20",
    medium: "w-24 h-28",
    large: "w-32 h-36",
  };

  const iconSizes = {
    small: "text-2xl",
    medium: "text-4xl",
    large: "text-5xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} flex flex-col items-center justify-center rounded-lg border-2 p-2 transition-all ${
        isUnlocked
          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
          : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800 opacity-60"
      }`}
      title={
        isUnlocked && achievement.unlockedAt
          ? `${achievement.title} - Unlocked ${new Date(achievement.unlockedAt).toLocaleDateString()}`
          : achievement.description
      }
    >
      {/* Icon */}
      <div className={`${iconSizes[size]} ${isUnlocked ? "" : "grayscale"}`}>
        {achievement.icon}
      </div>

      {/* Title */}
      <div
        className={`mt-1 text-center text-xs font-medium ${
          isUnlocked
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {achievement.title}
      </div>

      {/* Progress bar for locked achievements */}
      {!isUnlocked && showProgress && achievement.target > 1 && (
        <div className="mt-1 w-full">
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-0.5 text-center text-[10px] text-gray-500 dark:text-gray-400">
            {achievement.progress}/{achievement.target}
          </div>
        </div>
      )}
    </div>
  );
}
