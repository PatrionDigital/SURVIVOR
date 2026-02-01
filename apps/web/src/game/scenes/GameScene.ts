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
import {
  PlayerWeaponSystem,
  projectileMovementSystem,
  projectileLifetimeSystem,
  projectileCollisionSystem,
  type WeaponConfig,
} from "../combat";

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
// Grid settings for background
const GRID_SIZE = 64; // Size of each grid cell in pixels
const GRID_COLOR_PRIMARY = 0x1a1a2e; // Dark blue-purple
const GRID_COLOR_SECONDARY = 0x16213e; // Slightly lighter
const GRID_LINE_COLOR = 0x0f3460; // Grid lines

// Default player weapon configuration
const DEFAULT_WEAPON_CONFIG: WeaponConfig = {
  id: "basic-blaster",
  name: "Basic Blaster",
  damage: 10,
  cooldown: 500, // Fire every 500ms
  projectileSpeed: 400, // Pixels per second
  projectileLifetime: 2000, // 2 seconds
  visual: {
    color: 0x00ffff, // Cyan projectiles
    radius: 5,
  },
  projectilesPerShot: 1,
  spreadAngle: 0,
  pierce: 0,
};

export class GameScene extends Scene {
  private gameContainer: Container | null = null;
  private backgroundContainer: Container | null = null;
  private backgroundGraphics: Graphics | null = null;
  private inputSystem: InputSystem | null = null;

  // ECS
  private world: GameWorld | null = null;
  private playerEntity: Entity | null = null;

  // Camera
  private camera: Camera | null = null;

  // Combat
  private playerWeaponSystem: PlayerWeaponSystem | null = null;

  // Game dimensions (set on resize)
  private width = 800;
  private height = 600;

  constructor() {
    super("game");
  }

  protected onEnter(): void {
    this.createBackground();
    this.createGameContainer();
    this.createWorld();
    this.createCamera();
    this.createPlayer();
    this.createWeaponSystem();
  }

  protected onExit(): void {
    // Destroy player sprite
    if (this.playerEntity?.sprite) {
      this.playerEntity.sprite.graphics.destroy();
    }

    // Clean up projectiles
    if (this.world) {
      for (const entity of this.world.with("projectile")) {
        if (entity.sprite?.graphics) {
          entity.sprite.graphics.destroy();
        }
      }
    }

    // Clean up background
    if (this.backgroundGraphics) {
      this.backgroundGraphics.destroy();
    }

    // Clean up scene content
    this.container.removeChildren();
    this.gameContainer = null;
    this.backgroundContainer = null;
    this.backgroundGraphics = null;
    this.world = null;
    this.playerEntity = null;
    this.camera = null;
    this.playerWeaponSystem = null;
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

    // 4. Combat systems
    if (this.playerEntity?.position && this.playerWeaponSystem) {
      // Player weapon auto-fires at nearest enemy
      this.playerWeaponSystem.update(deltaMs, this.playerEntity.position);
    }

    // 5. Projectile systems
    projectileMovementSystem(this.world, deltaMs);
    projectileLifetimeSystem(this.world, deltaMs);

    // 6. Projectile collision (player radius 20, projectile radius 5)
    const collisionResult = projectileCollisionSystem(this.world, 5, 20);

    // Apply player damage from enemy projectiles
    if (collisionResult.playerHit && this.playerEntity) {
      this.damagePlayer(collisionResult.playerDamageTaken);
    }

    // Clean up consumed projectiles
    this.cleanupConsumedProjectiles();

    // 7. Update background to follow camera
    this.updateBackground();

    // 8. Render with camera offset
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

  private createWeaponSystem(): void {
    if (!this.world || !this.gameContainer) return;

    this.playerWeaponSystem = new PlayerWeaponSystem(
      this.world,
      this.gameContainer,
      DEFAULT_WEAPON_CONFIG
    );
  }

  private cleanupConsumedProjectiles(): void {
    if (!this.world) return;

    const toRemove: Entity[] = [];

    for (const entity of this.world.with("projectile")) {
      if (entity.projectile!.consumed || entity.projectile!.lifetime <= 0) {
        toRemove.push(entity);
      }
    }

    for (const entity of toRemove) {
      if (entity.sprite?.graphics) {
        entity.sprite.graphics.destroy();
      }
      this.world.remove(entity);
    }
  }

  private createBackground(): void {
    this.backgroundContainer = new Container();
    this.container.addChild(this.backgroundContainer);

    this.backgroundGraphics = new Graphics();
    this.backgroundContainer.addChild(this.backgroundGraphics);
  }

  private updateBackground(): void {
    if (!this.backgroundGraphics || !this.camera) return;

    const g = this.backgroundGraphics;
    g.clear();

    // Calculate visible area with padding for smooth scrolling
    const padding = GRID_SIZE * 2;
    const startX = Math.floor((this.camera.x - this.width / 2 - padding) / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor((this.camera.y - this.height / 2 - padding) / GRID_SIZE) * GRID_SIZE;
    const endX = this.camera.x + this.width / 2 + padding;
    const endY = this.camera.y + this.height / 2 + padding;

    // Camera offset for world-to-screen conversion
    const offsetX = this.width / 2 - this.camera.x;
    const offsetY = this.height / 2 - this.camera.y;

    // Draw checkerboard pattern
    for (let worldX = startX; worldX < endX; worldX += GRID_SIZE) {
      for (let worldY = startY; worldY < endY; worldY += GRID_SIZE) {
        // Checkerboard pattern based on grid position
        const gridX = Math.floor(worldX / GRID_SIZE);
        const gridY = Math.floor(worldY / GRID_SIZE);
        const isEven = (gridX + gridY) % 2 === 0;

        const screenX = worldX + offsetX;
        const screenY = worldY + offsetY;

        // Fill cell
        g.rect(screenX, screenY, GRID_SIZE, GRID_SIZE);
        g.fill({ color: isEven ? GRID_COLOR_PRIMARY : GRID_COLOR_SECONDARY });

        // Draw grid lines
        g.rect(screenX, screenY, GRID_SIZE, GRID_SIZE);
        g.stroke({ width: 1, color: GRID_LINE_COLOR, alpha: 0.5 });
      }
    }

    // Draw origin marker (cross at 0,0)
    const originScreenX = 0 + offsetX;
    const originScreenY = 0 + offsetY;

    // Only draw if origin is visible
    if (
      originScreenX > -50 &&
      originScreenX < this.width + 50 &&
      originScreenY > -50 &&
      originScreenY < this.height + 50
    ) {
      g.moveTo(originScreenX - 30, originScreenY);
      g.lineTo(originScreenX + 30, originScreenY);
      g.moveTo(originScreenX, originScreenY - 30);
      g.lineTo(originScreenX, originScreenY + 30);
      g.stroke({ width: 2, color: 0xff6b6b, alpha: 0.8 });
    }
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
