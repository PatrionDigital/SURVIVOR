import { useEffect, useCallback } from "react";
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

/**
 * Modal displayed when player levels up
 * Shows 3 upgrade choices for the player to select
 */
export function LevelUpModal({ isOpen, level, choices, onSelectUpgrade }: LevelUpModalProps) {
  // Handle global keyboard shortcuts (1, 2, 3) for quick selection
  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= choices.length) {
        onSelectUpgrade(choices[keyNum - 1]);
      }
    },
    [choices, onSelectUpgrade]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, handleGlobalKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, upgrade: Upgrade) => {
    if (e.key === "Enter") {
      onSelectUpgrade(upgrade);
    }
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
          {choices.map((upgrade) => (
            <button
              key={upgrade.id}
              onClick={() => onSelectUpgrade(upgrade)}
              onKeyDown={(e) => handleKeyDown(e, upgrade)}
              className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-500 rounded-lg transition-all duration-200 text-left group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                  {upgrade.name}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-400">
                  {upgrade.type}
                </span>
              </div>
              <p className="text-sm text-green-400 mt-1">{upgrade.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
