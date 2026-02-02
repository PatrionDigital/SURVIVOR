/**
 * GameOverScreen - Shows results when player dies
 *
 * Displays:
 * - Survival time
 * - Enemies killed
 * - Level reached
 * - Total XP earned
 * - Play Again, Share, and Quit buttons
 */
export interface GameOverScreenProps {
  isOpen: boolean;
  survivalTime: number;
  enemiesKilled: number;
  levelReached: number;
  totalXP: number;
  onPlayAgain: () => void;
  onShare: () => void;
  onQuit: () => void;
}

/**
 * Format seconds as mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function GameOverScreen({
  isOpen,
  survivalTime,
  enemiesKilled,
  levelReached,
  totalXP,
  onPlayAgain,
  onShare,
  onQuit,
}: GameOverScreenProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Over"
      className="absolute inset-0 flex items-center justify-center bg-black/90 z-50"
    >
      <div className="bg-gray-900/95 rounded-2xl border border-gray-700 p-8 min-w-[350px] max-w-[450px] shadow-2xl">
        {/* Title */}
        <h2 className="text-4xl font-bold text-red-500 text-center mb-8">Game Over</h2>

        {/* Stats */}
        <div className="space-y-4 mb-8">
          {/* Survival Time */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>⏱️</span> Survival Time
            </span>
            <span className="text-white font-mono text-xl">{formatTime(survivalTime)}</span>
          </div>

          {/* Enemies Killed */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>⚔️</span> Enemies Killed
            </span>
            <span className="text-yellow-400 font-mono text-xl">{enemiesKilled}</span>
          </div>

          {/* Level Reached */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>⭐</span> Level Reached
            </span>
            <span className="text-green-400 font-mono text-xl">{levelReached}</span>
          </div>

          {/* Total XP */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>✨</span> Total XP
            </span>
            <span className="text-cyan-400 font-mono text-xl">{formatNumber(totalXP)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            Play Again
          </button>
          <button
            onClick={onShare}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Share to Farcaster
          </button>
          <button
            onClick={onQuit}
            className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
