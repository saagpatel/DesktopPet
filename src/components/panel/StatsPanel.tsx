import type { DailySummary, UserProgress } from "../../store/types";

interface Props {
  progress: UserProgress;
  summaries: DailySummary[];
}

export function StatsPanel({ progress, summaries }: Props) {
  const totalGuardrails = summaries.reduce(
    (acc, item) => acc + item.guardrailsInterventions,
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Level" value={`${progress.level}`} />
        <StatCard label="XP" value={`${progress.xpTotal}`} />
        <StatCard label="Streak" value={`${progress.streakDays} days`} />
        <StatCard label="Longest" value={`${progress.longestStreak} days`} />
        <StatCard label="Sessions" value={`${progress.totalSessions}`} />
        <StatCard label="Focus" value={`${progress.totalFocusMinutes} min`} />
        <StatCard label="Guardrails" value={`${totalGuardrails}`} />
      </div>

      <div className="flex flex-col gap-2">
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--muted-color)" }}
        >
          Recent activity
        </h3>
        {summaries.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            No activity yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {summaries.map((summary) => (
              <div
                key={summary.date}
                className="p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--muted-color)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-medium"
                    style={{ color: "var(--text-color)" }}
                  >
                    {summary.date}
                  </span>
                  <span>+{summary.xpEarned} XP</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span>{summary.sessionsCompleted} sessions</span>
                  <span>{summary.focusMinutes} min focus</span>
                  <span>{summary.tasksCompleted} tasks</span>
                  <span>{summary.goalsCompleted} goals</span>
                  <span>{summary.coinsEarned} coins</span>
                  <span>{summary.guardrailsInterventions} guardrails</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 rounded-lg border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="text-xs" style={{ color: "var(--muted-color)" }}>
        {label}
      </div>
      <div
        className="text-sm font-semibold"
        style={{ color: "var(--text-color)" }}
      >
        {value}
      </div>
    </div>
  );
}
