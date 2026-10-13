import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoinDisplay } from "../CoinDisplay";

describe("CoinDisplay", () => {
  it("displays coin balance", () => {
    render(
      <CoinDisplay
        available={50}
        stageName="Blob"
        progressToNext={0.5}
        stageProgress={2}
        stageSpan={5}
      />,
    );
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("displays stage name", () => {
    render(
      <CoinDisplay
        available={50}
        stageName="Buddy"
        progressToNext={0.3}
        stageProgress={3}
        stageSpan={10}
      />,
    );
    expect(screen.getByText("Buddy")).toBeInTheDocument();
  });

  it("shows evolution progress fraction", () => {
    const { container } = render(
      <CoinDisplay
        available={50}
        stageName="Blob"
        progressToNext={0.4}
        stageProgress={2}
        stageSpan={5}
      />,
    );
    // {stageProgress}/{stageSpan} renders as separate text nodes — check via textContent
    const spans = container.querySelectorAll("span");
    const found = Array.from(spans).some(
      (s) => s.textContent?.replace(/\s/g, "") === "2/5",
    );
    expect(found).toBe(true);
  });

  it("shows max evolution message when stageSpan is 0", () => {
    render(
      <CoinDisplay
        available={50}
        stageName="Champion"
        progressToNext={1}
        stageProgress={0}
        stageSpan={0}
      />,
    );
    expect(screen.getByText("Max evolution reached!")).toBeInTheDocument();
  });

  it("shows evolution progress label when not maxed", () => {
    render(
      <CoinDisplay
        available={50}
        stageName="Blob"
        progressToNext={0.5}
        stageProgress={2}
        stageSpan={5}
      />,
    );
    expect(screen.getByText("Evolution progress")).toBeInTheDocument();
  });
});
