import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalsList } from "../GoalsList";
import type { DailyGoal } from "../../../store/types";

const mockGoals: DailyGoal[] = [
  {
    id: "pomodoros",
    description: "Complete 4 pomodoros",
    target: 4,
    progress: 2,
    date: "2025-01-01",
  },
  {
    id: "breaks",
    description: "Take 3 breaks",
    target: 3,
    progress: 3,
    date: "2025-01-01",
  },
  {
    id: "tasks",
    description: "Complete 2 tasks",
    target: 2,
    progress: 0,
    date: "2025-01-01",
  },
];

describe("GoalsList", () => {
  it("shows loading message when goals array is empty", () => {
    render(<GoalsList goals={[]} />);
    expect(screen.getByText("Loading goals...")).toBeInTheDocument();
  });

  it("renders all goals", () => {
    render(<GoalsList goals={mockGoals} />);
    expect(screen.getByText(/Complete 4 pomodoros/)).toBeInTheDocument();
    expect(screen.getByText(/Take 3 breaks/)).toBeInTheDocument();
    expect(screen.getByText(/Complete 2 tasks/)).toBeInTheDocument();
  });

  it("displays progress counts as text content", () => {
    const { container } = render(<GoalsList goals={mockGoals} />);
    // Progress renders as {progress}/{target} with separate text nodes
    const countSpans = container.querySelectorAll(".text-xs.text-gray-400");
    const texts = Array.from(countSpans).map((el) =>
      el.textContent?.replace(/\s/g, ""),
    );
    expect(texts).toContain("2/4");
    expect(texts).toContain("3/3");
    expect(texts).toContain("0/2");
  });

  it("marks completed goals with checkmark", () => {
    const { container } = render(<GoalsList goals={mockGoals} />);
    // Completed goal (breaks 3/3) has checkmark in text
    const goalSpans = container.querySelectorAll(".text-sm");
    const breaksSpan = Array.from(goalSpans).find((el) =>
      el.textContent?.includes("Take 3 breaks"),
    );
    expect(breaksSpan?.textContent).toContain("\u2713");
  });

  it("applies line-through to completed goals", () => {
    const { container } = render(<GoalsList goals={mockGoals} />);
    const goalSpans = container.querySelectorAll(".text-sm");
    const breaksSpan = Array.from(goalSpans).find((el) =>
      el.textContent?.includes("Take 3 breaks"),
    ) as HTMLElement;
    expect(breaksSpan.className).toContain("line-through");
  });

  it("does not apply line-through to incomplete goals", () => {
    const { container } = render(<GoalsList goals={mockGoals} />);
    const goalSpans = container.querySelectorAll(".text-sm");
    const pomodorosSpan = Array.from(goalSpans).find((el) =>
      el.textContent?.includes("Complete 4 pomodoros"),
    ) as HTMLElement;
    expect(pomodorosSpan.className).not.toContain("line-through");
  });
});
