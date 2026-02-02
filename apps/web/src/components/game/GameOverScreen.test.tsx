import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameOverScreen, GameOverScreenProps } from "./GameOverScreen";

const defaultProps: GameOverScreenProps = {
  isOpen: true,
  survivalTime: 185, // 3:05
  enemiesKilled: 42,
  levelReached: 5,
  totalXP: 1250,
  onPlayAgain: vi.fn(),
  onShare: vi.fn(),
  onQuit: vi.fn(),
};

describe("GameOverScreen", () => {
  describe("rendering", () => {
    it("renders when open", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByText("Game Over")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<GameOverScreen {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Game Over")).not.toBeInTheDocument();
    });

    it("displays survival time formatted as mm:ss", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByText("3:05")).toBeInTheDocument();
    });

    it("displays enemies killed", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("displays level reached", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("displays total XP", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByText("1,250")).toBeInTheDocument();
    });

    it("renders Play Again button", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByRole("button", { name: /play again/i })).toBeInTheDocument();
    });

    it("renders Share button", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
    });

    it("renders Quit button", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByRole("button", { name: /quit/i })).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onPlayAgain when Play Again button is clicked", () => {
      const onPlayAgain = vi.fn();
      render(<GameOverScreen {...defaultProps} onPlayAgain={onPlayAgain} />);

      fireEvent.click(screen.getByRole("button", { name: /play again/i }));

      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });

    it("calls onShare when Share button is clicked", () => {
      const onShare = vi.fn();
      render(<GameOverScreen {...defaultProps} onShare={onShare} />);

      fireEvent.click(screen.getByRole("button", { name: /share/i }));

      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it("calls onQuit when Quit button is clicked", () => {
      const onQuit = vi.fn();
      render(<GameOverScreen {...defaultProps} onQuit={onQuit} />);

      fireEvent.click(screen.getByRole("button", { name: /quit/i }));

      expect(onQuit).toHaveBeenCalledTimes(1);
    });
  });

  describe("time formatting", () => {
    it("formats time under a minute correctly", () => {
      render(<GameOverScreen {...defaultProps} survivalTime={45} />);

      expect(screen.getByText("0:45")).toBeInTheDocument();
    });

    it("formats time over an hour correctly", () => {
      render(<GameOverScreen {...defaultProps} survivalTime={3665} />);

      expect(screen.getByText("61:05")).toBeInTheDocument();
    });

    it("pads seconds with zero when needed", () => {
      render(<GameOverScreen {...defaultProps} survivalTime={62} />);

      expect(screen.getByText("1:02")).toBeInTheDocument();
    });
  });

  describe("number formatting", () => {
    it("formats large XP numbers with commas", () => {
      render(<GameOverScreen {...defaultProps} totalXP={12500} />);

      expect(screen.getByText("12,500")).toBeInTheDocument();
    });

    it("formats very large numbers correctly", () => {
      render(<GameOverScreen {...defaultProps} totalXP={1234567} />);

      expect(screen.getByText("1,234,567")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper dialog role", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has proper aria-modal attribute", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has accessible label", () => {
      render(<GameOverScreen {...defaultProps} />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Game Over");
    });
  });
});
