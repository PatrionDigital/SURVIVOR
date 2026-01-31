import { Container, Graphics } from "pixi.js";
import { Scene } from "../SceneManager";
import { InputSystem, InputState } from "../InputSystem";
import {
  createGameWorld,
  GameWorld,
  Entity,
  movementSystem,
  invincibilitySystem,
  renderSystem,
  BOUNDARY_PADDING,
} from "../ecs";

/**
 * GameScene - Main gameplay scene
 *
 * Handles:
 * - Player entity (ECS)
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

  // Game dimensions (set on resize)
  private width = 800;
  private height = 600;

  constructor() {
    super("game");
  }

  protected onEnter(): void {
    this.createGameContainer();
    this.createWorld();
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
  }

  protected onUpdate(deltaMs: number): void {
    if (!this.world) return;

    // Get input state (default to no movement if no input system)
    const input = this.inputSystem?.getState() ?? {
      movement: { x: 0, y: 0 },
      isMoving: false,
    };

    // Run ECS systems in order
    const bounds = { width: this.width, height: this.height };
    movementSystem(this.world, deltaMs, input, bounds);
    invincibilitySystem(this.world, deltaMs);
    renderSystem(this.world);
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

    // Reposition player to stay in bounds
    if (this.playerEntity?.position) {
      this.playerEntity.position.x = Math.max(
        BOUNDARY_PADDING,
        Math.min(width - BOUNDARY_PADDING, this.playerEntity.position.x)
      );
      this.playerEntity.position.y = Math.max(
        BOUNDARY_PADDING,
        Math.min(height - BOUNDARY_PADDING, this.playerEntity.position.y)
      );

      // Sync sprite position
      if (this.playerEntity.sprite) {
        this.playerEntity.sprite.graphics.x = this.playerEntity.position.x;
        this.playerEntity.sprite.graphics.y = this.playerEntity.position.y;
      }
    }
  }

  /**
   * Get the player sprite (for external access)
   */
  getPlayer(): Graphics | null {
    return this.playerEntity?.sprite?.graphics ?? null;
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

      // Sync sprite position immediately
      if (this.playerEntity.sprite) {
        this.playerEntity.sprite.graphics.x = x;
        this.playerEntity.sprite.graphics.y = y;
      }
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
      this.playerEntity.health.current = Math.max(
        0,
        this.playerEntity.health.current - amount
      );
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

  private createPlayer(): void {
    if (!this.world || !this.gameContainer) return;

    // Create player graphics
    const graphics = new Graphics();
    graphics.circle(0, 0, 20);
    graphics.fill({ color: 0x00ff88 });
    graphics.stroke({ width: 3, color: 0xffffff });

    // Center player
    const startX = this.width / 2;
    const startY = this.height / 2;
    graphics.x = startX;
    graphics.y = startY;

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
