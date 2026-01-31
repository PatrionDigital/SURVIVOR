import { Application, Container } from "pixi.js";

/**
 * Game engine states
 */
export enum GameEngineState {
  IDLE = "idle",
  READY = "ready",
  RUNNING = "running",
  PAUSED = "paused",
  DESTROYED = "destroyed",
}

/**
 * Update callback type - receives delta time in milliseconds
 */
export type UpdateCallback = (deltaMs: number) => void;

/**
 * GameEngine - Core PixiJS v8 game engine wrapper
 *
 * Provides:
 * - PixiJS Application initialization
 * - Game loop management (start/pause/resume/stop)
 * - Resize handling
 * - Update callbacks with delta time
 *
 * @example
 * ```typescript
 * const engine = new GameEngine();
 * await engine.init(containerElement);
 * engine.onUpdate((delta) => {
 *   // Update game logic
 * });
 * engine.start();
 * ```
 */
export class GameEngine {
  private app: Application | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private container: HTMLElement | null = null;
  private _state: GameEngineState = GameEngineState.IDLE;
  private _width = 0;
  private _height = 0;
  private updateCallbacks: UpdateCallback[] = [];
  private boundTickerCallback: ((ticker: { deltaMS: number }) => void) | null = null;

  // ============ Getters ============

  get state(): GameEngineState {
    return this._state;
  }

  get isInitialized(): boolean {
    return this._state !== GameEngineState.IDLE && this._state !== GameEngineState.DESTROYED;
  }

  get isRunning(): boolean {
    return this._state === GameEngineState.RUNNING;
  }

  get isPaused(): boolean {
    return this._state === GameEngineState.PAUSED;
  }

  get width(): number {
    // Use actual renderer dimensions if available, fallback to cached
    return this.app?.renderer?.width ?? this._width;
  }

  get height(): number {
    // Use actual renderer dimensions if available, fallback to cached
    return this.app?.renderer?.height ?? this._height;
  }

  get stage(): Container | null {
    return this.app?.stage ?? null;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  // ============ Initialization ============

  /**
   * Initialize the game engine with a container element
   * @param container - DOM element to append the canvas to
   * @param options - Optional configuration
   */
  async init(
    container: HTMLElement,
    options: {
      width?: number;
      height?: number;
      backgroundColor?: number;
      antialias?: boolean;
      resolution?: number;
    } = {}
  ): Promise<void> {
    if (this.isInitialized) {
      throw new Error("GameEngine is already initialized");
    }

    this.container = container;

    // Get initial dimensions from container or options
    const width = options.width ?? (container.clientWidth || 800);
    const height = options.height ?? (container.clientHeight || 600);

    // Create PixiJS Application
    this.app = new Application();

    await this.app.init({
      width,
      height,
      backgroundColor: options.backgroundColor ?? 0x1a1a2e,
      antialias: options.antialias ?? true,
      resolution: options.resolution ?? (window.devicePixelRatio || 1),
      autoDensity: true,
      autoStart: false, // Prevent auto-starting ticker (React Strict Mode compatibility)
    });

    // Check if destroyed during async init (React Strict Mode protection)
    if (this._state === GameEngineState.DESTROYED || !this.app) {
      return;
    }

    // Store canvas reference and append to container
    this._canvas = this.app.canvas;
    container.appendChild(this._canvas);

    this._width = width;
    this._height = height;
    this._state = GameEngineState.READY;

    // Set up the ticker callback
    this.boundTickerCallback = (ticker) => {
      this.tick(ticker.deltaMS);
    };
  }

  // ============ Game Loop Control ============

  /**
   * Start the game loop
   */
  start(): void {
    if (!this.isInitialized || this._state === GameEngineState.DESTROYED) {
      return;
    }

    if (this.app && this.boundTickerCallback) {
      this.app.ticker.add(this.boundTickerCallback);
      this.app.ticker.start();
    }

    this._state = GameEngineState.RUNNING;
  }

  /**
   * Pause the game loop
   */
  pause(): void {
    if (this._state !== GameEngineState.RUNNING) {
      return;
    }

    if (this.app) {
      this.app.ticker.stop();
    }

    this._state = GameEngineState.PAUSED;
  }

  /**
   * Resume the game loop from paused state
   */
  resume(): void {
    if (this._state !== GameEngineState.PAUSED) {
      return;
    }

    if (this.app) {
      this.app.ticker.start();
    }

    this._state = GameEngineState.RUNNING;
  }

  /**
   * Stop the game loop (resets to ready state)
   */
  stop(): void {
    if (this._state === GameEngineState.DESTROYED) {
      return;
    }

    if (!this.isRunning && !this.isPaused) {
      return;
    }

    try {
      if (this.app && this.boundTickerCallback) {
        this.app.ticker.remove(this.boundTickerCallback);
        this.app.ticker.stop();
      }
    } catch {
      // Ignore ticker errors during cleanup
    }

    this._state = GameEngineState.READY;
  }

  // ============ Resize ============

  /**
   * Resize the game canvas
   * @param width - New width in pixels
   * @param height - New height in pixels
   */
  resize(width: number, height: number): void {
    if (!this.app) {
      return;
    }

    this.app.renderer.resize(width, height);
    this._width = width;
    this._height = height;
  }

  // ============ Update Callbacks ============

  /**
   * Register an update callback
   * @param callback - Function called each frame with delta time in ms
   * @returns Function to remove the callback
   */
  onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.push(callback);

    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index !== -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Internal tick function called by PixiJS ticker
   */
  private tick(deltaMs: number): void {
    if (this._state !== GameEngineState.RUNNING) {
      return;
    }

    for (const callback of this.updateCallbacks) {
      callback(deltaMs);
    }
  }

  /**
   * Simulate a tick for testing purposes
   * @internal
   */
  simulateTick(deltaMs: number): void {
    this.tick(deltaMs);
  }

  // ============ Cleanup ============

  /**
   * Destroy the game engine and clean up resources
   */
  destroy(): void {
    if (this._state === GameEngineState.DESTROYED) {
      return;
    }

    // Mark as destroyed first to prevent re-entry
    this._state = GameEngineState.DESTROYED;

    // Stop the game loop
    try {
      this.stop();
    } catch {
      // Ignore errors during cleanup
    }

    // Remove canvas from container using stored reference
    try {
      if (this._canvas && this.container && this._canvas.parentNode === this.container) {
        this.container.removeChild(this._canvas);
      }
    } catch {
      // Ignore errors during cleanup
    }

    // Destroy PixiJS application with error handling
    // PixiJS v8 can throw if internal state is already destroyed (React Strict Mode)
    if (this.app) {
      try {
        this.app.destroy(true);
      } catch {
        // PixiJS may throw if already partially destroyed
      }
      this.app = null;
    }

    this._canvas = null;
    this.container = null;
    this.updateCallbacks = [];
    this.boundTickerCallback = null;
  }
}
