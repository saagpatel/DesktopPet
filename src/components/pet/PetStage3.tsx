import type { ShopItemId } from "../../lib/constants";

interface Props {
  accessories: ShopItemId[];
}

export function PetStage3({ accessories }: Props) {
  return (
    <svg width="350" height="350" viewBox="0 0 350 350" fill="none">
      {/* Wings */}
      <path
        d="M 50 160 Q 20 120 40 80 Q 60 100 70 150"
        fill="#3A7CA5"
        opacity="0.7"
      />
      <path
        d="M 300 160 Q 330 120 310 80 Q 290 100 280 150"
        fill="#3A7CA5"
        opacity="0.7"
      />
      <path
        d="M 55 175 Q 15 140 30 95 Q 55 115 65 165"
        fill="#2E6B8A"
        opacity="0.5"
      />
      <path
        d="M 295 175 Q 335 140 320 95 Q 295 115 285 165"
        fill="#2E6B8A"
        opacity="0.5"
      />

      {/* Body — angular/armored */}
      <path
        d="M 110 120 L 175 100 L 240 120 L 250 200 L 175 230 L 100 200 Z"
        fill="#2A6F97"
      />
      {/* Armor plates */}
      <path
        d="M 130 135 L 175 120 L 220 135 L 215 185 L 175 200 L 135 185 Z"
        fill="#3D8AB9"
        opacity="0.7"
      />
      <path
        d="M 150 150 L 175 140 L 200 150 L 195 175 L 175 182 L 155 175 Z"
        fill="#5BA8C8"
        opacity="0.5"
      />

      {/* Head — more angular */}
      <path
        d="M 125 60 L 175 40 L 225 60 L 220 110 L 175 120 L 130 110 Z"
        fill="#327BA8"
      />

      {/* Crown spikes */}
      <polygon points="140,60 145,30 155,55" fill="#FFD93D" />
      <polygon points="165,48 175,15 185,48" fill="#FFD93D" />
      <polygon points="195,55 205,30 210,60" fill="#FFD93D" />

      {/* Eyes — intimidating */}
      <path d="M 145 78 L 155 72 L 167 78 L 155 82 Z" fill="white" />
      <path d="M 183 78 L 195 72 L 205 78 L 195 82 Z" fill="white" />
      <circle cx="156" cy="77" r="4" fill="#FF4444" />
      <circle cx="194" cy="77" r="4" fill="#FF4444" />
      <circle cx="157" cy="76" r="1.5" fill="white" />
      <circle cx="195" cy="76" r="1.5" fill="white" />

      {/* Mouth — determined */}
      <path
        d="M 160 96 L 175 102 L 190 96"
        stroke="#1A1A2E"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Arms — strong */}
      <path d="M 95 150 Q 60 145 55 170 Q 60 185 95 180" fill="#2A6F97" />
      <path d="M 255 150 Q 290 145 295 170 Q 290 185 255 180" fill="#2A6F97" />
      {/* Claws */}
      <circle cx="55" cy="165" r="6" fill="#1E5276" />
      <circle cx="295" cy="165" r="6" fill="#1E5276" />

      {/* Legs — sturdy */}
      <rect x="120" y="225" width="30" height="35" rx="8" fill="#1E5276" />
      <rect x="200" y="225" width="30" height="35" rx="8" fill="#1E5276" />
      {/* Feet */}
      <ellipse cx="135" cy="265" rx="20" ry="10" fill="#163D57" />
      <ellipse cx="215" cy="265" rx="20" ry="10" fill="#163D57" />

      {/* Tail */}
      <path
        d="M 175 230 Q 140 260 120 290 Q 115 300 125 295 Q 145 275 175 240"
        fill="#2A6F97"
        stroke="#1E5276"
        strokeWidth="1"
      />

      {/* Accessories */}
      {accessories.includes("party_hat") && (
        <g>
          <polygon points="175,0 155,40 195,40" fill="#FF6B6B" />
          <circle cx="175" cy="0" r="6" fill="#FFD93D" />
        </g>
      )}
      {accessories.includes("bow_tie") && (
        <g>
          <polygon points="155,218 175,228 195,218 175,240" fill="#FF6B6B" />
          <circle cx="175" cy="228" r="5" fill="#FFD93D" />
        </g>
      )}
      {accessories.includes("sunglasses") && (
        <g>
          <rect
            x="140"
            y="71"
            width="30"
            height="14"
            rx="3"
            fill="#1A1A2E"
            opacity="0.9"
          />
          <rect
            x="180"
            y="71"
            width="30"
            height="14"
            rx="3"
            fill="#1A1A2E"
            opacity="0.9"
          />
          <line
            x1="170"
            y1="78"
            x2="180"
            y2="78"
            stroke="#1A1A2E"
            strokeWidth="3"
          />
        </g>
      )}
      {accessories.includes("scarf") && (
        <path
          d="M 100 115 Q 175 140 250 115 Q 245 130 175 135 Q 105 130 100 115"
          fill="#E74C3C"
        />
      )}
      {accessories.includes("apple") && (
        <g>
          <circle cx="42" cy="168" r="12" fill="#E74C3C" />
          <ellipse cx="42" cy="168" rx="12" ry="11" fill="#FF6B6B" />
          <path
            d="M 42 156 Q 47 148 52 153"
            stroke="#4A7C3F"
            strokeWidth="2"
            fill="none"
          />
        </g>
      )}
      {accessories.includes("cookie") && (
        <g>
          <circle cx="308" cy="168" r="12" fill="#D4A056" />
          <circle cx="304" cy="165" r="2.5" fill="#6B4226" />
          <circle cx="311" cy="171" r="2.5" fill="#6B4226" />
          <circle cx="312" cy="163" r="2" fill="#6B4226" />
        </g>
      )}
    </svg>
  );
}
