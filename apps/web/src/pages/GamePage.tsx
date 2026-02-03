import { Link, useNavigate } from "react-router-dom";
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
import {
  LevelUpModal,
  GameHUD,
  PauseMenu,
  GameOverScreen,
  type RewardData,
} from "../components/game";
import { useGameSession, useMiniApp } from "../hooks";
import sdk from "@farcaster/miniapp-sdk";

export function GamePage() {
  const { isPlaying, endGame, setSurvivalTime, playerPosition, setPlayerPosition, survivalTime } =
    useGameStore();
  const { isAuthenticated, sessionId, startGameSession, endGameSession } = useGameSession();
  const { isInMiniApp } = useMiniApp();

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

  // Game over state
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverStats, setGameOverStats] = useState<{
    survivalTime: number;
    enemiesKilled: number;
    levelReached: number;
    totalXP: number;
  } | null>(null);
  const [rewardData, setRewardData] = useState<RewardData | null>(null);

  const navigate = useNavigate();

  // Track if difficulty has been increased (after 1 min or first upgrade)
  const difficultyIncreasedRef = useRef(false);

  // Track if session has been started for current game
  const sessionStartedRef = useRef(false);

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

  // Start backend session when game starts
  useEffect(() => {
    if (isPlaying && isAuthenticated && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      startGameSession().then((id) => {
        if (id) {
          console.log("Backend session started:", id);
        } else {
          console.warn("Failed to start backend session, rewards may not be available");
        }
      });
    }
  }, [isPlaying, isAuthenticated, startGameSession]);

  // Handle victory - show game over screen with victory bonus
  const handleVictory = useCallback(async () => {
    if (!sceneManagerRef.current) return;

    const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;

    if (gameScene) {
      // Calculate score with victory bonus
      const score = (totalXP * 10 + enemiesKilled * 5) * 2;

      // Set game over stats immediately for display
      setGameOverStats({
        survivalTime,
        enemiesKilled,
        levelReached: currentLevel,
        totalXP,
      });

      // End game state and show overlay
      endGame();
      setShowGameOver(true);

      // Try to get signed reward from backend (async, non-blocking UI)
      if (sessionId) {
        const reward = await endGameSession(score, currentLevel, enemiesKilled, totalXP);
        if (reward) {
          setRewardData(reward);
        }
      }

      // Reset flags for next game
      difficultyIncreasedRef.current = false;
      sessionStartedRef.current = false;
    }
  }, [survivalTime, totalXP, enemiesKilled, currentLevel, endGame, sessionId, endGameSession]);

  // Handle player death - show game over screen with reward
  const handlePlayerDeath = useCallback(async () => {
    if (!sceneManagerRef.current) return;

    const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;

    if (gameScene) {
      // Calculate score
      const score = totalXP * 10 + enemiesKilled * 5;

      // Set game over stats immediately for display
      setGameOverStats({
        survivalTime,
        enemiesKilled,
        levelReached: currentLevel,
        totalXP,
      });

      // End game state and show overlay
      endGame();
      setShowGameOver(true);

      // Try to get signed reward from backend (async, non-blocking UI)
      if (sessionId) {
        const reward = await endGameSession(score, currentLevel, enemiesKilled, totalXP);
        if (reward) {
          setRewardData(reward);
        }
      }

      // Reset flags for next game
      difficultyIncreasedRef.current = false;
      sessionStartedRef.current = false;
    }
  }, [survivalTime, totalXP, enemiesKilled, currentLevel, endGame, sessionId, endGameSession]);

  // Handle play again from game over screen
  const handlePlayAgain = useCallback(async () => {
    setShowGameOver(false);
    setGameOverStats(null);
    setRewardData(null);

    // Force scene reset by transitioning through menu scene
    // This ensures proper cleanup via onExit() and reinitialization via onEnter()
    if (sceneManagerRef.current) {
      await sceneManagerRef.current.transitionTo("menu", { duration: 0 });
      await sceneManagerRef.current.transitionTo("game", { duration: 0 });
    }

    // Start new game in store (this will trigger the session start effect)
    sessionStartedRef.current = false;
    useGameStore.getState().startGame();
  }, []);

  // Handle share from game over screen
  const handleShare = useCallback(async () => {
    // Use game over stats if available, otherwise use current stats
    const stats = gameOverStats || {
      survivalTime,
      enemiesKilled,
      levelReached: currentLevel,
      totalXP,
    };

    // Format survival time as mm:ss
    const minutes = Math.floor(stats.survivalTime / 60);
    const seconds = Math.floor(stats.survivalTime % 60);
    const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;

    // Format share text with all relevant stats
    const shareText = `🎮 Farcaster Survivors\n\n⏱️ Survived: ${timeStr}\n💀 Kills: ${stats.enemiesKilled.toLocaleString()}\n⭐ Level: ${stats.levelReached}\n✨ XP: ${stats.totalXP.toLocaleString()}\n\nPlay now! 👇`;

    const appUrl = window.location.origin;

    try {
      if (isInMiniApp) {
        // In Farcaster Mini App - use SDK to open composer
        // The SDK doesn't have a direct composeCast method, so we use openUrl with Warpcast compose URL
        const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(appUrl)}`;
        await sdk.actions.openUrl(composeUrl);
      } else {
        // Not in mini app - copy to clipboard as fallback
        await navigator.clipboard.writeText(`${shareText}\n\n${appUrl}`);
        alert("Score copied to clipboard! Paste it in Warpcast to share.");
      }
    } catch (error) {
      console.error("Failed to share:", error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${appUrl}`);
        alert("Score copied to clipboard!");
      } catch (clipboardError) {
        alert("Failed to share. Please try again.");
      }
    }
  }, [survivalTime, enemiesKilled, currentLevel, totalXP, gameOverStats, isInMiniApp]);

  // Handle quit from game over screen
  const handleGameOverQuit = useCallback(() => {
    setShowGameOver(false);
    setGameOverStats(null);
    setRewardData(null);
    navigate("/");
  }, [navigate]);

  // Handle reward claimed
  const handleRewardClaimed = useCallback(() => {
    console.log("Reward claimed successfully!");
  }, []);

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

        {/* Game over screen overlay */}
        {gameOverStats && (
          <GameOverScreen
            isOpen={showGameOver}
            survivalTime={gameOverStats.survivalTime}
            enemiesKilled={gameOverStats.enemiesKilled}
            levelReached={gameOverStats.levelReached}
            totalXP={gameOverStats.totalXP}
            rewardData={rewardData}
            onPlayAgain={handlePlayAgain}
            onShare={handleShare}
            onQuit={handleGameOverQuit}
            onRewardClaimed={handleRewardClaimed}
          />
        )}
      </div>
    </div>
  );
}
