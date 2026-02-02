import { useEffect, useCallback } from "react";

/**
 * PauseMenu - Overlay shown when game is paused
 *
 * Features:
 * - Resume and Quit buttons
 * - Click outside to resume
 * - ESC key to resume
 * - Accessible dialog
 */
export interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onQuit: () => void;
}

export function PauseMenu({ isOpen, onResume, onQuit }: PauseMenuProps) {
  // Handle ESC key to resume
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onResume();
      }
    },
    [isOpen, onResume]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only trigger if clicking the backdrop itself, not children
    if (e.target === e.currentTarget) {
      onResume();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pause Menu"
      data-testid="pause-backdrop"
      className="absolute inset-0 flex items-center justify-center bg-black/80 z-50"
      onClick={handleBackdropClick}
    >
      <div
        data-testid="pause-content"
        className="bg-gray-900/95 rounded-2xl border border-gray-700 p-8 min-w-[300px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-3xl font-bold text-white text-center mb-8">Paused</h2>

        {/* Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={onResume}
            className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            Resume
          </button>
          <button
            onClick={onQuit}
            className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Quit
          </button>
        </div>

        {/* Hint */}
        <p className="text-gray-500 text-sm text-center mt-6">
          Press ESC or click outside to resume
        </p>
      </div>
    </div>
  );
}
