import { formatTime } from "../../lib/utils";

interface Props {
  phase: string;
  secondsLeft: number;
  totalSeconds: number;
  sessionsCompleted: number;
  paused: boolean;
  guardrailMessage?: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function TimerDisplay({
  phase,
  secondsLeft,
  totalSeconds,
  sessionsCompleted,
  paused,
  guardrailMessage,
  onStart,
  onPause,
  onResume,
  onReset,
}: Props) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = circumference * (1 - progress);

  const ringColor =
    phase === "work"
      ? "stroke-red-400"
      : phase === "break"
        ? "stroke-green-400"
        : phase === "celebrating"
          ? "stroke-amber-400"
          : "stroke-gray-300";

  const phaseLabel =
    phase === "work"
      ? "Focus"
      : phase === "break"
        ? "Break"
        : phase === "celebrating"
          ? "Nice!"
          : "Ready";

  return (
    <div
      className="flex flex-col items-center gap-4 p-3 rounded-lg border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
        color: "var(--text-color)",
      }}
    >
      {/* Circular timer */}
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Background ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="8"
          />
          {/* Progress ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            className={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-mono font-bold"
            style={{ color: "var(--text-color)" }}
          >
            {formatTime(secondsLeft)}
          </span>
          <span className="text-sm" style={{ color: "var(--muted-color)" }}>
            {phaseLabel}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {phase === "idle" && (
          <button
            onClick={onStart}
            className="px-6 py-2 text-white rounded-full font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--accent-color)" }}
          >
            Start
          </button>
        )}
        {(phase === "work" || phase === "break") && !paused && (
          <button
            onClick={onPause}
            className="px-6 py-2 text-white rounded-full font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--muted-color) 80%, black)",
            }}
          >
            Pause
          </button>
        )}
        {(phase === "work" || phase === "break") && paused && (
          <button
            onClick={onResume}
            className="px-6 py-2 text-white rounded-full font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-color) 70%, green)",
            }}
          >
            Resume
          </button>
        )}
        {phase !== "idle" && (
          <button
            onClick={onReset}
            className="px-6 py-2 rounded-full font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--muted-color) 15%, white)",
              color: "var(--text-color)",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Session counter */}
      <div className="text-sm" style={{ color: "var(--muted-color)" }}>
        Sessions today:{" "}
        <span className="font-semibold" style={{ color: "var(--text-color)" }}>
          {sessionsCompleted}
        </span>
      </div>
      {guardrailMessage && (
        <div
          className="text-xs px-2 py-1 rounded-md text-center border"
          style={{
            color: "color-mix(in srgb, var(--accent-color) 55%, #92400e)",
            backgroundColor:
              "color-mix(in srgb, var(--accent-soft) 40%, #fef3c7)",
            borderColor: "color-mix(in srgb, var(--accent-color) 25%, #f59e0b)",
          }}
        >
          {guardrailMessage}
        </div>
      )}
    </div>
  );
}
