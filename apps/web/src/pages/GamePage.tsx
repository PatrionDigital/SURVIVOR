import { Link } from "react-router-dom";
import { useCallback } from "react";
import { GameCanvas, GameEngine } from "../game";
import { useGameStore } from "../stores/gameStore";

export function GamePage() {
  const { isPlaying, isPaused, pauseGame, setSurvivalTime } = useGameStore();

  // Track survival time during gameplay
  const handleUpdate = useCallback(
    (deltaMs: number) => {
      if (isPlaying && !isPaused) {
        setSurvivalTime((prev: number) => prev + deltaMs / 1000);
      }
    },
    [isPlaying, isPaused, setSurvivalTime]
  );

  // Called when engine is ready
  const handleEngineReady = useCallback((engine: GameEngine) => {
    console.log("Game engine ready:", engine.width, "x", engine.height);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Game header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
        <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Back
        </Link>
        <h1 className="text-lg font-bold text-primary-400">Farcaster Survivors</h1>
        {isPlaying && (
          <button
            onClick={pauseGame}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Pause
          </button>
        )}
        {!isPlaying && <div className="w-12" />}
      </div>

      {/* Game canvas container */}
      <div className="flex-1 relative">
        <GameCanvas
          onReady={handleEngineReady}
          onUpdate={handleUpdate}
          className="w-full h-full"
          backgroundColor={0x0a0a1a}
        />
      </div>
    </div>
  );
}
