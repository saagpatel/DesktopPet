import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimerDisplay } from "../TimerDisplay";

const baseProps = {
  phase: "idle",
  secondsLeft: 1500,
  totalSeconds: 1500,
  sessionsCompleted: 0,
  paused: false,
  onStart: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onReset: vi.fn(),
};

describe("TimerDisplay", () => {
  it("renders formatted time", () => {
    render(<TimerDisplay {...baseProps} />);
    expect(screen.getByText("25:00")).toBeInTheDocument();
  });

  it("shows 'Ready' label when idle", () => {
    render(<TimerDisplay {...baseProps} />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows Start button when idle", () => {
    render(<TimerDisplay {...baseProps} />);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("calls onStart when Start clicked", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<TimerDisplay {...baseProps} onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("shows 'Focus' label during work phase", () => {
    render(<TimerDisplay {...baseProps} phase="work" secondsLeft={1200} />);
    expect(screen.getByText("Focus")).toBeInTheDocument();
  });

  it("shows Pause button during work", () => {
    render(<TimerDisplay {...baseProps} phase="work" />);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("calls onPause when Pause clicked", async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    render(<TimerDisplay {...baseProps} phase="work" onPause={onPause} />);
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("shows Resume button when paused during work", () => {
    render(<TimerDisplay {...baseProps} phase="work" paused={true} />);
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("calls onResume when Resume clicked", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    render(
      <TimerDisplay
        {...baseProps}
        phase="work"
        paused={true}
        onResume={onResume}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("shows Reset button during non-idle phases", () => {
    render(<TimerDisplay {...baseProps} phase="work" />);
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("does not show Reset button when idle", () => {
    render(<TimerDisplay {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
  });

  it("shows 'Break' label during break phase", () => {
    render(
      <TimerDisplay
        {...baseProps}
        phase="break"
        secondsLeft={300}
        totalSeconds={300}
      />,
    );
    expect(screen.getByText("Break")).toBeInTheDocument();
  });

  it("shows 'Nice!' label during celebrating phase", () => {
    render(<TimerDisplay {...baseProps} phase="celebrating" secondsLeft={0} />);
    expect(screen.getByText("Nice!")).toBeInTheDocument();
  });

  it("displays session count", () => {
    render(<TimerDisplay {...baseProps} sessionsCompleted={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders SVG progress ring", () => {
    const { container } = render(<TimerDisplay {...baseProps} />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });
});
