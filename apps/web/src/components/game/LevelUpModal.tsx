import { useEffect, useCallback, useState, useRef } from "react";
import type { Upgrade } from "@/game/leveling";

export interface LevelUpModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Current player level */
  level: number;
  /** Upgrade choices to display */
  choices: Upgrade[];
  /** Callback when an upgrade is selected */
  onSelectUpgrade: (upgrade: Upgrade) => void;
}

/** Duration to show selection feedback before applying upgrade (ms) */
const SELECTION_FEEDBACK_DELAY = 150;

/**
 * Modal displayed when player levels up
 * Shows 3 upgrade choices for the player to select
 */
export function LevelUpModal({ isOpen, level, choices, onSelectUpgrade }: LevelUpModalProps) {
  // Track which option is currently selected (for visual feedback)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear selection state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(null);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // Handle selecting an upgrade with visual feedback
  const selectUpgrade = useCallback(
    (index: number) => {
      if (index < 0 || index >= choices.length || selectedIndex !== null) return;

      // Show selection feedback
      setSelectedIndex(index);

      // Apply upgrade after brief delay
      selectionTimeoutRef.current = setTimeout(() => {
        onSelectUpgrade(choices[index]);
        selectionTimeoutRef.current = null;
      }, SELECTION_FEEDBACK_DELAY);
    },
    [choices, onSelectUpgrade, selectedIndex]
  );

  // Handle global keyboard shortcuts (1, 2, 3) for quick selection
  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= choices.length) {
        selectUpgrade(keyNum - 1);
      }
    },
    [choices.length, selectUpgrade]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, handleGlobalKeyDown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "Enter") {
      selectUpgrade(index);
    }
  };

  const handleClick = (index: number) => {
    selectUpgrade(index);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
      className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
    >
      <div className="bg-gray-900 border border-primary-500 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl shadow-primary-500/20">
        <h2
          id="level-up-title"
          role="heading"
          className="text-2xl font-bold text-center text-primary-400 mb-2"
        >
          Level Up!
        </h2>
        <p className="text-center text-gray-300 mb-6">Level {level} - Choose an upgrade</p>

        <div className="space-y-3">
          {choices.map((upgrade, index) => {
            const isSelected = selectedIndex === index;
            return (
              <button
                key={upgrade.id}
                onClick={() => handleClick(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={selectedIndex !== null}
                className={`w-full p-4 border rounded-lg transition-all duration-150 text-left group ${
                  isSelected
                    ? "bg-primary-600 border-primary-400 scale-[1.02]"
                    : "bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-primary-500"
                } ${selectedIndex !== null && !isSelected ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded text-sm font-bold ${
                        isSelected
                          ? "bg-primary-400 text-gray-900"
                          : "bg-gray-700 text-gray-400 group-hover:bg-primary-500 group-hover:text-white"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`font-semibold transition-colors ${
                        isSelected ? "text-white" : "text-white group-hover:text-primary-400"
                      }`}
                    >
                      {upgrade.name}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-400">
                    {upgrade.type}
                  </span>
                </div>
                <p className={`text-sm mt-1 ml-9 ${isSelected ? "text-green-300" : "text-green-400"}`}>
                  {upgrade.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
