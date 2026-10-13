import type { ShopItemId } from "../../lib/constants";
import { getSpeciesPackById } from "../../pets/species";

interface Props {
  stage: number;
  accessories: ShopItemId[];
  speciesId: string;
  speciesMotionClass?: string;
}

const ACCESSORY_GLYPHS: Record<ShopItemId, string> = {
  party_hat: "🎉",
  bow_tie: "🎀",
  sunglasses: "🕶",
  scarf: "🧣",
  apple: "🍎",
  cookie: "🍪",
};

function anchorForAccessory(
  accessory: ShopItemId,
  anchors: ReturnType<typeof getSpeciesPackById>["accessoryAnchors"],
) {
  if (accessory === "party_hat") return anchors.head;
  if (accessory === "bow_tie" || accessory === "scarf") return anchors.neck;
  if (accessory === "apple") return anchors.left;
  if (accessory === "cookie") return anchors.right;
  return anchors.head;
}

export function PetCharacter({
  stage,
  accessories,
  speciesId,
  speciesMotionClass,
}: Props) {
  const species = getSpeciesPackById(speciesId);
  const stageIndex = Math.max(0, Math.min(2, stage));
  const motionClass =
    speciesMotionClass ?? `species-${species.idleBehavior.baseAnimation}`;

  return (
    <div className="relative w-[220px] h-[220px] flex items-center justify-center">
      <img
        src={species.stageSprites[stageIndex]}
        alt={`${species.name} stage ${stageIndex + 1}`}
        className={`w-[210px] h-[210px] object-contain drop-shadow-[0_10px_14px_rgba(15,23,42,0.14)] ${motionClass}`}
      />
      {accessories.map((accessory) => {
        const anchor = anchorForAccessory(accessory, species.accessoryAnchors);
        return (
          <span
            key={accessory}
            className="absolute text-xl leading-none select-none pointer-events-none drop-shadow"
            style={{
              left: `${(anchor.x / 200) * 100}%`,
              top: `${(anchor.y / 200) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {ACCESSORY_GLYPHS[accessory]}
          </span>
        );
      })}
    </div>
  );
}
