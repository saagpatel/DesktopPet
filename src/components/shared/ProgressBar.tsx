interface Props {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 1,
  color = "bg-[var(--accent-color)]",
  className = "",
}: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
