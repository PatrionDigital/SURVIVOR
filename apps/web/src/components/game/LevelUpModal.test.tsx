import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LevelUpModal } from "./LevelUpModal";
import type { Upgrade } from "@/game/leveling";

const mockUpgrades: Upgrade[] = [
  {
    id: "damage-1",
    name: "Sharp Bullets",
    description: "+5 Damage",
    type: "damage",
    value: 5,
  },
  {
    id: "attackSpeed-1",
    name: "Quick Trigger",
    description: "+10% Attack Speed",
    type: "attackSpeed",
    value: 0.1,
  },
  {
    id: "maxHealth-1",
    name: "Vitality",
    description: "+25 Max Health",
    type: "maxHealth",
    value: 25,
  },
];

describe("LevelUpModal", () => {
  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(
        <LevelUpModal isOpen={false} level={2} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      render(
        <LevelUpModal isOpen={true} level={2} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should display the current level", () => {
      render(
        <LevelUpModal isOpen={true} level={5} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      expect(screen.getByText(/Level 5/)).toBeInTheDocument();
    });

    it("should display all upgrade choices", () => {
      render(
        <LevelUpModal isOpen={true} level={2} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      expect(screen.getByText("Sharp Bullets")).toBeInTheDocument();
      expect(screen.getByText("Quick Trigger")).toBeInTheDocument();
      expect(screen.getByText("Vitality")).toBeInTheDocument();
    });

    it("should display upgrade descriptions", () => {
      render(
        <LevelUpModal isOpen={true} level={2} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      expect(screen.getByText("+5 Damage")).toBeInTheDocument();
      expect(screen.getByText("+10% Attack Speed")).toBeInTheDocument();
      expect(screen.getByText("+25 Max Health")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("should call onSelectUpgrade when clicking an upgrade", () => {
      const onSelectUpgrade = vi.fn();
      render(
        <LevelUpModal
          isOpen={true}
          level={2}
          choices={mockUpgrades}
          onSelectUpgrade={onSelectUpgrade}
        />
      );

      fireEvent.click(screen.getByText("Sharp Bullets"));

      expect(onSelectUpgrade).toHaveBeenCalledWith(mockUpgrades[0]);
    });

    it("should call onSelectUpgrade with correct upgrade", () => {
      const onSelectUpgrade = vi.fn();
      render(
        <LevelUpModal
          isOpen={true}
          level={2}
          choices={mockUpgrades}
          onSelectUpgrade={onSelectUpgrade}
        />
      );

      fireEvent.click(screen.getByText("Vitality"));

      expect(onSelectUpgrade).toHaveBeenCalledWith(mockUpgrades[2]);
    });

    it("should support keyboard selection with Enter", () => {
      const onSelectUpgrade = vi.fn();
      render(
        <LevelUpModal
          isOpen={true}
          level={2}
          choices={mockUpgrades}
          onSelectUpgrade={onSelectUpgrade}
        />
      );

      const firstChoice = screen.getByText("Sharp Bullets").closest("button");
      fireEvent.keyDown(firstChoice!, { key: "Enter" });

      expect(onSelectUpgrade).toHaveBeenCalledWith(mockUpgrades[0]);
    });
  });

  describe("Accessibility", () => {
    it("should have accessible role", () => {
      render(
        <LevelUpModal isOpen={true} level={2} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have accessible heading", () => {
      render(
        <LevelUpModal isOpen={true} level={2} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      expect(screen.getByRole("heading")).toBeInTheDocument();
    });

    it("should have clickable buttons for each choice", () => {
      render(
        <LevelUpModal isOpen={true} level={2} choices={mockUpgrades} onSelectUpgrade={vi.fn()} />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(3);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty choices array", () => {
      render(<LevelUpModal isOpen={true} level={2} choices={[]} onSelectUpgrade={vi.fn()} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.queryAllByRole("button")).toHaveLength(0);
    });

    it("should handle single choice", () => {
      render(
        <LevelUpModal
          isOpen={true}
          level={2}
          choices={[mockUpgrades[0]]}
          onSelectUpgrade={vi.fn()}
        />
      );

      expect(screen.getAllByRole("button")).toHaveLength(1);
    });
  });
});
