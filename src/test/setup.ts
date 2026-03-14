import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock Tauri APIs
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@tauri-apps/api/window", () => ({
  Window: {
    getByLabel: vi.fn(() => Promise.resolve(null)),
  },
  availableMonitors: vi.fn(() => Promise.resolve([])),
  PhysicalPosition: class PhysicalPosition {
    x: number;
    y: number;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  },
  getCurrentWindow: vi.fn(() => ({
    onMoved: vi.fn(() => Promise.resolve(() => {})),
    outerPosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
    outerSize: vi.fn(() => Promise.resolve({ width: 380, height: 380 })),
    setPosition: vi.fn(() => Promise.resolve()),
    show: vi.fn(() => Promise.resolve()),
    startDragging: vi.fn(),
  })),
}));
