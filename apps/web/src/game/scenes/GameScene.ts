import { Container, Graphics } from "pixi.js";
import { Scene } from "../SceneManager";
import { InputSystem, InputState } from "../InputSystem";
import { Camera } from "../Camera";
import {
  createGameWorld,
  GameWorld,
  Entity,
  movementSystem,
  invincibilitySystem,
  renderSystem,
} from "../ecs";

/**
 * GameScene - Main gameplay scene
 *
 * Handles:
 * - Player entity (ECS)
 * - Camera following player
 * - Enemy spawning
 * - Combat systems
 * - Pickups
 * - HUD elements
 */
export class GameScene extends Scene {
  private gameContainer: Container | null = null;
  private inputSystem: InputSystem | null = null;

  // ECS
  private world: GameWorld | null = null;
  private playerEntity: Entity | null = null;

  // Camera
  private camera: Camera | null = null;

  // Game dimensions (set on resize)
  private width = 800;
  private height = 600;

  constructor() {
    super("game");
  }

  protected onEnter(): void {
    this.createGameContainer();
    this.createWorld();
    this.createCamera();
    this.createPlayer();
  }

  protected onExit(): void {
    // Destroy player sprite
    if (this.playerEntity?.sprite) {
      this.playerEntity.sprite.graphics.destroy();
    }

    // Clean up scene content
    this.container.removeChildren();
    this.gameContainer = null;
    this.world = null;
    this.playerEntity = null;
    this.camera = null;
  }

  protected onUpdate(deltaMs: number): void {
    if (!this.world || !this.camera) return;

    // Get input state (default to no movement if no input system)
    const input = this.inputSystem?.getState() ?? {
      movement: { x: 0, y: 0 },
    };

    // Run ECS systems in order
    // 1. Movement (no bounds - infinite arena)
    movementSystem(this.world, deltaMs, input);

    // 2. Update camera to follow player
    if (this.playerEntity?.position) {
      this.camera.update(this.playerEntity.position.x, this.playerEntity.position.y, deltaMs);
    }

    // 3. Invincibility effects
    invincibilitySystem(this.world, deltaMs);

    // 4. Render with camera offset
    renderSystem(this.world, this.camera, this.width, this.height);
  }

  /**
   * Set the input system for player control
   */
  setInputSystem(input: InputSystem): void {
    this.inputSystem = input;
  }

  /**
   * Get the current input state
   */
  getInputState(): InputState | null {
    return this.inputSystem?.getState() ?? null;
  }

  /**
   * Resize the scene to fit container
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // No position clamping in infinite arena
  }

  /**
   * Get the player sprite (for external access)
   */
  getPlayer(): Graphics | null {
    return this.playerEntity?.sprite?.graphics ?? null;
  }

  /**
   * Get the camera (for viewport calculations, enemy spawning)
   */
  getCamera(): Camera | null {
    return this.camera;
  }

  /**
   * Get player position (for state persistence)
   */
  getPlayerPosition(): { x: number; y: number } | null {
    if (!this.playerEntity?.position) return null;
    return {
      x: this.playerEntity.position.x,
      y: this.playerEntity.position.y,
    };
  }

  /**
   * Set player position (for state restoration)
   */
  setPlayerPosition(x: number, y: number): void {
    if (this.playerEntity?.position) {
      this.playerEntity.position.x = x;
      this.playerEntity.position.y = y;
    }
  }

  /**
   * Damage the player (triggers invincibility frames)
   * @param amount - Damage amount
   * @returns true if player took damage, false if invincible
   */
  damagePlayer(amount: number): boolean {
    if (!this.world || !this.playerEntity) return false;

    // Can't take damage while invincible
    if (this.playerEntity.invincibility) return false;

    // Apply damage to health
    if (this.playerEntity.health) {
      this.playerEntity.health.current = Math.max(0, this.playerEntity.health.current - amount);
    }

    // Add invincibility frames (1 second)
    this.world.addComponent(this.playerEntity, "invincibility", {
      remaining: 1000,
      duration: 1000,
    });

    return true;
  }

  private createGameContainer(): void {
    this.gameContainer = new Container();
    this.container.addChild(this.gameContainer);
  }

  private createWorld(): void {
    this.world = createGameWorld();
  }

  private createCamera(): void {
    // Create camera with smooth follow (lerp 0.1)
    this.camera = new Camera({ lerpFactor: 0.1 });
    // Initialize camera at origin (where player starts)
    this.camera.x = 0;
    this.camera.y = 0;
  }

  private createPlayer(): void {
    if (!this.world || !this.gameContainer) return;

    // Create player graphics
    const graphics = new Graphics();
    graphics.circle(0, 0, 20);
    graphics.fill({ color: 0x00ff88 });
    graphics.stroke({ width: 3, color: 0xffffff });

    // Player starts at world origin (0, 0)
    // Sprite will be positioned by RenderSystem based on camera
    const startX = 0;
    const startY = 0;

    this.gameContainer.addChild(graphics);

    // Create player entity with all components
    this.playerEntity = this.world.add({
      position: { x: startX, y: startY },
      velocity: { vx: 0, vy: 0 },
      health: { current: 100, max: 100 },
      sprite: { graphics },
      playerControlled: true,
    });
  }
}
