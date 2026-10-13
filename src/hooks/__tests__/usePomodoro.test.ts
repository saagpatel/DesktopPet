import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePomodoro } from "../usePomodoro";

// Mock Tauri modules
vi.mock("@tauri-apps/api/core");
vi.mock("@tauri-apps/api/event");

// Mock tauri.ts wrapper functions
vi.mock("../../lib/tauri", () => ({
  invokeMaybe: vi.fn(async (command: string, _args: any) => {
    if (command === "get_timer_runtime") {
      return {
        phase: "idle",
        secondsLeft: 1500,
        totalSeconds: 1500,
        paused: false,
        sessionId: null,
        sessionsCompleted: 0,
        preset: "standard",
        lastUpdatedAt: new Date().toISOString(),
      };
    }
    if (command === "start_pomodoro") {
      return { id: "session-123" };
    }
    if (command === "get_settings") {
      return {
        notificationsEnabled: true,
        quietModeEnabled: false,
        soundEnabled: true,
        volume: 50,
        focusGuardrailsEnabled: true,
        focusBlocklist: ["configured-only.example"],
        focusAllowlist: [],
      };
    }
    return null;
  }),
  invokeQuiet: vi.fn(),
  listenSafe: vi.fn(() => Promise.resolve(() => {})),
}));

describe("usePomodoro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should initialize with idle phase and default preset", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    // After hydration, should have loaded timer runtime
    expect(result.current.phase).toBe("idle");
    expect(result.current.preset).toBe("standard");
  });

  it("should start a pomodoro session and transition to work phase", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
    });

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("work");
      expect(result.current.sessionId).toBe("session-123");
    });
    const { invokeMaybe } = await import("../../lib/tauri");
    expect(invokeMaybe).not.toHaveBeenCalledWith(
      "apply_focus_guardrails_intervention",
      expect.anything(),
    );
    expect(result.current.paused).toBe(false);
  });

  it("should countdown seconds during work phase", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.phase).toBe("idle");

    const initialSeconds = result.current.secondsLeft;

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe("work");

    // Advance time by 1 second
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.secondsLeft).toBe(initialSeconds - 1);

    vi.useRealTimers();
  });

  it("should pause and resume timer", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
    });

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("work");
    });

    // Pause
    act(() => {
      result.current.pause();
    });

    expect(result.current.paused).toBe(true);

    // Resume
    act(() => {
      result.current.resume();
    });

    expect(result.current.paused).toBe(false);
  });

  it("should reset timer to idle state", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
    });

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("work");
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
      expect(result.current.sessionId).toBeNull();
    });
  });

  it("should handle preset changes when idle", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
    });

    const initialPreset = result.current.preset;

    // Change preset
    act(() => {
      result.current.setPreset("long");
    });

    await waitFor(() => {
      expect(result.current.preset).toBe("long");
      expect(result.current.preset).not.toBe(initialPreset);
    });
  });

  it("should not allow preset change during active timer", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
    });

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("work");
    });

    const currentPreset = result.current.preset;

    // Try to change preset (should be ignored)
    act(() => {
      result.current.setPreset("long");
    });

    expect(result.current.preset).toBe(currentPreset);
  });

  it("should persist timer state to localStorage on change", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
    });

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("work");
    });

    // Verify save_timer_runtime was called
    const { invokeQuiet } = await import("../../lib/tauri");
    expect(invokeQuiet).toHaveBeenCalledWith(
      "save_timer_runtime",
      expect.objectContaining({
        runtime: expect.objectContaining({
          phase: "work",
          sessionId: "session-123",
        }),
      }),
    );
  });

  it("should increment sessions completed after work phase", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const initialCount = result.current.sessionsCompleted;

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe("work");

    // Simulate timer completion (advance by full duration)
    const duration = result.current.totalSeconds * 1000;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(duration);
    });

    // After work phase completes, should transition to celebrating
    expect(result.current.phase).toBe("celebrating");
    expect(result.current.sessionsCompleted).toBe(initialCount + 1);

    vi.useRealTimers();
  });

  it("should transition from celebrating to break phase after 3 seconds", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Manually set to celebrating phase for this test
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe("work");

    // Fast forward to completion
    const duration = result.current.totalSeconds * 1000;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(duration);
    });

    // Should be in celebrating
    expect(result.current.phase).toBe("celebrating");

    // Advance 3 seconds more
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Should transition to break
    expect(result.current.phase).toBe("break");

    vi.useRealTimers();
  });

  it("should track total sessions completed", async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.phase).toBe("idle");
    });

    expect(result.current.sessionsCompleted).toBe(0);
  });

  it("should call complete_pomodoro when work phase ends", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Start timer
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe("work");

    const sessionId = result.current.sessionId;

    // Simulate timer completion
    const duration = result.current.totalSeconds * 1000;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(duration);
    });

    // Verify complete_pomodoro was called
    const { invokeMaybe } = await import("../../lib/tauri");
    expect(invokeMaybe).toHaveBeenCalledWith("complete_pomodoro", {
      sessionId,
    });

    vi.useRealTimers();
  });

  it("does not overwrite runtime when hydration fails", async () => {
    const { invokeMaybe, invokeQuiet } = await import("../../lib/tauri");
    vi.mocked(invokeMaybe).mockResolvedValueOnce(null as never);
    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.phase).toBe("idle");
    expect(invokeQuiet).not.toHaveBeenCalledWith(
      "save_timer_runtime",
      expect.anything(),
    );
  });

  it("waits for delayed runtime hydration before saving", async () => {
    const { invokeMaybe, invokeQuiet } = await import("../../lib/tauri");
    let resolveRuntime: (value: unknown) => void = () => {};
    vi.mocked(invokeMaybe).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRuntime = resolve;
      }) as never,
    );
    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await Promise.resolve();
    });
    expect(invokeQuiet).not.toHaveBeenCalledWith(
      "save_timer_runtime",
      expect.anything(),
    );
    resolveRuntime({
      phase: "idle",
      secondsLeft: 1_500,
      totalSeconds: 1_500,
      paused: false,
      sessionId: null,
      sessionsCompleted: 0,
      preset: "standard",
      lastUpdatedAt: new Date().toISOString(),
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.phase).toBe("idle");
    expect(invokeQuiet).toHaveBeenCalledWith(
      "save_timer_runtime",
      expect.anything(),
    );
  });

  it("counts down by elapsed time across a wall-clock jump", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      vi.setSystemTime(Date.now() + 4_000);
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.secondsLeft).toBe(result.current.totalSeconds - 5);
  });

  it("hydrates active timer state under Strict Mode", async () => {
    const { result } = renderHook(() => usePomodoro(), {
      reactStrictMode: true,
    });
    await waitFor(() => expect(result.current.phase).toBe("idle"));
    expect(result.current.preset).toBe("standard");
  });

  it("recovers an active timer from its saved timestamp", async () => {
    vi.useFakeTimers();
    const { invokeMaybe } = await import("../../lib/tauri");
    const now = Date.now();
    vi.setSystemTime(now);
    vi.mocked(invokeMaybe).mockResolvedValueOnce({
      phase: "work",
      secondsLeft: 100,
      totalSeconds: 1_500,
      paused: false,
      sessionId: "recovered-session",
      sessionsCompleted: 2,
      preset: "standard",
      lastUpdatedAt: new Date(now - 10_000).toISOString(),
    } as never);
    const { result } = renderHook(() => usePomodoro());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.phase).toBe("work");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.secondsLeft).toBe(89);
  });
});
