import { Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "../SceneManager";

/**
 * MenuScene - Main menu / start screen
 *
 * Displays:
 * - Game title
 * - Start button
 * - Optional: Settings, Leaderboard links
 */
export class MenuScene extends Scene {
  private titleText: Text | null = null;
  private startPrompt: Text | null = null;
  private background: Graphics | null = null;

  constructor() {
    super("menu");
  }

  protected onEnter(): void {
    this.createBackground();
    this.createTitle();
    this.createStartPrompt();
  }

  protected onExit(): void {
    // Clean up scene content
    this.container.removeChildren();
    this.titleText = null;
    this.startPrompt = null;
    this.background = null;
  }

  protected onUpdate(_deltaMs: number): void {
    // Animate start prompt (pulse effect)
    if (this.startPrompt) {
      const time = performance.now() / 1000;
      this.startPrompt.alpha = 0.5 + 0.5 * Math.sin(time * 2);
    }
  }

  private createBackground(): void {
    this.background = new Graphics();
    this.background.rect(0, 0, 800, 600);
    this.background.fill({ color: 0x0a0a1a });
    this.container.addChild(this.background);
  }

  private createTitle(): void {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 48,
      fontWeight: "bold",
      fill: 0x00ff88,
      dropShadow: {
        color: 0x000000,
        blur: 4,
        distance: 2,
      },
    });

    this.titleText = new Text({ text: "Farcaster Survivors", style });
    this.titleText.anchor.set(0.5);
    this.titleText.x = 400;
    this.titleText.y = 200;
    this.container.addChild(this.titleText);
  }

  private createStartPrompt(): void {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
    });

    this.startPrompt = new Text({ text: "Tap to Start", style });
    this.startPrompt.anchor.set(0.5);
    this.startPrompt.x = 400;
    this.startPrompt.y = 400;
    this.container.addChild(this.startPrompt);
  }

  /**
   * Resize the scene to fit container
   */
  resize(width: number, height: number): void {
    if (this.background) {
      this.background.clear();
      this.background.rect(0, 0, width, height);
      this.background.fill({ color: 0x0a0a1a });
    }

    if (this.titleText) {
      this.titleText.x = width / 2;
      this.titleText.y = height * 0.33;
    }

    if (this.startPrompt) {
      this.startPrompt.x = width / 2;
      this.startPrompt.y = height * 0.66;
    }
  }
}
