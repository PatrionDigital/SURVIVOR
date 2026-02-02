import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameCanvas,
  GameEngine,
  InputSystem,
  InputState,
  SceneManager,
  GameScene,
  GameResults,
  type Upgrade,
} from "../game";
import { useGameStore } from "../stores";
import { LevelUpModal, GameHUD, PauseMenu } from "../components/game";

export function GamePage() {
  const { isPlaying, setSurvivalTime, playerPosition, setPlayerPosition, survivalTime } =
    useGameStore();

  const engineRef = useRef<GameEngine | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // Level-up state
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [upgradeChoices, setUpgradeChoices] = useState<Upgrade[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);

  // HUD stats
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [health, setHealth] = useState({ current: 100, max: 100 });
  const [xpProgress, setXpProgress] = useState(0);
  const [currentXP, setCurrentXP] = useState(0);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);

  // Pause state
  const [isPaused, setIsPaused] = useState(false);

  // Save player position before unmount (for persistence across navigation)
  useEffect(() => {
    return () => {
      if (sceneManagerRef.current) {
        const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
        const player = gameScene?.getPlayer();
        if (player) {
          setPlayerPosition({ x: player.x, y: player.y });
        }
      }
    };
  }, [setPlayerPosition]);

  // Handle upgrade selection from level-up modal
  const handleSelectUpgrade = useCallback((upgrade: Upgrade) => {
    if (sceneManagerRef.current) {
      const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
      if (gameScene) {
        gameScene.applyUpgrade(upgrade);
        setIsLevelUpOpen(false);
        setUpgradeChoices([]);

        // Resume game after selecting upgrade
        engineRef.current?.resume();
      }
    }
  }, []);

  // Handle pause
  const handlePause = useCallback(() => {
    if (isPlaying && !isLevelUpOpen && !isPaused) {
      engineRef.current?.pause();
      setIsPaused(true);
    }
  }, [isPlaying, isLevelUpOpen, isPaused]);

  // Handle resume
  const handleResume = useCallback(() => {
    if (isPaused) {
      engineRef.current?.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  // Handle quit from pause menu
  const handleQuit = useCallback(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.switchTo("menu");
    }
    setIsPaused(false);
  }, []);

  // ESC key to pause/resume game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPlaying && !isLevelUpOpen) {
        if (isPaused) {
          handleResume();
        } else {
          handlePause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying, isLevelUpOpen, isPaused, handlePause, handleResume]);

  // Track survival time and update HUD stats
  const handleUpdate = useCallback(
    (deltaMs: number, _input: InputState) => {
      // Only update survival time when game is actually playing (not paused, not in level-up)
      if (isPlaying && !isPaused && !isLevelUpOpen) {
        setSurvivalTime((prev: number) => prev + deltaMs / 1000);
      }

      // Update HUD stats from game scene
      if (sceneManagerRef.current) {
        const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
        if (gameScene) {
          setEnemiesKilled(gameScene.getEnemiesKilled());
          setTotalXP(gameScene.getTotalXPCollected());
          setCurrentLevel(gameScene.getPlayerLevel());
          setHealth(gameScene.getPlayerHealth());
          setXpProgress(gameScene.getXPProgressPercent());
          setCurrentXP(gameScene.getCurrentXP());
          setXpToNextLevel(gameScene.getXPToNextLevel());

          // Check for level-up
          if (!isLevelUpOpen && gameScene.isLevelingUp()) {
            const choices = gameScene.getUpgradeChoices(3);
            setUpgradeChoices(choices);
            setIsLevelUpOpen(true);

            // Pause game while selecting upgrade
            engineRef.current?.pause();
          }
        }
      }
    },
    [setSurvivalTime, isLevelUpOpen, isPlaying, isPaused]
  );

  // Called when engine is ready
  const handleEngineReady = useCallback(
    (engine: GameEngine, _input: InputSystem, sceneManager?: SceneManager) => {
      console.log("Game engine ready:", engine.width, "x", engine.height);

      engineRef.current = engine;

      if (sceneManager) {
        sceneManagerRef.current = sceneManager;
        console.log("SceneManager initialized");

        // Restore player position in game scene
        if (playerPosition) {
          const gameScene = sceneManager.getScene("game") as GameScene | undefined;
          gameScene?.setPlayerPosition(playerPosition.x, playerPosition.y);
          console.log("Restored player position:", playerPosition.x, playerPosition.y);
        }
      }
    },
    [playerPosition]
  );

  // Called when game ends
  const handleGameEnd = useCallback((results: GameResults) => {
    console.log("Game ended with results:", results);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Game header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
        <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Back
        </Link>
        <h1 className="text-lg font-bold text-primary-400">Farcaster Survivors</h1>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>

      {/* Game canvas container */}
      <div className="flex-1 relative">
        <GameCanvas
          onReady={handleEngineReady}
          onUpdate={handleUpdate}
          onGameEnd={handleGameEnd}
          useScenes
          className="w-full h-full"
          backgroundColor={0x0a0a1a}
        />

        {/* Game HUD overlay */}
        {isPlaying && (
          <GameHUD
            health={health}
            level={currentLevel}
            xpProgress={xpProgress}
            currentXP={currentXP}
            xpToNextLevel={xpToNextLevel}
            survivalTime={survivalTime}
            enemiesKilled={enemiesKilled}
            totalXP={totalXP}
            onPause={handlePause}
          />
        )}

        {/* Level-up modal */}
        <LevelUpModal
          isOpen={isLevelUpOpen}
          level={currentLevel}
          choices={upgradeChoices}
          onSelectUpgrade={handleSelectUpgrade}
        />

        {/* Pause menu */}
        <PauseMenu isOpen={isPaused} onResume={handleResume} onQuit={handleQuit} />
      </div>
    </div>
  );
}
