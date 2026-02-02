import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameHUD, GameHUDProps } from "./GameHUD";

const defaultProps: GameHUDProps = {
  health: { current: 80, max: 100 },
  level: 3,
  xpProgress: 65,
  currentXP: 65,
  xpToNextLevel: 100,
  survivalTime: 125,
  enemiesKilled: 42,
  totalXP: 350,
};

describe("GameHUD", () => {
  describe("rendering", () => {
    it("renders health bar", () => {
      render(<GameHUD {...defaultProps} />);

      expect(screen.getByText("HP")).toBeInTheDocument();
      expect(screen.getByText("80/100")).toBeInTheDocument();
    });

    it("renders XP bar with progress", () => {
      render(<GameHUD {...defaultProps} />);

      expect(screen.getByText("XP")).toBeInTheDocument();
      expect(screen.getByText("65/100")).toBeInTheDocument();
    });

    it("renders player level", () => {
      render(<GameHUD {...defaultProps} />);

      expect(screen.getByText("Lv.3")).toBeInTheDocument();
    });

    it("renders survival time formatted as mm:ss", () => {
      render(<GameHUD {...defaultProps} />);

      // 125 seconds = 2:05
      expect(screen.getByText("2:05")).toBeInTheDocument();
    });

    it("renders enemies killed count", () => {
      render(<GameHUD {...defaultProps} />);

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders total XP collected", () => {
      render(<GameHUD {...defaultProps} />);

      expect(screen.getByText("350")).toBeInTheDocument();
    });
  });

  describe("health bar", () => {
    it("shows correct health percentage width", () => {
      render(<GameHUD {...defaultProps} />);

      const healthBar = screen.getByTestId("health-bar-fill");
      expect(healthBar).toHaveStyle({ width: "80%" });
    });

    it("shows green color when health is high", () => {
      render(<GameHUD {...defaultProps} health={{ current: 80, max: 100 }} />);

      const healthBar = screen.getByTestId("health-bar-fill");
      expect(healthBar).toHaveClass("bg-green-500");
    });

    it("shows yellow color when health is medium", () => {
      render(<GameHUD {...defaultProps} health={{ current: 40, max: 100 }} />);

      const healthBar = screen.getByTestId("health-bar-fill");
      expect(healthBar).toHaveClass("bg-yellow-500");
    });

    it("shows red color when health is low", () => {
      render(<GameHUD {...defaultProps} health={{ current: 20, max: 100 }} />);

      const healthBar = screen.getByTestId("health-bar-fill");
      expect(healthBar).toHaveClass("bg-red-500");
    });
  });

  describe("XP bar", () => {
    it("shows correct XP percentage width", () => {
      render(<GameHUD {...defaultProps} />);

      const xpBar = screen.getByTestId("xp-bar-fill");
      expect(xpBar).toHaveStyle({ width: "65%" });
    });
  });

  describe("time formatting", () => {
    it("formats time under a minute correctly", () => {
      render(<GameHUD {...defaultProps} survivalTime={45} />);

      expect(screen.getByText("0:45")).toBeInTheDocument();
    });

    it("formats time over an hour correctly", () => {
      render(<GameHUD {...defaultProps} survivalTime={3665} />);

      // 3665 seconds = 61:05
      expect(screen.getByText("61:05")).toBeInTheDocument();
    });

    it("pads seconds with zero when needed", () => {
      render(<GameHUD {...defaultProps} survivalTime={62} />);

      expect(screen.getByText("1:02")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles zero health", () => {
      render(<GameHUD {...defaultProps} health={{ current: 0, max: 100 }} />);

      expect(screen.getByText("0/100")).toBeInTheDocument();
      const healthBar = screen.getByTestId("health-bar-fill");
      expect(healthBar).toHaveStyle({ width: "0%" });
    });

    it("handles level 1 at start", () => {
      render(<GameHUD {...defaultProps} level={1} xpProgress={0} currentXP={0} />);

      expect(screen.getByText("Lv.1")).toBeInTheDocument();
      expect(screen.getByText("0/100")).toBeInTheDocument();
    });

    it("handles high level numbers", () => {
      render(<GameHUD {...defaultProps} level={99} />);

      expect(screen.getByText("Lv.99")).toBeInTheDocument();
    });
  });

  describe("pause button", () => {
    it("renders pause button when onPause is provided", () => {
      const onPause = vi.fn();
      render(<GameHUD {...defaultProps} onPause={onPause} />);

      expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    });

    it("does not render pause button when onPause is not provided", () => {
      render(<GameHUD {...defaultProps} />);

      expect(screen.queryByRole("button", { name: /pause/i })).not.toBeInTheDocument();
    });

    it("calls onPause when pause button is clicked", () => {
      const onPause = vi.fn();
      render(<GameHUD {...defaultProps} onPause={onPause} />);

      fireEvent.click(screen.getByRole("button", { name: /pause/i }));

      expect(onPause).toHaveBeenCalledTimes(1);
    });
  });
});
