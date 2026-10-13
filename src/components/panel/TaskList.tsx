import { useState } from "react";
import type { Task } from "../../store/types";

interface Props {
  tasks: Task[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ tasks, onAdd, onToggle, onDelete }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;
    onAdd(title);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--border-color)",
            backgroundColor: "var(--card-bg)",
            color: "var(--text-color)",
            boxShadow: "0 0 0 0 transparent",
          }}
        />
        <button
          type="submit"
          className="px-3 py-2 text-white text-sm rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--accent-color)" }}
        >
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p
          className="text-sm text-center py-4"
          style={{ color: "var(--muted-color)" }}
        >
          No tasks yet
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 p-2 rounded-lg border"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <button
                onClick={() => onToggle(task.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  task.completed
                    ? "bg-green-500 border-green-500 text-white"
                    : "hover:opacity-90"
                }`}
                style={
                  !task.completed
                    ? { borderColor: "var(--border-color)" }
                    : undefined
                }
              >
                {task.completed && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${task.completed ? "line-through" : ""}`}
                style={{
                  color: task.completed
                    ? "var(--muted-color)"
                    : "var(--text-color)",
                }}
              >
                {task.title}
              </span>
              <button
                onClick={() => onDelete(task.id)}
                className="transition-opacity hover:opacity-90"
                style={{ color: "var(--muted-color)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 3L11 11M11 3L3 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
