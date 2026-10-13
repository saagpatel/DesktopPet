import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PetCharacter } from "../PetCharacter";

describe("PetCharacter", () => {
  it("renders species stage sprite for stage 0", () => {
    const { container } = render(
      <PetCharacter stage={0} accessories={[]} speciesId="penguin" />,
    );
    const image = container.querySelector("img");
    expect(image).toBeInTheDocument();
    expect(image?.getAttribute("alt")).toContain("Penguin stage 1");
  });

  it("renders stage 2 sprite for stage 1", () => {
    const { container } = render(
      <PetCharacter stage={1} accessories={[]} speciesId="cat" />,
    );
    const image = container.querySelector("img");
    expect(image?.getAttribute("alt")).toContain("Cat stage 2");
  });

  it("clamps stage above max", () => {
    const { container } = render(
      <PetCharacter stage={99} accessories={[]} speciesId="corgi" />,
    );
    const image = container.querySelector("img");
    expect(image?.getAttribute("alt")).toContain("Corgi stage 3");
  });

  it("falls back to default species for unknown species id", () => {
    const { container } = render(
      <PetCharacter stage={0} accessories={[]} speciesId="unknown" />,
    );
    const image = container.querySelector("img");
    expect(image?.getAttribute("alt")).toContain("Penguin stage 1");
  });

  it("renders accessory overlays", () => {
    const { container } = render(
      <PetCharacter
        stage={0}
        accessories={["party_hat"]}
        speciesId="axolotl"
      />,
    );
    expect(container.textContent).toContain("🎉");
  });

  it("accepts composed species motion classes", () => {
    const { container } = render(
      <PetCharacter
        stage={0}
        accessories={[]}
        speciesId="penguin"
        speciesMotionClass="species-float"
      />,
    );
    const image = container.querySelector("img");
    expect(image?.className).toContain("species-float");
  });
});
