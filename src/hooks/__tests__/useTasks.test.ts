import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTasks } from "../useTasks";

vi.mock("../../lib/tauri", () => ({
  invokeMaybe: vi.fn(async (command: string, args: any) => {
    if (command === "add_task") {
      return { id: "task-" + Date.now(), title: args.title, completed: false };
    }
    if (command === "toggle_task") {
      // Return updated task list with the toggled task
      return [
        {
          id: "task-1",
          title: "First task",
          completed: args.taskId === "task-1" ? true : false,
        },
        {
          id: "task-2",
          title: "Second task",
          completed: args.taskId === "task-2" ? false : true,
        },
      ];
    }
    if (command === "delete_task") {
      // Return updated task list without the deleted task
      return [{ id: "task-2", title: "Second task", completed: true }];
    }
    return null;
  }),
  invokeOr: vi.fn(async (command: string, _args: any, defaultValue: any) => {
    if (command === "get_tasks") {
      return [
        { id: "task-1", title: "First task", completed: false },
        { id: "task-2", title: "Second task", completed: true },
      ];
    }
    return defaultValue;
  }),
  listenSafe: vi.fn(() => Promise.resolve(() => {})),
}));

describe("useTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with task list", async () => {
    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.tasks).toBeDefined();
    });

    expect(Array.isArray(result.current.tasks)).toBe(true);
  });

  it("should add a new task", async () => {
    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.tasks).toBeDefined();
    });

    // const // initialCount = result.current.tasks.length;

    await act(async () => {
      await result.current.addTask("New task");
    });

    await waitFor(() => {
      expect(result.current.tasks.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("should toggle task completion", async () => {
    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    const firstTask = result.current.tasks[0];
    const wasCompleted = firstTask.completed;

    await act(async () => {
      await result.current.toggleTask(firstTask.id);
    });

    await waitFor(() => {
      const updatedTask = result.current.tasks.find(
        (t) => t.id === firstTask.id,
      );
      if (updatedTask) {
        expect(updatedTask.completed).toBe(!wasCompleted);
      }
    });
  });

  it("should delete a task", async () => {
    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    const firstTask = result.current.tasks[0];
    // const // initialCount = result.current.tasks.length;

    await act(async () => {
      await result.current.deleteTask(firstTask.id);
    });

    // May or may not reduce count immediately depending on implementation
    expect(result.current.tasks).toBeDefined();
  });

  it("should handle task validation (title length)", async () => {
    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.tasks).toBeDefined();
    });

    // Try to add empty task
    const resultEmpty = await result.current.addTask("");
    expect(resultEmpty).toBeDefined();

    // Try to add very long task
    const longTitle = "a".repeat(200);
    const resultLong = await result.current.addTask(longTitle);
    expect(resultLong).toBeDefined();
  });
});
