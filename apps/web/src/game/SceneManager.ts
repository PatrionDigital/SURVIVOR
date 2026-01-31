import { Container } from "pixi.js";

/**
 * Scene lifecycle state
 */
export enum SceneState {
  INACTIVE = "inactive",
  ENTERING = "entering",
  ACTIVE = "active",
  EXITING = "exiting",
}

/**
 * Transition options for animated scene changes
 */
export interface TransitionOptions {
  /** Duration of transition in milliseconds */
  duration?: number;
  /** Easing function (default: linear) */
  easing?: (t: number) => number;
}

/**
 * Scene - Base class for game scenes
 *
 * Scenes manage their own container and lifecycle.
 * Extend this class to create menu, game, and result screens.
 *
 * @example
 * ```typescript
 * class MenuScene extends Scene {
 *   constructor() {
 *     super("menu");
 *   }
 *
 *   onEnter() {
 *     // Create menu UI
 *   }
 *
 *   onExit() {
 *     // Cleanup
 *   }
 *
 *   onUpdate(deltaMs: number) {
 *     // Update animations
 *   }
 * }
 * ```
 */
export abstract class Scene {
  private _name: string;
  private _container: Container;
  private _state: SceneState = SceneState.INACTIVE;

  constructor(name: string) {
    this._name = name;
    this._container = new Container();
    this._container.visible = false;
  }

  // ============ Getters ============

  get name(): string {
    return this._name;
  }

  get container(): Container {
    return this._container;
  }

  get state(): SceneState {
    return this._state;
  }

  // ============ Lifecycle Methods ============

  /**
   * Enter this scene (called by SceneManager)
   */
  enter(): void {
    this._state = SceneState.ACTIVE;
    this._container.visible = true;
    this.onEnter();
  }

  /**
   * Exit this scene (called by SceneManager)
   */
  exit(): void {
    this._state = SceneState.INACTIVE;
    this._container.visible = false;
    this.onExit();
  }

  /**
   * Update this scene (called by SceneManager each frame)
   * @param deltaMs - Time since last frame in milliseconds
   */
  update(deltaMs: number): void {
    if (this._state !== SceneState.ACTIVE) return;
    this.onUpdate(deltaMs);
  }

  /**
   * Destroy this scene and clean up resources
   */
  destroy(): void {
    this._container.destroy({ children: true });
  }

  // ============ Abstract Methods (implement in subclasses) ============

  /**
   * Called when scene becomes active
   * Override to set up scene content
   */
  protected abstract onEnter(): void;

  /**
   * Called when scene becomes inactive
   * Override to clean up scene content
   */
  protected abstract onExit(): void;

  /**
   * Called each frame while scene is active
   * Override to update scene logic
   * @param deltaMs - Time since last frame in milliseconds
   */
  protected abstract onUpdate(deltaMs: number): void;
}

/**
 * SceneManager - Manages game scenes and transitions
 *
 * Handles scene registration, switching, and animated transitions.
 * Propagates update calls to the active scene.
 *
 * @example
 * ```typescript
 * const sceneManager = new SceneManager(stage);
 *
 * sceneManager.register(new MenuScene());
 * sceneManager.register(new GameScene());
 * sceneManager.register(new ResultScene());
 *
 * sceneManager.switchTo("menu");
 *
 * // In game loop
 * sceneManager.update(deltaMs);
 *
 * // Animated transition
 * await sceneManager.transitionTo("game", { duration: 300 });
 * ```
 */
export class SceneManager {
  private _rootContainer: Container;
  private _scenes: Map<string, Scene> = new Map();
  private _currentScene: Scene | null = null;
  private _isTransitioning = false;

  constructor(rootContainer: Container) {
    this._rootContainer = rootContainer;
  }

  // ============ Getters ============

  get currentScene(): Scene | null {
    return this._currentScene;
  }

  get currentSceneName(): string | null {
    return this._currentScene?.name ?? null;
  }

  get isTransitioning(): boolean {
    return this._isTransitioning;
  }

  // ============ Public Methods ============

  /**
   * Register a scene with the manager
   * @param scene - Scene to register
   * @throws Error if scene with same name already registered
   */
  register(scene: Scene): void {
    if (this._scenes.has(scene.name)) {
      throw new Error(`Scene "${scene.name}" is already registered`);
    }

    this._scenes.set(scene.name, scene);
    this._rootContainer.addChild(scene.container);
  }

  /**
   * Check if a scene is registered
   * @param name - Scene name to check
   */
  hasScene(name: string): boolean {
    return this._scenes.has(name);
  }

  /**
   * Get a scene by name
   * @param name - Scene name
   * @returns Scene or undefined if not found
   */
  getScene(name: string): Scene | undefined {
    return this._scenes.get(name);
  }

  /**
   * Immediately switch to a scene (no transition)
   * @param name - Name of scene to switch to
   * @throws Error if scene not registered
   */
  switchTo(name: string): void {
    const scene = this._scenes.get(name);

    if (!scene) {
      throw new Error(`Scene "${name}" is not registered`);
    }

    // No-op if already on this scene
    if (this._currentScene === scene) {
      return;
    }

    // Exit current scene
    if (this._currentScene) {
      this._currentScene.exit();
    }

    // Enter new scene
    this._currentScene = scene;
    scene.enter();
  }

  /**
   * Transition to a scene with animation
   * @param name - Name of scene to transition to
   * @param options - Transition options
   * @returns Promise that resolves when transition completes
   */
  async transitionTo(name: string, options: TransitionOptions = {}): Promise<void> {
    const { duration = 300 } = options;

    // Block if already transitioning
    if (this._isTransitioning) {
      return;
    }

    const scene = this._scenes.get(name);
    if (!scene) {
      throw new Error(`Scene "${name}" is not registered`);
    }

    // No-op if already on this scene
    if (this._currentScene === scene) {
      return;
    }

    this._isTransitioning = true;

    // Simple fade transition using timeout
    // In a real implementation, this would use PixiJS animations
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        // Exit current scene
        if (this._currentScene) {
          this._currentScene.exit();
        }

        // Enter new scene
        this._currentScene = scene;
        scene.enter();

        this._isTransitioning = false;
        resolve();
      }, duration);
    });
  }

  /**
   * Update the current scene
   * @param deltaMs - Time since last frame in milliseconds
   */
  update(deltaMs: number): void {
    this._currentScene?.update(deltaMs);
  }

  /**
   * Destroy the scene manager and all scenes
   */
  destroy(): void {
    // Exit current scene
    if (this._currentScene) {
      this._currentScene.exit();
      this._currentScene = null;
    }

    // Destroy all scenes
    for (const scene of this._scenes.values()) {
      scene.destroy();
    }

    this._scenes.clear();
  }
}
