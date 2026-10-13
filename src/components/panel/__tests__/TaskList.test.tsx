import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskList } from "../TaskList";
import type { Task } from "../../../store/types";

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Write tests",
    completed: false,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    title: "Fix bug",
    completed: true,
    createdAt: "2025-01-01T01:00:00Z",
  },
];

const defaultProps = {
  tasks: mockTasks,
  onAdd: vi.fn(),
  onToggle: vi.fn(),
  onDelete: vi.fn(),
};

describe("TaskList", () => {
  it("renders all tasks", () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.getByText("Fix bug")).toBeInTheDocument();
  });

  it("shows 'No tasks yet' when empty", () => {
    render(<TaskList {...defaultProps} tasks={[]} />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("applies line-through to completed tasks", () => {
    render(<TaskList {...defaultProps} />);
    const completedTask = screen.getByText("Fix bug");
    expect(completedTask.className).toContain("line-through");
  });

  it("does not apply line-through to incomplete tasks", () => {
    render(<TaskList {...defaultProps} />);
    const incompleteTask = screen.getByText("Write tests");
    expect(incompleteTask.className).not.toContain("line-through");
  });

  it("renders input field and Add button", () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByPlaceholderText("Add a task...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("calls onAdd when submitting a task", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TaskList {...defaultProps} onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("Add a task...");
    await user.type(input, "New task");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith("New task");
  });

  it("clears input after adding a task", async () => {
    const user = userEvent.setup();
    render(<TaskList {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      "Add a task...",
    ) as HTMLInputElement;
    await user.type(input, "New task");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(input.value).toBe("");
  });

  it("does not call onAdd with empty input", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TaskList {...defaultProps} onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("does not call onAdd with whitespace-only input", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TaskList {...defaultProps} onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("Add a task...");
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("submits on Enter key", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TaskList {...defaultProps} onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("Add a task...");
    await user.type(input, "Enter task{Enter}");

    expect(onAdd).toHaveBeenCalledWith("Enter task");
  });
});
