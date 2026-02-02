import { useMemo } from "react";
import type { Upgrade } from "../../game";

/**
 * Aggregated upgrade with count for display
 */
interface AggregatedUpgrade {
  upgrade: Upgrade;
  count: number;
}

/**
 * Aggregate upgrades by ID, counting duplicates
 */
function aggregateUpgrades(upgrades: Upgrade[]): AggregatedUpgrade[] {
  const map = new Map<string, AggregatedUpgrade>();

  for (const upgrade of upgrades) {
    const existing = map.get(upgrade.id);
    if (existing) {
      existing.count++;
    } else {
      map.set(upgrade.id, { upgrade, count: 1 });
    }
  }

  return Array.from(map.values());
}

/**
 * PauseMenu - Overlay shown when game is paused
 *
 * Features:
 * - Resume and Quit buttons
 * - Click outside to resume
 * - ESC key handled by GamePage
 * - Accessible dialog
 * - Display current session upgrades (aggregated by type)
 */
export interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onQuit: () => void;
  /** Upgrades applied during this session */
  upgrades?: Upgrade[];
}

export function PauseMenu({ isOpen, onResume, onQuit, upgrades = [] }: PauseMenuProps) {
  // Aggregate duplicate upgrades
  const aggregatedUpgrades = useMemo(() => aggregateUpgrades(upgrades), [upgrades]);
  // Note: ESC key handling is done in GamePage to avoid duplicate handlers

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

        {/* Current Upgrades */}
        {upgrades.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 mb-3">Current Upgrades</h3>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {aggregatedUpgrades.map(({ upgrade, count }) => (
                <div
                  key={upgrade.id}
                  className="bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-600"
                  title={upgrade.description}
                >
                  <span className="text-sm text-white">
                    {upgrade.name}
                    {count > 1 && <span className="text-primary-400 ml-1 font-bold">+{count}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hint */}
        <p className="text-gray-500 text-sm text-center mt-6">
          Press ESC or click outside to resume
        </p>
      </div>
    </div>
  );
}
