import { Container, Graphics } from "pixi.js";
import { Scene } from "../SceneManager";
import { InputSystem, InputState } from "../InputSystem";

/**
 * GameScene - Main gameplay scene
 *
 * Handles:
 * - Player entity
 * - Enemy spawning
 * - Combat systems
 * - Pickups
 * - HUD elements
 */
export class GameScene extends Scene {
  private gameContainer: Container | null = null;
  private player: Graphics | null = null;
  private inputSystem: InputSystem | null = null;

  // Game dimensions (set on resize)
  private width = 800;
  private height = 600;

  // Player movement speed (pixels per second)
  private readonly PLAYER_SPEED = 200;

  constructor() {
    super("game");
  }

  protected onEnter(): void {
    this.createGameContainer();
    this.createPlayer();
  }

  protected onExit(): void {
    // Clean up scene content
    this.container.removeChildren();
    this.gameContainer = null;
    this.player = null;
  }

  protected onUpdate(deltaMs: number): void {
    this.updatePlayer(deltaMs);
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
    if (this.player) {
      const padding = 20;
      this.player.x = Math.max(padding, Math.min(width - padding, this.player.x));
      this.player.y = Math.max(padding, Math.min(height - padding, this.player.y));
    }
  }

  /**
   * Get the player sprite (for external access)
   */
  getPlayer(): Graphics | null {
    return this.player;
  }

  /**
   * Set player position
   */
  setPlayerPosition(x: number, y: number): void {
    if (this.player) {
      this.player.x = x;
      this.player.y = y;
    }
  }

  private createGameContainer(): void {
    this.gameContainer = new Container();
    this.container.addChild(this.gameContainer);
  }

  private createPlayer(): void {
    this.player = new Graphics();
    this.player.circle(0, 0, 20);
    this.player.fill({ color: 0x00ff88 });
    this.player.stroke({ width: 3, color: 0xffffff });

    // Center player
    this.player.x = this.width / 2;
    this.player.y = this.height / 2;

    this.gameContainer?.addChild(this.player);
  }

  private updatePlayer(deltaMs: number): void {
    if (!this.player || !this.inputSystem) return;

    const input = this.inputSystem.getState();
    const deltaSeconds = deltaMs / 1000;

    // Move player
    const moveX = input.movement.x * this.PLAYER_SPEED * deltaSeconds;
    const moveY = input.movement.y * this.PLAYER_SPEED * deltaSeconds;

    this.player.x += moveX;
    this.player.y += moveY;

    // Keep player in bounds
    const padding = 20;
    this.player.x = Math.max(padding, Math.min(this.width - padding, this.player.x));
    this.player.y = Math.max(padding, Math.min(this.height - padding, this.player.y));
  }
}
