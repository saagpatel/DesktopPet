import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePetEvents } from "../usePetEvents";

const { mockInvokeMaybe, mockInvokeOr, mockListenSafe } = vi.hoisted(() => ({
  mockInvokeMaybe: vi.fn(),
  mockInvokeOr: vi.fn(),
  mockListenSafe: vi.fn(),
}));

vi.mock("../../lib/tauri", () => ({
  invokeMaybe: mockInvokeMaybe,
  invokeOr: mockInvokeOr,
  listenSafe: mockListenSafe,
}));

describe("usePetEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockInvokeOr.mockImplementation(
      async (command: string, _args: unknown, fallback: unknown) => {
        if (command === "get_pet_events") {
          return [];
        }
        if (command === "get_pet_active_quest") {
          return {
            id: "quest-1",
            kind: "focus_sessions",
            title: "Take one focus lap",
            description: "Complete one focus session.",
            targetSessions: 1,
            completedSessions: 0,
            rewardCoins: 12,
            createdAt: new Date().toISOString(),
          };
        }
        return fallback;
      },
    );

    mockInvokeMaybe.mockResolvedValue({
      id: "event-1",
      kind: "need",
      description: "Your pet looks peckish. A snack would help.",
      createdAt: new Date().toISOString(),
      resolved: false,
    });

    mockListenSafe.mockResolvedValue(() => {});
  });

  it("keeps async state updates alive under StrictMode", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children);
    const { result } = renderHook(() => usePetEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeQuest?.title).toBe("Take one focus lap");
    });

    await act(async () => {
      await result.current.rollEvent();
    });

    await waitFor(() => {
      expect(result.current.rollFeedback?.description).toContain(
        "snack would help",
      );
    });
  });
});
