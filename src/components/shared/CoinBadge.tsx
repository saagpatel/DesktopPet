interface Props {
  amount: number;
}

export function CoinBadge({ amount }: Props) {
  return (
    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle
          cx="8"
          cy="8"
          r="7"
          fill="#FFD93D"
          stroke="#E6A800"
          strokeWidth="1"
        />
        <text
          x="8"
          y="11"
          textAnchor="middle"
          fontSize="8"
          fill="#B8860B"
          fontWeight="bold"
        >
          $
        </text>
      </svg>
      {amount}
    </span>
  );
}
