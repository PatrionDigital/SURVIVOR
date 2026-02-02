import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PauseMenu, PauseMenuProps } from "./PauseMenu";

const defaultProps: PauseMenuProps = {
  isOpen: true,
  onResume: vi.fn(),
  onQuit: vi.fn(),
};

describe("PauseMenu", () => {
  describe("rendering", () => {
    it("renders when open", () => {
      render(<PauseMenu {...defaultProps} />);

      expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(<PauseMenu {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Paused")).not.toBeInTheDocument();
    });

    it("renders Resume button", () => {
      render(<PauseMenu {...defaultProps} />);

      expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    });

    it("renders Quit button", () => {
      render(<PauseMenu {...defaultProps} />);

      expect(screen.getByRole("button", { name: /quit/i })).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onResume when Resume button is clicked", () => {
      const onResume = vi.fn();
      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      fireEvent.click(screen.getByRole("button", { name: /resume/i }));

      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it("calls onQuit when Quit button is clicked", () => {
      const onQuit = vi.fn();
      render(<PauseMenu {...defaultProps} onQuit={onQuit} />);

      fireEvent.click(screen.getByRole("button", { name: /quit/i }));

      expect(onQuit).toHaveBeenCalledTimes(1);
    });

    it("calls onResume when clicking the backdrop", () => {
      const onResume = vi.fn();
      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      fireEvent.click(screen.getByTestId("pause-backdrop"));

      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it("does not call onResume when clicking the menu content", () => {
      const onResume = vi.fn();
      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      fireEvent.click(screen.getByTestId("pause-content"));

      expect(onResume).not.toHaveBeenCalled();
    });
  });

  describe("keyboard navigation", () => {
    it("calls onResume when Escape key is pressed", () => {
      const onResume = vi.fn();
      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it("does not call onResume when other keys are pressed", () => {
      const onResume = vi.fn();
      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      fireEvent.keyDown(document, { key: "Enter" });

      expect(onResume).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has proper dialog role", () => {
      render(<PauseMenu {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has proper aria-modal attribute", () => {
      render(<PauseMenu {...defaultProps} />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has accessible label", () => {
      render(<PauseMenu {...defaultProps} />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Pause Menu");
    });
  });
});
