/**
 * GameHUD - Heads-up display during gameplay
 *
 * Displays:
 * - Health bar with color coding
 * - XP bar with progress
 * - Player level
 * - Survival time
 * - Enemies killed
 * - Total XP collected
 * - Pause button
 * - Wave/phase info
 * - Event warnings
 */
export interface GameHUDProps {
  health: { current: number; max: number };
  level: number;
  xpProgress: number;
  currentXP: number;
  xpToNextLevel: number;
  survivalTime: number;
  enemiesKilled: number;
  totalXP: number;
  /** Callback when pause button is clicked */
  onPause?: () => void;
  /** Current wave/phase name */
  phaseName?: string;
  /** Wave progress (0-100) */
  waveProgress?: number;
  /** Time remaining in seconds */
  timeRemaining?: number;
  /** Warning message to display */
  warning?: string;
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
 * Get health bar color based on health percentage
 */
function getHealthColor(percent: number): string {
  if (percent > 50) return "bg-green-500";
  if (percent > 25) return "bg-yellow-500";
  return "bg-red-500";
}

export function GameHUD({
  health,
  level,
  xpProgress,
  currentXP,
  xpToNextLevel,
  survivalTime,
  enemiesKilled,
  totalXP,
  onPause,
  phaseName,
  waveProgress,
  timeRemaining,
  warning,
}: GameHUDProps) {
  const healthPercent = health.max > 0 ? (health.current / health.max) * 100 : 0;
  const healthColor = getHealthColor(healthPercent);

  return (
    <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
      <div className="flex flex-col gap-2">
        {/* Top row: Health, Level, and Pause button */}
        <div className="flex items-center gap-4">
          {/* Health bar */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-xs font-bold text-red-400 w-6">HP</span>
            <div className="flex-1 h-4 bg-gray-800/80 rounded-full overflow-hidden border border-gray-600">
              <div
                data-testid="health-bar-fill"
                className={`h-full ${healthColor} transition-all duration-300`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-300 w-16 text-right">
              {health.current}/{health.max}
            </span>
          </div>

          {/* Level badge */}
          <div className="bg-primary-600/80 px-3 py-1 rounded-full border border-primary-400">
            <span className="text-sm font-bold text-white">Lv.{level}</span>
          </div>

          {/* Phase badge */}
          {phaseName && (
            <div className="bg-purple-600/80 px-3 py-1 rounded-full border border-purple-400">
              <span className="text-sm font-bold text-white">{phaseName}</span>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Time remaining */}
          {timeRemaining !== undefined && timeRemaining > 0 && (
            <div className="bg-gray-800/80 px-3 py-1 rounded-lg border border-gray-600">
              <span className="text-sm text-gray-300">{formatTime(timeRemaining)} left</span>
            </div>
          )}

          {/* Pause button */}
          {onPause && (
            <button
              onClick={onPause}
              className="pointer-events-auto bg-gray-800/80 hover:bg-gray-700 px-3 py-1 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
              title="Pause (ESC)"
            >
              <span className="text-sm text-gray-300 hover:text-white">⏸️ Pause</span>
            </button>
          )}
        </div>

        {/* Second row: XP bar */}
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-xs font-bold text-cyan-400 w-6">XP</span>
          <div className="flex-1 h-3 bg-gray-800/80 rounded-full overflow-hidden border border-gray-600">
            <div
              data-testid="xp-bar-fill"
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-300 w-16 text-right">
            {currentXP}/{xpToNextLevel}
          </span>
        </div>

        {/* Third row: Stats */}
        <div className="flex items-center gap-4 text-sm">
          {/* Timer */}
          <div className="flex items-center gap-1 bg-gray-800/60 px-2 py-1 rounded">
            <span className="text-gray-400">⏱️</span>
            <span className="text-white font-mono">{formatTime(survivalTime)}</span>
          </div>

          {/* Kills */}
          <div className="flex items-center gap-1 bg-gray-800/60 px-2 py-1 rounded">
            <span className="text-yellow-400">⚔️</span>
            <span className="text-white font-mono">{enemiesKilled}</span>
          </div>

          {/* Total XP */}
          <div className="flex items-center gap-1 bg-gray-800/60 px-2 py-1 rounded">
            <span className="text-cyan-400">✨</span>
            <span className="text-white font-mono">{totalXP}</span>
          </div>
        </div>

        {/* Wave progress bar (optional) */}
        {waveProgress !== undefined && (
          <div className="flex items-center gap-2 max-w-md">
            <span className="text-xs font-bold text-purple-400 w-12">Wave</span>
            <div className="flex-1 h-2 bg-gray-800/80 rounded-full overflow-hidden border border-gray-600">
              <div
                data-testid="wave-progress-fill"
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${waveProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-300 w-10 text-right">
              {Math.floor(waveProgress)}%
            </span>
          </div>
        )}

        {/* Warning banner */}
        {warning && (
          <div className="flex justify-center mt-2">
            <div
              data-testid="warning-banner"
              className="bg-red-600/90 px-6 py-2 rounded-lg border-2 border-red-400 animate-pulse"
            >
              <span className="text-lg font-bold text-white">{warning}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
