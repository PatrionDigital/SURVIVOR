import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Graphics } from "pixi.js";
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
import { useGameStore, useSettingsStore } from "../stores";
import { LevelUpModal, GameHUD, PauseMenu } from "../components/game";

export function GamePage() {
  const { isPlaying, pauseGame, setSurvivalTime, playerPosition, setPlayerPosition, survivalTime } =
    useGameStore();
  const { showVirtualJoystick, toggleVirtualJoystick, useSceneMode, toggleSceneMode } =
    useSettingsStore();
  const playerRef = useRef<Graphics | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const joystickBaseRef = useRef<Graphics | null>(null);
  const joystickKnobRef = useRef<Graphics | null>(null);
  const inputRef = useRef<InputSystem | null>(null);
  const showJoystickRef = useRef(showVirtualJoystick);

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

  // Pause state for scene mode
  const [isScenePaused, setIsScenePaused] = useState(false);

  // Keep ref in sync with store value
  useEffect(() => {
    showJoystickRef.current = showVirtualJoystick;
    // Hide joystick immediately if setting is turned off
    if (!showVirtualJoystick) {
      if (joystickBaseRef.current) joystickBaseRef.current.visible = false;
      if (joystickKnobRef.current) joystickKnobRef.current.visible = false;
    }
  }, [showVirtualJoystick]);

  // Save player position before unmount (for persistence across navigation)
  useEffect(() => {
    return () => {
      // In scene mode, get position from GameScene
      if (useSceneMode && sceneManagerRef.current) {
        const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
        const player = gameScene?.getPlayer();
        if (player) {
          setPlayerPosition({ x: player.x, y: player.y });
        }
      } else {
        // Traditional mode
        const player = playerRef.current;
        if (player) {
          setPlayerPosition({ x: player.x, y: player.y });
        }
      }
    };
  }, [setPlayerPosition, useSceneMode]);

  // Player movement speed (pixels per second)
  const PLAYER_SPEED = 200;

  // Joystick visual settings
  const JOYSTICK_BASE_RADIUS = 60;
  const JOYSTICK_KNOB_RADIUS = 25;

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

  // Handle pause for scene mode
  const handleScenePause = useCallback(() => {
    if (useSceneMode && isPlaying && !isLevelUpOpen && !isScenePaused) {
      engineRef.current?.pause();
      setIsScenePaused(true);
    }
  }, [useSceneMode, isPlaying, isLevelUpOpen, isScenePaused]);

  // Handle resume for scene mode
  const handleSceneResume = useCallback(() => {
    if (isScenePaused) {
      engineRef.current?.resume();
      setIsScenePaused(false);
    }
  }, [isScenePaused]);

  // Handle quit from pause menu
  const handleQuit = useCallback(() => {
    // Reset to menu scene
    if (sceneManagerRef.current) {
      sceneManagerRef.current.switchTo("menu");
    }
    setIsScenePaused(false);
  }, []);

  // ESC key to pause game (scene mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useSceneMode && isPlaying && !isLevelUpOpen) {
        if (isScenePaused) {
          handleSceneResume();
        } else {
          handleScenePause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [useSceneMode, isPlaying, isLevelUpOpen, isScenePaused, handleScenePause, handleSceneResume]);

  // Track survival time and move player based on input (traditional mode)
  const handleUpdate = useCallback(
    (deltaMs: number, input: InputState) => {
      // Only update survival time when game is actually playing (not paused, not in level-up)
      if (isPlaying && !isScenePaused && !isLevelUpOpen) {
        setSurvivalTime((prev: number) => prev + deltaMs / 1000);
      }

      // Check for level-up and update HUD stats (scene mode only)
      if (useSceneMode && sceneManagerRef.current) {
        const gameScene = sceneManagerRef.current.getScene("game") as GameScene | undefined;
        if (gameScene) {
          // Update HUD stats
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

      // Move player based on input (traditional mode only)
      if (!useSceneMode) {
        const player = playerRef.current;
        const engine = engineRef.current;
        if (player && engine) {
          const deltaSeconds = deltaMs / 1000;
          const moveX = input.movement.x * PLAYER_SPEED * deltaSeconds;
          const moveY = input.movement.y * PLAYER_SPEED * deltaSeconds;

          player.x += moveX;
          player.y += moveY;

          // Keep player within bounds
          const padding = 20;
          player.x = Math.max(padding, Math.min(engine.width - padding, player.x));
          player.y = Math.max(padding, Math.min(engine.height - padding, player.y));
        }
      }

      // Update joystick visual (only if enabled in settings, traditional mode)
      if (!useSceneMode) {
        const joystickBase = joystickBaseRef.current;
        const joystickKnob = joystickKnobRef.current;
        const inputSystem = inputRef.current;

        if (joystickBase && joystickKnob && inputSystem) {
          if (inputSystem.isTouching && showJoystickRef.current) {
            const origin = inputSystem.touchOrigin;
            const current = inputSystem.touchCurrent;

            // Show joystick at touch origin
            joystickBase.visible = true;
            joystickBase.x = origin.x;
            joystickBase.y = origin.y;

            // Calculate knob position (clamped to base radius)
            const dx = current.x - origin.x;
            const dy = current.y - origin.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxKnobDistance = JOYSTICK_BASE_RADIUS;

            let knobX = dx;
            let knobY = dy;

            if (distance > maxKnobDistance) {
              const scale = maxKnobDistance / distance;
              knobX = dx * scale;
              knobY = dy * scale;
            }

            joystickKnob.visible = true;
            joystickKnob.x = origin.x + knobX;
            joystickKnob.y = origin.y + knobY;
          } else {
            // Hide joystick when not touching
            joystickBase.visible = false;
            joystickKnob.visible = false;
          }
        }
      }
    },
    [setSurvivalTime, useSceneMode, isLevelUpOpen, isPlaying, isScenePaused]
  );

  // Called when engine is ready
  const handleEngineReady = useCallback(
    (engine: GameEngine, input: InputSystem, sceneManager?: SceneManager) => {
      console.log("Game engine ready:", engine.width, "x", engine.height);
      console.log("Input system attached:", input.isAttached);
      console.log("Scene mode:", useSceneMode ? "enabled" : "disabled");

      engineRef.current = engine;
      inputRef.current = input;

      if (sceneManager) {
        sceneManagerRef.current = sceneManager;
        console.log("SceneManager initialized with scenes:", sceneManager.hasScene("menu"));

        // Restore player position in game scene
        if (playerPosition) {
          const gameScene = sceneManager.getScene("game") as GameScene | undefined;
          gameScene?.setPlayerPosition(playerPosition.x, playerPosition.y);
          console.log("Restored player position:", playerPosition.x, playerPosition.y);
        }
      } else {
        // Traditional mode - create player sprite and joystick
        const player = new Graphics();
        player.circle(0, 0, 20);
        player.fill({ color: 0x00ff88 });
        player.stroke({ width: 3, color: 0xffffff });

        // Restore saved position or default to center
        if (playerPosition) {
          player.x = playerPosition.x;
          player.y = playerPosition.y;
          console.log("Restored player position:", player.x, player.y);
        } else {
          player.x = engine.width / 2;
          player.y = engine.height / 2;
        }

        // Add to stage
        engine.stage?.addChild(player);
        playerRef.current = player;

        // Create joystick base (outer circle)
        const joystickBase = new Graphics();
        joystickBase.circle(0, 0, JOYSTICK_BASE_RADIUS);
        joystickBase.fill({ color: 0xffffff, alpha: 0.2 });
        joystickBase.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
        joystickBase.visible = false;
        engine.stage?.addChild(joystickBase);
        joystickBaseRef.current = joystickBase;

        // Create joystick knob (inner circle)
        const joystickKnob = new Graphics();
        joystickKnob.circle(0, 0, JOYSTICK_KNOB_RADIUS);
        joystickKnob.fill({ color: 0xffffff, alpha: 0.6 });
        joystickKnob.visible = false;
        engine.stage?.addChild(joystickKnob);
        joystickKnobRef.current = joystickKnob;

        console.log("Player sprite created at:", player.x, player.y);
      }
    },
    [playerPosition, useSceneMode]
  );

  // Called when game ends in scene mode
  const handleGameEnd = useCallback((results: GameResults) => {
    console.log("Game ended with results:", results);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Game header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Back
          </Link>
          <button
            onClick={toggleVirtualJoystick}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showVirtualJoystick ? "bg-primary-600 text-white" : "bg-gray-700 text-gray-400"
            }`}
            title="Toggle virtual joystick visibility"
          >
            Joystick: {showVirtualJoystick ? "ON" : "OFF"}
          </button>
          <button
            onClick={toggleSceneMode}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              useSceneMode ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"
            }`}
            title="Toggle scene-based UI mode"
          >
            Scenes: {useSceneMode ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-primary-400">Farcaster Survivors</h1>
        </div>
        {/* Pause button moved to GameHUD for scene mode */}
        {isPlaying && !useSceneMode && (
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
          key={useSceneMode ? "scene-mode" : "traditional-mode"}
          onReady={handleEngineReady}
          onUpdate={handleUpdate}
          onGameEnd={handleGameEnd}
          useScenes={useSceneMode}
          className="w-full h-full"
          backgroundColor={0x0a0a1a}
        />

        {/* Game HUD overlay (scene mode only) */}
        {useSceneMode && isPlaying && (
          <GameHUD
            health={health}
            level={currentLevel}
            xpProgress={xpProgress}
            currentXP={currentXP}
            xpToNextLevel={xpToNextLevel}
            survivalTime={survivalTime}
            enemiesKilled={enemiesKilled}
            totalXP={totalXP}
            onPause={handleScenePause}
          />
        )}

        {/* Level-up modal */}
        <LevelUpModal
          isOpen={isLevelUpOpen}
          level={currentLevel}
          choices={upgradeChoices}
          onSelectUpgrade={handleSelectUpgrade}
        />

        {/* Pause menu (scene mode only) */}
        {useSceneMode && (
          <PauseMenu isOpen={isScenePaused} onResume={handleSceneResume} onQuit={handleQuit} />
        )}
      </div>
    </div>
  );
}
