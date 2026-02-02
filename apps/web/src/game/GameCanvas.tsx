import { useEffect, useRef, useCallback } from "react";
import { GameEngine } from "./GameEngine";
import { InputSystem, InputState } from "./InputSystem";
import { SceneManager } from "./SceneManager";
import { MenuScene, GameScene, ResultScene, GameResults } from "./scenes";
import { useGameStore } from "../stores/gameStore";

export interface GameCanvasProps {
  /** Called when engine is initialized */
  onReady?: (engine: GameEngine, input: InputSystem, sceneManager?: SceneManager) => void;
  /** Called each frame with delta time in ms and input state */
  onUpdate?: (deltaMs: number, input: InputState) => void;
  /** CSS class name for the container */
  className?: string;
  /** Background color (hex) */
  backgroundColor?: number;
  /** Use scene-based UI instead of React overlays */
  useScenes?: boolean;
  /** Called when game ends with results (scene mode only) */
  onGameEnd?: (results: GameResults) => void;
}

/**
 * GameCanvas - React component wrapper for PixiJS game engine
 *
 * Handles:
 * - Engine initialization and cleanup
 * - Window resize events
 * - Integration with Zustand game store
 * - Optional scene-based UI (Menu, Game, Result scenes)
 *
 * @example
 * ```tsx
 * // Traditional mode with React overlays
 * <GameCanvas
 *   onReady={(engine) => console.log('Engine ready')}
 *   onUpdate={(delta) => updateGame(delta)}
 *   className="w-full h-full"
 * />
 *
 * // Scene mode with PixiJS UI
 * <GameCanvas
 *   useScenes
 *   onReady={(engine, input, sceneManager) => {
 *     // Scenes are already registered
 *   }}
 *   className="w-full h-full"
 * />
 * ```
 */
