import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PetPanel } from "../PetPanel";
import type { PetEvent, PetState } from "../../../store/types";

const pet: PetState = {
  currentStage: 1,
  animationState: "idle",
  accessories: [],
  totalPomodoros: 6,
  speciesId: "penguin",
  evolutionThresholds: [0, 5, 15],
  mood: "content",
  energy: 80,
  hunger: 20,
  cleanliness: 80,
  affection: 55,
  personality: "balanced",
  evolutionPath: "companion",
  skin: "classic",
  scene: "meadow",
  lastInteraction: null,
  lastCareUpdateAt: new Date().toISOString(),
};

describe("PetPanel smoke flow", () => {
  it("captures photo booth card on demand", async () => {
    const user = userEvent.setup();
    const onCaptureCard = vi.fn(async () => "Pet card saved.");

    render(
      <PetPanel
        pet={pet}
        events={[]}
        activeQuest={null}
        rollFeedback={null}
        interactionVerbs={[
          { id: "pet", label: "Pat" },
          { id: "feed", label: "Feed" },
          { id: "play", label: "Play" },
          { id: "nap", label: "Nap" },
          { id: "clean", label: "Clean" },
          { id: "train", label: "Train" },
        ]}
        onInteract={vi.fn()}
        onCaptureCard={onCaptureCard}
        onRollEvent={vi.fn(async () => null)}
        onResolveEvent={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Photo Booth: Save Pet Card" }),
    );
    expect(onCaptureCard).toHaveBeenCalledTimes(1);
    await screen.findByText("Pet card saved.");
  });

  it("shows a photo-card error when capture rejects", async () => {
    const user = userEvent.setup();
    render(
      <PetPanel
        pet={pet}
        events={[]}
        activeQuest={null}
        rollFeedback={null}
        interactionVerbs={[]}
        onInteract={vi.fn()}
        onCaptureCard={vi.fn(async () => {
          throw new Error("Permission denied");
        })}
        onRollEvent={vi.fn(async () => null)}
        onResolveEvent={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Photo Booth: Save Pet Card" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Permission denied",
    );
  });

  it("shows the latest quest-roll feedback message", () => {
    const feedback: PetEvent = {
      id: "quiet-1",
      kind: "quiet",
      description: "Quiet mode: next new quest available in about 12 min.",
      createdAt: new Date().toISOString(),
      resolved: true,
    };

    render(
      <PetPanel
        pet={pet}
        events={[]}
        activeQuest={null}
        rollFeedback={feedback}
        interactionVerbs={[
          { id: "pet", label: "Pat" },
          { id: "feed", label: "Feed" },
          { id: "play", label: "Play" },
          { id: "nap", label: "Nap" },
          { id: "clean", label: "Clean" },
          { id: "train", label: "Train" },
        ]}
        onInteract={vi.fn()}
        onCaptureCard={vi.fn(async () => "Pet card saved.")}
        onRollEvent={vi.fn(async () => null)}
        onResolveEvent={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Quiet mode: next new quest available in about 12 min."),
    ).toBeInTheDocument();
  });

  it("prevents repeated quest roll clicks while loading", async () => {
    const user = userEvent.setup();
    let resolveRoll: (value: PetEvent | null) => void = () => {};
    const onRollEvent = vi.fn(
      () =>
        new Promise<PetEvent | null>((resolve) => {
          resolveRoll = resolve;
        }),
    );

    render(
      <PetPanel
        pet={pet}
        events={[]}
        activeQuest={null}
        rollFeedback={null}
        interactionVerbs={[
          { id: "pet", label: "Pat" },
          { id: "feed", label: "Feed" },
          { id: "play", label: "Play" },
          { id: "nap", label: "Nap" },
          { id: "clean", label: "Clean" },
          { id: "train", label: "Train" },
        ]}
        onInteract={vi.fn()}
        onCaptureCard={vi.fn(async () => "Pet card saved.")}
        onRollEvent={onRollEvent}
        onResolveEvent={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New Quest" }));
    expect(onRollEvent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Checking..." }));
    expect(onRollEvent).toHaveBeenCalledTimes(1);

    resolveRoll(null);
    await screen.findByRole("button", { name: "New Quest" });
  });
});
