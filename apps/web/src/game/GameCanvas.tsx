import { useEffect, useRef, useCallback } from "react";
import { GameEngine } from "./GameEngine";
import { InputSystem, InputState } from "./InputSystem";
import { useGameStore } from "../stores/gameStore";

export interface GameCanvasProps {
  /** Called when engine is initialized */
  onReady?: (engine: GameEngine, input: InputSystem) => void;
  /** Called each frame with delta time in ms and input state */
  onUpdate?: (deltaMs: number, input: InputState) => void;
  /** CSS class name for the container */
  className?: string;
  /** Background color (hex) */
  backgroundColor?: number;
}

/**
 * GameCanvas - React component wrapper for PixiJS game engine
 *
 * Handles:
 * - Engine initialization and cleanup
 * - Window resize events
 * - Integration with Zustand game store
 *
 * @example
 * ```tsx
 * <GameCanvas
 *   onReady={(engine) => console.log('Engine ready')}
 *   onUpdate={(delta) => updateGame(delta)}
 *   className="w-full h-full"
 * />
 * ```
 */
export function GameCanvas({
  onReady,
  onUpdate,
  className = "",
  backgroundColor = 0x1a1a2e,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputSystem | null>(null);

  // Game store state
  const { isPlaying, isPaused, startGame, resumeGame, endGame } = useGameStore();

  // Handle resize
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const engine = engineRef.current;

    if (!container || !engine) return;

    const { clientWidth, clientHeight } = container;
    if (clientWidth > 0 && clientHeight > 0) {
      engine.resize(clientWidth, clientHeight);
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

        // Attach input system to container
        input.attach(container);

        // Register update callback with input state
        if (onUpdate) {
          engine.onUpdate((deltaMs) => {
            onUpdate(deltaMs, input.getState());
          });
        }

        // Notify ready
        if (onReady) {
          onReady(engine, input);
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
      input.destroy();
      engine.destroy();
      engineRef.current = null;
      inputRef.current = null;
    };
  }, [backgroundColor, handleResize, onReady, onUpdate]);

  // Sync game state with engine and input
  useEffect(() => {
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
  }, [isPlaying, isPaused]);

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
