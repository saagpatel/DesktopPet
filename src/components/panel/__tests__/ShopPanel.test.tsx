import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShopPanel } from "../ShopPanel";
import { invoke } from "@tauri-apps/api/core";
import { SHOP_ITEMS } from "../../../lib/constants";
import { getAccessoryBehaviorProfile } from "../../../pets/accessoryBehavior";

vi.mocked(invoke).mockResolvedValue(undefined);

describe("ShopPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all shop items", () => {
    render(<ShopPanel available={100} ownedAccessories={[]} />);
    for (const item of SHOP_ITEMS) {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    }
  });

  it("displays user balance", () => {
    const { container } = render(
      <ShopPanel available={42} ownedAccessories={[]} />,
    );
    // Balance is shown via CoinBadge — look for it in the balance section
    const balanceSection = container.querySelector(
      ".flex.items-center.justify-between",
    );
    expect(balanceSection?.textContent).toContain("42");
  });

  it("shows 'Owned' for purchased accessories", () => {
    render(<ShopPanel available={100} ownedAccessories={["party_hat"]} />);
    expect(screen.getByText("Owned")).toBeInTheDocument();
  });

  it("shows Buy buttons for unowned items", () => {
    render(<ShopPanel available={100} ownedAccessories={[]} />);
    const buyButtons = screen.getAllByRole("button", { name: "Buy" });
    expect(buyButtons.length).toBe(SHOP_ITEMS.length);
  });

  it("disables Buy button when insufficient coins", () => {
    render(<ShopPanel available={0} ownedAccessories={[]} />);
    const buyButtons = screen.getAllByRole("button", { name: "Buy" });
    for (const btn of buyButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it("enables Buy button when sufficient coins", () => {
    // Apple costs 5
    render(<ShopPanel available={5} ownedAccessories={[]} />);
    const buyButtons = screen.getAllByRole("button", { name: "Buy" });
    const enabledButtons = buyButtons.filter(
      (btn) => !btn.hasAttribute("disabled"),
    );
    expect(enabledButtons.length).toBeGreaterThan(0);
  });

  it("calls invoke purchase_item on Buy click", async () => {
    const user = userEvent.setup();
    render(<ShopPanel available={100} ownedAccessories={[]} />);

    const buyButtons = screen.getAllByRole("button", { name: "Buy" });
    await user.click(buyButtons[0]);

    expect(invoke).toHaveBeenCalledWith("purchase_item", {
      itemId: SHOP_ITEMS[0].id,
    });
  });

  it("renders item icons", () => {
    render(<ShopPanel available={100} ownedAccessories={[]} />);
    for (const item of SHOP_ITEMS) {
      expect(screen.getByText(item.icon)).toBeInTheDocument();
    }
  });

  it("shows accessory behavior hints", () => {
    render(<ShopPanel available={100} ownedAccessories={[]} />);
    for (const item of SHOP_ITEMS) {
      expect(
        screen.getByText(getAccessoryBehaviorProfile(item.id).shopHint),
      ).toBeInTheDocument();
    }
  });
});
