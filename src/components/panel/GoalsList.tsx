import type { DailyGoal } from "../../store/types";
import { ProgressBar } from "../shared/ProgressBar";

interface Props {
  goals: DailyGoal[];
}

export function GoalsList({ goals }: Props) {
  if (goals.length === 0) {
    return (
      <p
        className="text-sm text-center py-4"
        style={{ color: "var(--muted-color)" }}
      >
        Loading goals...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {goals.map((goal) => {
        const done = goal.progress >= goal.target;
        return (
          <div
            key={goal.id}
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-sm ${done ? "line-through" : ""}`}
                style={{
                  color: done
                    ? "color-mix(in srgb, var(--accent-color) 40%, green)"
                    : "var(--text-color)",
                }}
              >
                {done ? "\u2713 " : ""}
                {goal.description}
              </span>
              <span
                className="text-xs text-gray-400"
                style={{ color: "var(--muted-color)" }}
              >
                {goal.progress}/{goal.target}
              </span>
            </div>
            <ProgressBar
              value={goal.progress}
              max={goal.target}
              color={done ? "bg-green-500" : "bg-[var(--accent-color)]"}
            />
          </div>
        );
      })}
    </div>
  );
}
