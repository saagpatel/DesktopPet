import type { PetState, PetEvent, PetQuest } from "../../store/types";
import { useState } from "react";

interface Props {
  pet: PetState;
  events: PetEvent[];
  activeQuest: PetQuest | null;
  rollFeedback: PetEvent | null;
  interactionVerbs: Array<{ id: string; label: string }>;
  onInteract: (action: string) => void;
  onCaptureCard: () => Promise<string>;
  onRollEvent: () => Promise<PetEvent | null>;
  onResolveEvent: (eventId: string) => void;
}

const ACTION_ICONS: Record<string, string> = {
  pet: "👋",
  feed: "🍎",
  play: "🎾",
  nap: "💤",
  clean: "🛁",
  train: "💪",
};

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-16" style={{ color: "var(--muted-color)" }}>
        {label}
      </span>
      <div
        className="flex-1 h-2 rounded-full"
        style={{ backgroundColor: "var(--border-color)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="text-xs w-8 text-right"
        style={{ color: "var(--text-color)" }}
      >
        {value}%
      </span>
    </div>
  );
}

export function PetPanel({
  pet,
  events,
  activeQuest,
  rollFeedback,
  interactionVerbs,
  onInteract,
  onCaptureCard,
  onRollEvent,
  onResolveEvent,
}: Props) {
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [rollingQuest, setRollingQuest] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Pet Status */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--card-bg)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium" style={{ color: "var(--text-color)" }}>
            Pet Status
          </h3>
          <span
            className="text-sm px-2 py-0.5 rounded-full capitalize"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent-color)",
            }}
          >
            {pet.mood}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <StatBar label="Energy" value={pet.energy} color="#22c55e" />
          <StatBar label="Hunger" value={100 - pet.hunger} color="#f97316" />
          <StatBar label="Clean" value={pet.cleanliness} color="#3b82f6" />
          <StatBar label="Bond" value={pet.affection} color="#ec4899" />
        </div>
        <div
          className="mt-3 pt-3 flex items-center justify-between text-xs"
          style={{
            borderTop: "1px solid var(--border-color)",
            color: "var(--muted-color)",
          }}
        >
          <span>
            Path:{" "}
            <span className="capitalize" style={{ color: "var(--text-color)" }}>
              {pet.evolutionPath}
            </span>
          </span>
          <span>
            Personality:{" "}
            <span className="capitalize" style={{ color: "var(--text-color)" }}>
              {pet.personality}
            </span>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--card-bg)" }}
      >
        <h3 className="font-medium mb-3" style={{ color: "var(--text-color)" }}>
          Actions
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {interactionVerbs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onInteract(item.id)}
              className="flex flex-col items-center gap-1 p-3 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: "var(--panel-bg)" }}
            >
              <span className="text-xl">{ACTION_ICONS[item.id] ?? "✨"}</span>
              <span className="text-xs" style={{ color: "var(--text-color)" }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setPhotoError(null);
            void onCaptureCard()
              .then(setPhotoMessage)
              .catch((error: unknown) => {
                setPhotoError(
                  error instanceof Error
                    ? error.message
                    : "Could not save pet card.",
                );
              });
          }}
          className="mt-3 w-full py-2 rounded-lg text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--accent-color)" }}
        >
          Photo Booth: Save Pet Card
        </button>
        {photoMessage && (
          <p className="mt-2 text-xs" style={{ color: "var(--muted-color)" }}>
            {photoMessage}
          </p>
        )}
        {photoError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {photoError}
          </p>
        )}
      </div>

      {/* Active Quest */}
      {activeQuest && (
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: "var(--accent-soft)" }}
        >
          <h3
            className="font-medium mb-2"
            style={{ color: "var(--accent-color)" }}
          >
            Active Quest
          </h3>
          <p className="text-sm mb-2" style={{ color: "var(--text-color)" }}>
            {activeQuest.title}
          </p>
          <p
            className="text-xs mb-2 capitalize"
            style={{ color: "var(--muted-color)" }}
          >
            {activeQuest.kind.replace("_", " ")}
          </p>
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: "var(--muted-color)" }}
          >
            <span>
              {activeQuest.completedSessions}/{activeQuest.targetSessions}{" "}
              sessions
            </span>
            <span>+{activeQuest.rewardCoins} coins</span>
          </div>
          <div
            className="mt-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--border-color)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(activeQuest.completedSessions / activeQuest.targetSessions) * 100}%`,
                backgroundColor: "var(--accent-color)",
              }}
            />
          </div>
        </div>
      )}

      {/* Events */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--card-bg)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium" style={{ color: "var(--text-color)" }}>
            Events
          </h3>
          <button
            type="button"
            onClick={() => {
              if (rollingQuest) {
                return;
              }
              setRollingQuest(true);
              void onRollEvent().finally(() => {
                setRollingQuest(false);
              });
            }}
            disabled={rollingQuest}
            className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent-color)",
            }}
          >
            {rollingQuest ? "Checking..." : "New Quest"}
          </button>
        </div>
        {rollFeedback && (
          <div
            aria-live="polite"
            className="mb-3 text-xs border rounded-md px-2 py-1"
            style={{
              color: "var(--muted-color)",
              borderColor: "var(--border-color)",
              backgroundColor: "var(--panel-bg)",
            }}
          >
            {rollFeedback.description}
          </div>
        )}
        {events.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            No active events
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-2 p-2 rounded text-sm"
                style={{ backgroundColor: "var(--panel-bg)" }}
              >
                <span
                  className={event.resolved ? "opacity-50 line-through" : ""}
                  style={{ color: "var(--text-color)" }}
                >
                  {event.description}
                </span>
                {!event.resolved && (
                  <button
                    type="button"
                    onClick={() => onResolveEvent(event.id)}
                    className="text-xs px-2 py-0.5 rounded hover:opacity-80"
                    style={{
                      backgroundColor: "var(--accent-color)",
                      color: "white",
                    }}
                  >
                    Done
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
