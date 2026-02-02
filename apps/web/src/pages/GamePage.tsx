import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameCanvas,
  GameEngine,
  InputSystem,
  InputState,
  SceneManager,
  GameScene,
  ResultScene,
  GameResults,
  type Upgrade,
} from "../game";
import { useGameStore } from "../stores";
import { LevelUpModal, GameHUD, PauseMenu } from "../components/game";

export function GamePage() {
  const { isPlaying, endGame, setSurvivalTime, playerPosition, setPlayerPosition, survivalTime } =
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

  // Wave system stats
  const [phaseName, setPhaseName] = useState<string | undefined>(undefined);
  const [waveProgress, setWaveProgress] = useState<number | undefined>(undefined);
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(undefined);
  const [warning, setWarning] = useState<string | undefined>(undefined);

  // Applied upgrades for pause menu
  const [appliedUpgrades, setAppliedUpgrades] = useState<Upgrade[]>([]);

  // Pause state
  const [isPaused, setIsPaused] = useState(false);

  // Track if difficulty has been increased (after 1 min or first upgrade)
  const difficultyIncreasedRef = useRef(false);

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

  // Increase difficulty (spawn rate) - called after 1 min or first upgrade
  const increaseDifficulty = useCallback(() => {
    if (difficultyIncreasedRef.current) return;
    difficultyIncreasedRef.current = true;

    const gameScene = sceneManagerRef.current?.getScene("game") as GameScene | undefined;
    if (gameScene) {
      // Greatly increase spawn rate: faster spawning, more enemies
      gameScene.updateSpawningConfig({
        baseSpawnInterval: 500, // Down from 2000ms
        minSpawnInterval: 200, // Down from 500ms
        maxEnemies: 60, // Up from 30
      });
      console.log("Difficulty increased! Spawn rate greatly increased.");
    }
  }, []);

  // Handle upgrade selection from level-up modal
  const handleSelectUpgrade = useCallback(
    (upgrade: Upgrade) => {
      if (sceneManagerRef.current) {
        const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
        if (gameScene) {
          gameScene.applyUpgrade(upgrade);
          setIsLevelUpOpen(false);
          setUpgradeChoices([]);

          // Increase difficulty after first upgrade
          increaseDifficulty();

          // Resume game after selecting upgrade
          engineRef.current?.resume();
        }
      }
    },
    [increaseDifficulty]
  );

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
    // End the game (resets stats)
    endGame();
    // Resume engine so menu scene can render (engine was paused for pause menu)
    engineRef.current?.resume();
    // Switch to menu scene
    if (sceneManagerRef.current) {
      sceneManagerRef.current.switchTo("menu");
    }
    setIsPaused(false);
  }, [endGame]);

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

  // Handle victory - transition to result scene with victory flag
  const handleVictory = useCallback(() => {
    if (!sceneManagerRef.current) return;

    const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
    const resultScene = sceneManagerRef.current.getScene("result") as ResultScene | undefined;

    if (gameScene && resultScene) {
      // Gather final stats with victory bonus
      const results: GameResults = {
        survivalTime,
        score: (totalXP * 10 + enemiesKilled * 5) * 2, // Double score for victory
        enemiesKilled,
        level: currentLevel,
        victory: true,
      };

      // Set results and transition to result scene
      resultScene.setResults(results);
      endGame();
      sceneManagerRef.current.switchTo("result");

      // Reset difficulty flag for next game
      difficultyIncreasedRef.current = false;
    }
  }, [survivalTime, totalXP, enemiesKilled, currentLevel, endGame]);

  // Handle player death - transition to result scene
  const handlePlayerDeath = useCallback(() => {
    if (!sceneManagerRef.current) return;

    const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
    const resultScene = sceneManagerRef.current.getScene("result") as ResultScene | undefined;

    if (gameScene && resultScene) {
      // Gather final stats
      const results: GameResults = {
        survivalTime,
        score: totalXP * 10 + enemiesKilled * 5,
        enemiesKilled,
        level: currentLevel,
      };

      // Set results and transition to result scene
      resultScene.setResults(results);
      endGame();
      sceneManagerRef.current.switchTo("result");

      // Reset difficulty flag for next game
      difficultyIncreasedRef.current = false;
    }
  }, [survivalTime, totalXP, enemiesKilled, currentLevel, endGame]);

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

          // Update wave system stats
          setPhaseName(gameScene.getPhaseName());
          setWaveProgress(gameScene.getWaveProgress());
          setTimeRemaining(gameScene.getTimeRemaining());

          // Update applied upgrades for pause menu
          setAppliedUpgrades(gameScene.getAppliedUpgrades());

          // Check for warnings
          const warnings = gameScene.getPendingWarnings();
          if (warnings.length > 0) {
            setWarning(warnings[0].title);
            // Clear the warning after displaying it
            gameScene.clearWarning(0);
            // Auto-hide warning after 3 seconds
            setTimeout(() => setWarning(undefined), 3000);
          }

          // Check for player death
          if (isPlaying && gameScene.isPlayerDead()) {
            handlePlayerDeath();
            return;
          }

          // Check for victory (survival complete)
          if (isPlaying && gameScene.isVictory()) {
            handleVictory();
            return;
          }

          // Check for 1-minute mark to increase difficulty
          if (survivalTime >= 60) {
            increaseDifficulty();
          }

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
    [
      setSurvivalTime,
      isLevelUpOpen,
      isPlaying,
      isPaused,
      handlePlayerDeath,
      survivalTime,
      increaseDifficulty,
    ]
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
            phaseName={phaseName}
            waveProgress={waveProgress}
            timeRemaining={timeRemaining}
            warning={warning}
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
        <PauseMenu
          isOpen={isPaused}
          onResume={handleResume}
          onQuit={handleQuit}
          upgrades={appliedUpgrades}
        />
      </div>
    </div>
  );
}
