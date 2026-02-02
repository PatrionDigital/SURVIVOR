import { Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "../SceneManager";

/**
 * Game results for display
 */
export interface GameResults {
  survivalTime: number;
  score: number;
  enemiesKilled: number;
  level: number;
  /** True if player achieved victory (survived full duration) */
  victory?: boolean;
}

/**
 * ResultScene - Game over / results screen
 *
 * Displays:
 * - Game over message
 * - Final stats (time, score, kills)
 * - Play again button
 * - Return to menu option
 */
export class ResultScene extends Scene {
  private background: Graphics | null = null;
  private titleText: Text | null = null;
  private statsText: Text | null = null;
  private promptText: Text | null = null;

  private results: GameResults = {
    survivalTime: 0,
    score: 0,
    enemiesKilled: 0,
    level: 1,
  };

  constructor() {
    super("result");
  }

  /**
   * Set the game results to display
   */
  setResults(results: GameResults): void {
    this.results = results;
  }

  protected onEnter(): void {
    this.createBackground();
    this.createTitle();
    this.createStats();
    this.createPrompt();
  }

  protected onExit(): void {
    this.container.removeChildren();
    this.background = null;
    this.titleText = null;
    this.statsText = null;
    this.promptText = null;
  }

  protected onUpdate(_deltaMs: number): void {
    // Animate prompt text (pulse)
    if (this.promptText) {
      const time = performance.now() / 1000;
      this.promptText.alpha = 0.5 + 0.5 * Math.sin(time * 2);
    }
  }

  private createBackground(): void {
    this.background = new Graphics();
    this.background.rect(0, 0, 800, 600);
    this.background.fill({ color: 0x1a0a0a, alpha: 0.9 });
    this.container.addChild(this.background);
  }

  private createTitle(): void {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 48,
      fontWeight: "bold",
      fill: 0xff4444,
      dropShadow: {
        color: 0x000000,
        blur: 4,
        distance: 2,
      },
    });

    this.titleText = new Text({ text: "Game Over", style });
    this.titleText.anchor.set(0.5);
    this.titleText.x = 400;
    this.titleText.y = 120;
    this.container.addChild(this.titleText);
  }

  private createStats(): void {
    const { survivalTime, score, enemiesKilled, level } = this.results;

    const formattedTime = this.formatTime(survivalTime);
    const statsLines = [
      `Time Survived: ${formattedTime}`,
      `Score: ${score.toLocaleString()}`,
      `Enemies Killed: ${enemiesKilled}`,
      `Level Reached: ${level}`,
    ];

    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      lineHeight: 36,
    });

    this.statsText = new Text({ text: statsLines.join("\n"), style });
    this.statsText.anchor.set(0.5);
    this.statsText.x = 400;
    this.statsText.y = 300;
    this.container.addChild(this.statsText);
  }

  private createPrompt(): void {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 20,
      fill: 0x88ff88,
    });

    this.promptText = new Text({ text: "Tap to Play Again", style });
    this.promptText.anchor.set(0.5);
    this.promptText.x = 400;
    this.promptText.y = 500;
    this.container.addChild(this.promptText);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Resize the scene to fit container
   */
  resize(width: number, height: number): void {
    if (this.background) {
      this.background.clear();
      this.background.rect(0, 0, width, height);
      this.background.fill({ color: 0x1a0a0a, alpha: 0.9 });
    }

    if (this.titleText) {
      this.titleText.x = width / 2;
      this.titleText.y = height * 0.2;
    }

    if (this.statsText) {
      this.statsText.x = width / 2;
      this.statsText.y = height * 0.5;
    }

    if (this.promptText) {
      this.promptText.x = width / 2;
      this.promptText.y = height * 0.83;
    }
  }
}
