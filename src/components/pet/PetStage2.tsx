import type { ShopItemId } from "../../lib/constants";

interface Props {
  accessories: ShopItemId[];
}

export function PetStage2({ accessories }: Props) {
  return (
    <svg width="250" height="250" viewBox="0 0 250 250" fill="none">
      {/* Body — more defined shape */}
      <ellipse cx="125" cy="140" rx="65" ry="55" fill="#4A9EC7" />
      {/* Belly */}
      <ellipse cx="125" cy="150" rx="42" ry="35" fill="#A3D5EE" opacity="0.6" />

      {/* Head */}
      <circle cx="125" cy="80" r="42" fill="#5BB5D5" />

      {/* Eyes — sharper */}
      <ellipse cx="108" cy="75" rx="11" ry="12" fill="white" />
      <ellipse cx="142" cy="75" rx="11" ry="12" fill="white" />
      <ellipse cx="110" cy="77" rx="7" ry="8" fill="#2D3748" />
      <ellipse cx="144" cy="77" rx="7" ry="8" fill="#2D3748" />
      <circle cx="113" cy="73" r="3" fill="white" />
      <circle cx="147" cy="73" r="3" fill="white" />

      {/* Mouth — confident smile */}
      <path
        d="M 112 95 Q 125 107 138 95"
        stroke="#2D3748"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Blush */}
      <ellipse cx="90" cy="92" rx="9" ry="5" fill="#FFB3B3" opacity="0.4" />
      <ellipse cx="160" cy="92" rx="9" ry="5" fill="#FFB3B3" opacity="0.4" />

      {/* Arms */}
      <ellipse
        cx="55"
        cy="145"
        rx="15"
        ry="10"
        fill="#4A9EC7"
        transform="rotate(-20 55 145)"
      />
      <ellipse
        cx="195"
        cy="145"
        rx="15"
        ry="10"
        fill="#4A9EC7"
        transform="rotate(20 195 145)"
      />

      {/* Legs */}
      <ellipse cx="100" cy="195" rx="18" ry="10" fill="#3A8DB5" />
      <ellipse cx="150" cy="195" rx="18" ry="10" fill="#3A8DB5" />

      {/* Small ears */}
      <ellipse
        cx="90"
        cy="48"
        rx="10"
        ry="14"
        fill="#5BB5D5"
        transform="rotate(-15 90 48)"
      />
      <ellipse
        cx="160"
        cy="48"
        rx="10"
        ry="14"
        fill="#5BB5D5"
        transform="rotate(15 160 48)"
      />

      {/* Accessories */}
      {accessories.includes("party_hat") && (
        <g>
          <polygon points="125,15 105,55 145,55" fill="#FF6B6B" />
          <circle cx="125" cy="15" r="5" fill="#FFD93D" />
        </g>
      )}
      {accessories.includes("bow_tie") && (
        <g>
          <polygon points="110,170 125,180 140,170 125,190" fill="#FF6B6B" />
          <circle cx="125" cy="180" r="4" fill="#FFD93D" />
        </g>
      )}
      {accessories.includes("sunglasses") && (
        <g>
          <rect
            x="94"
            y="68"
            width="25"
            height="16"
            rx="5"
            fill="#1A1A2E"
            opacity="0.85"
          />
          <rect
            x="131"
            y="68"
            width="25"
            height="16"
            rx="5"
            fill="#1A1A2E"
            opacity="0.85"
          />
          <line
            x1="119"
            y1="76"
            x2="131"
            y2="76"
            stroke="#1A1A2E"
            strokeWidth="2.5"
          />
        </g>
      )}
      {accessories.includes("scarf") && (
        <path
          d="M 70 115 Q 125 135 180 115 Q 175 128 125 132 Q 75 128 70 115"
          fill="#E74C3C"
        />
      )}
      {accessories.includes("apple") && (
        <g>
          <circle cx="42" cy="148" r="10" fill="#E74C3C" />
          <ellipse cx="42" cy="148" rx="10" ry="9" fill="#FF6B6B" />
          <path
            d="M 42 138 Q 46 131 50 135"
            stroke="#4A7C3F"
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      )}
      {accessories.includes("cookie") && (
        <g>
          <circle cx="208" cy="148" r="10" fill="#D4A056" />
          <circle cx="204" cy="146" r="2" fill="#6B4226" />
          <circle cx="210" cy="151" r="2" fill="#6B4226" />
          <circle cx="211" cy="144" r="1.5" fill="#6B4226" />
        </g>
      )}
    </svg>
  );
}
