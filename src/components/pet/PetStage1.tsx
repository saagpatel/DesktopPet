import type { ShopItemId } from "../../lib/constants";

interface Props {
  accessories: ShopItemId[];
}

export function PetStage1({ accessories }: Props) {
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" fill="none">
      {/* Body — rounded blob */}
      <ellipse cx="75" cy="85" rx="50" ry="45" fill="#7EC8E3" />
      {/* Belly highlight */}
      <ellipse cx="75" cy="92" rx="32" ry="28" fill="#B5E3F5" opacity="0.6" />

      {/* Eyes */}
      <circle cx="58" cy="75" r="10" fill="white" />
      <circle cx="92" cy="75" r="10" fill="white" />
      <circle cx="60" cy="76" r="6" fill="#2D3748" />
      <circle cx="94" cy="76" r="6" fill="#2D3748" />
      {/* Eye shine */}
      <circle cx="62" cy="73" r="2.5" fill="white" />
      <circle cx="96" cy="73" r="2.5" fill="white" />

      {/* Mouth */}
      <path
        d="M 67 92 Q 75 100 83 92"
        stroke="#2D3748"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Blush spots */}
      <ellipse cx="48" cy="90" rx="8" ry="5" fill="#FFB3B3" opacity="0.5" />
      <ellipse cx="102" cy="90" rx="8" ry="5" fill="#FFB3B3" opacity="0.5" />

      {/* Stubby feet */}
      <ellipse cx="60" cy="126" rx="12" ry="6" fill="#5BA8C8" />
      <ellipse cx="90" cy="126" rx="12" ry="6" fill="#5BA8C8" />

      {/* Accessories */}
      {accessories.includes("party_hat") && (
        <g>
          <polygon points="75,20 60,55 90,55" fill="#FF6B6B" />
          <circle cx="75" cy="20" r="4" fill="#FFD93D" />
        </g>
      )}
      {accessories.includes("bow_tie") && (
        <g>
          <polygon points="65,108 75,115 85,108 75,122" fill="#FF6B6B" />
          <circle cx="75" cy="115" r="3" fill="#FFD93D" />
        </g>
      )}
      {accessories.includes("sunglasses") && (
        <g>
          <rect
            x="46"
            y="69"
            width="22"
            height="14"
            rx="4"
            fill="#1A1A2E"
            opacity="0.85"
          />
          <rect
            x="82"
            y="69"
            width="22"
            height="14"
            rx="4"
            fill="#1A1A2E"
            opacity="0.85"
          />
          <line
            x1="68"
            y1="76"
            x2="82"
            y2="76"
            stroke="#1A1A2E"
            strokeWidth="2"
          />
        </g>
      )}
      {accessories.includes("scarf") && (
        <path
          d="M 35 105 Q 75 120 115 105 Q 110 115 75 118 Q 40 115 35 105"
          fill="#E74C3C"
        />
      )}
      {accessories.includes("apple") && (
        <g>
          <circle cx="30" cy="100" r="8" fill="#E74C3C" />
          <ellipse cx="30" cy="100" rx="8" ry="7" fill="#FF6B6B" />
          <path
            d="M 30 92 Q 33 86 36 89"
            stroke="#4A7C3F"
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      )}
      {accessories.includes("cookie") && (
        <g>
          <circle cx="120" cy="100" r="8" fill="#D4A056" />
          <circle cx="117" cy="98" r="1.5" fill="#6B4226" />
          <circle cx="122" cy="102" r="1.5" fill="#6B4226" />
          <circle cx="121" cy="96" r="1.2" fill="#6B4226" />
        </g>
      )}
    </svg>
  );
}