export function GameCanvas({
  onReady,
  onUpdate,
  className = "",
  backgroundColor = 0x1a1a2e,
  useScenes = false,
  onGameEnd,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputSystem | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // Store callbacks in refs to avoid re-initializing engine when they change
  const onUpdateRef = useRef(onUpdate);
  const onReadyRef = useRef(onReady);
  const onGameEndRef = useRef(onGameEnd);

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  // Game store state
  const { isPlaying, isPaused, startGame, pauseGame, resumeGame, endGame } = useGameStore();

  // Handle resize - also resize scenes
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const engine = engineRef.current;
    const sceneManager = sceneManagerRef.current;

    if (!container || !engine) return;

    const { clientWidth, clientHeight } = container;
    if (clientWidth > 0 && clientHeight > 0) {
      engine.resize(clientWidth, clientHeight);

      // Resize all scenes
      if (sceneManager) {
        const menuScene = sceneManager.getScene("menu") as MenuScene | undefined;
        const gameScene = sceneManager.getScene("game") as GameScene | undefined;
        const resultScene = sceneManager.getScene("result") as ResultScene | undefined;

        menuScene?.resize(clientWidth, clientHeight);
        gameScene?.resize(clientWidth, clientHeight);
        resultScene?.resize(clientWidth, clientHeight);
      }
    }
  }, []);

  // Initialize engine
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track if effect has been cleaned up (React Strict Mode protection)
    let isCancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const engine = new GameEngine();
    const input = new InputSystem();
    engineRef.current = engine;
    inputRef.current = input;

    const initEngine = async () => {
      try {
        await engine.init(container, { backgroundColor });

        // Check if we were cancelled during async init (React Strict Mode)
        if (isCancelled) {
          engine.destroy();
          input.destroy();
          return;
        }

        // Set up resize observer
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        // Trigger initial resize to ensure correct dimensions
        handleResize();

        // Attach input system to container
        input.attach(container);

        // Initialize SceneManager if using scenes
        let sceneManager: SceneManager | undefined;
        if (useScenes && engine.stage) {
          sceneManager = new SceneManager(engine.stage);
          sceneManagerRef.current = sceneManager;

          // Create and register scenes
          const menuScene = new MenuScene();
          const gameScene = new GameScene();
          const resultScene = new ResultScene();

          sceneManager.register(menuScene);
          sceneManager.register(gameScene);
          sceneManager.register(resultScene);

          // Connect input to game scene
          gameScene.setInputSystem(input);

          // Initial resize for scenes
          const { clientWidth, clientHeight } = container;
          menuScene.resize(clientWidth, clientHeight);
          gameScene.resize(clientWidth, clientHeight);
          resultScene.resize(clientWidth, clientHeight);

          // Start on menu scene
          sceneManager.switchTo("menu");

          // Add scene update to engine loop
          engine.onUpdate((deltaMs) => {
            sceneManager?.update(deltaMs);
            if (onUpdateRef.current) {
              onUpdateRef.current(deltaMs, input.getState());
            }
          });

          // Set up tap handling for scene transitions
          setupSceneTransitions(container, sceneManager, input, startGame, endGame, onGameEnd);

          // Start engine immediately for scene rendering (menu needs to be visible)
          // Input remains disabled until game scene is active
          engine.start();
        } else {
          // Traditional mode - just register update callback
          engine.onUpdate((deltaMs) => {
            if (onUpdateRef.current) {
              onUpdateRef.current(deltaMs, input.getState());
            }
          });
        }

        // Notify ready
        if (onReadyRef.current) {
          onReadyRef.current(engine, input, sceneManager);
        }
      } catch (error) {
        // Ignore errors if cancelled (expected during Strict Mode cleanup)
        if (!isCancelled) {
          console.error("Failed to initialize game engine:", error);
        }
      }
    };

    initEngine();

    return () => {
      isCancelled = true;
      resizeObserver?.disconnect();
      // Clean up scene transitions
      const sceneCleanup = (container as HTMLElement & { _sceneCleanup?: () => void })
        ._sceneCleanup;
      if (sceneCleanup) {
        sceneCleanup();
      }
      sceneManagerRef.current?.destroy();
      sceneManagerRef.current = null;
      input.destroy();
      engine.destroy();
      engineRef.current = null;
      inputRef.current = null;
      // Pause game when canvas unmounts (e.g., navigating away)
      // User can resume or quit when returning
      pauseGame();
    };
  }, [backgroundColor, handleResize, pauseGame, useScenes, startGame, endGame]);

  // Sync game state with engine and input (only in traditional mode)
  useEffect(() => {
    if (useScenes) return; // Scene mode handles this internally

    const engine = engineRef.current;
    const input = inputRef.current;
    if (!engine || !engine.isInitialized) return;

    if (isPlaying && !isPaused) {
      if (!engine.isRunning) {
        engine.start();
      } else if (engine.isPaused) {
        engine.resume();
      }
      // Enable input when playing
      input?.enable();
    } else if (isPlaying && isPaused) {
      if (engine.isRunning) {
        engine.pause();
      }
      // Disable input when paused
      input?.disable();
    } else if (!isPlaying) {
      if (engine.isRunning || engine.isPaused) {
        engine.stop();
      }
      // Disable input when not playing
      input?.disable();
    }
  }, [isPlaying, isPaused, useScenes]);

  // Scene mode handles transitions in game loop, hide React overlays
  if (useScenes) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ touchAction: "none" }}
      >
        {/* Canvas will be appended here by the engine */}
        {/* Scene-based UI is rendered by PixiJS */}
      </div>
    );
  }

  // Traditional mode with React overlays
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ touchAction: "none" }}
    >
      {/* Canvas will be appended here by the engine */}

      {/* Game controls overlay (only visible when not playing) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <button
            onClick={startGame}
            className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-8 rounded-lg text-xl transition-colors"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Pause overlay */}
      {isPlaying && isPaused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4">
          <h2 className="text-2xl font-bold text-white">Paused</h2>
          <div className="flex gap-4">
            <button
              onClick={resumeGame}
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Resume
            </button>
            <button
              onClick={endGame}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Quit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Set up tap/click handling for scene transitions
 */
function setupSceneTransitions(
  container: HTMLElement,
  sceneManager: SceneManager,
  input: InputSystem,
  startGame: () => void,
  _endGame: () => void, // Will be used when player death is implemented
  _onGameEnd?: (results: GameResults) => void // Will be used when player death is implemented
): void {
  const handleTap = async (e: PointerEvent) => {
    // Only handle primary button (touch or left click)
    if (e.button !== 0) return;

    const currentScene = sceneManager.currentSceneName;

    if (currentScene === "menu") {
      // Transition from menu to game
      await sceneManager.transitionTo("game", { duration: 200 });
      input.enable();
      startGame();
    } else if (currentScene === "result") {
      // Tap to play again - go back to game
      await sceneManager.transitionTo("game", { duration: 200 });
      input.enable();
      startGame();
    }
    // In game scene, taps are handled by the game (player movement)
  };

  container.addEventListener("pointerup", handleTap);

  // Clean up on unmount (handled by effect cleanup)
  // Store cleanup function on container for later removal
  (container as HTMLElement & { _sceneCleanup?: () => void })._sceneCleanup = () => {
    container.removeEventListener("pointerup", handleTap);
  };
}
