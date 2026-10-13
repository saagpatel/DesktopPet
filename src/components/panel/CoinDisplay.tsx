import { CoinBadge } from "../shared/CoinBadge";
import { ProgressBar } from "../shared/ProgressBar";

interface Props {
  available: number;
  stageName: string;
  progressToNext: number;
  stageProgress: number;
  stageSpan: number;
  level?: number;
  streakDays?: number;
}

export function CoinDisplay({
  available,
  stageName,
  progressToNext,
  stageProgress,
  stageSpan,
  level = 1,
  streakDays = 0,
}: Props) {
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg"
      style={{
        backgroundColor: "var(--accent-soft)",
        border: "1px solid color-mix(in srgb, var(--accent-color) 20%, white)",
      }}
    >
      <div className="flex items-center justify-between">
        <CoinBadge amount={available} />
        <div className="text-right">
          <span
            className="block text-sm font-medium"
            style={{ color: "var(--muted-color)" }}
          >
            Stage:{" "}
            <span style={{ color: "var(--accent-color)" }}>{stageName}</span>
          </span>
          <span
            className="block text-xs"
            style={{ color: "var(--muted-color)" }}
          >
            Level {level} • {streakDays}-day streak
          </span>
        </div>
      </div>
      {stageSpan > 0 ? (
        <div>
          <div
            className="flex justify-between text-xs mb-1"
            style={{ color: "var(--muted-color)" }}
          >
            <span>Evolution progress</span>
            <span>
              {stageProgress}/{stageSpan}
            </span>
          </div>
          <ProgressBar
            value={progressToNext}
            color="bg-[var(--accent-color)]"
          />
        </div>
      ) : (
        <div
          className="text-xs text-center"
          style={{ color: "var(--muted-color)" }}
        >
          Max evolution reached!
        </div>
      )}
    </div>
  );
}
