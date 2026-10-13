import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

// The inner fill bar has an inline `style` attribute; the outer track does not.
function getBar(container: HTMLElement): HTMLElement {
  return container.querySelector("[style]") as HTMLElement;
}

describe("ProgressBar", () => {
  it("renders with default props", () => {
    const { container } = render(<ProgressBar value={0.5} />);
    const bar = getBar(container);
    expect(bar).toBeInTheDocument();
    expect(bar.style.width).toBe("50%");
  });

  it("renders 0% when value is 0", () => {
    const { container } = render(<ProgressBar value={0} />);
    expect(getBar(container).style.width).toBe("0%");
  });

  it("caps at 100% when value exceeds max", () => {
    const { container } = render(<ProgressBar value={2} max={1} />);
    expect(getBar(container).style.width).toBe("100%");
  });

  it("calculates percentage from value/max", () => {
    const { container } = render(<ProgressBar value={3} max={4} />);
    expect(getBar(container).style.width).toBe("75%");
  });

  it("handles max=0 without division error", () => {
    const { container } = render(<ProgressBar value={5} max={0} />);
    expect(getBar(container).style.width).toBe("0%");
  });

  it("applies custom color class", () => {
    const { container } = render(
      <ProgressBar value={0.5} color="bg-green-500" />,
    );
    expect(getBar(container).className).toContain("bg-green-500");
  });

  it("applies custom className to outer container", () => {
    const { container } = render(<ProgressBar value={0.5} className="mt-4" />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("mt-4");
  });
});
