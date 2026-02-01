import { Container } from "pixi.js";
import { EntityManager } from "yuka";
import type { GameWorld } from "../ecs/World";
import type { EnemyTypeRegistry } from "../enemies/EnemyTypeRegistry";
import { createEnemy } from "../enemies/EnemyFactory";

/**
 * Configuration for the spawning system
 */
export interface SpawningConfig {
  /** Base time between spawns in ms */
  baseSpawnInterval: number;
  /** Minimum spawn interval (cap for difficulty scaling) */
  minSpawnInterval: number;
  /** Distance from viewport edge to spawn enemies */
  spawnDistanceFromViewport: number;
  /** Maximum number of enemies allowed */
  maxEnemies: number;
  /** Difficulty scaling settings */
  difficultyScaling: {
    /** How much spawn interval decreases per minute */
    intervalDecreasePerMinute: number;
    /** How many more enemies per wave per minute */
    enemiesPerWaveIncreasePerMinute: number;
  };
  /** Enemy types to spawn */
  enemyTypes: string[];
}

/**
 * Spawn direction (which edge of viewport to spawn from)
 */
type SpawnEdge = "top" | "bottom" | "left" | "right";

/**
 * SpawningSystem - Manages enemy spawning
 *
 * Spawns enemies from outside the viewport based on time and difficulty scaling.
 * Uses Yuka's EntityManager for AI management.
 */
export class SpawningSystem {
  private world: GameWorld;
  private yukaManager: EntityManager;
  private container: Container;
  private registry: EnemyTypeRegistry;
  private config: SpawningConfig;

  private spawnTimer: number;
  private gameTime: number = 0;
  private totalSpawned: number = 0;

  constructor(
    world: GameWorld,
    yukaManager: EntityManager,
    container: Container,
    registry: EnemyTypeRegistry,
    config: SpawningConfig
  ) {
    this.world = world;
    this.yukaManager = yukaManager;
    this.container = container;
    this.registry = registry;
    this.config = config;
    this.spawnTimer = config.baseSpawnInterval;
  }

  /**
   * Update the spawning system
   * @param deltaMs - Time since last update in ms
   * @param cameraPos - Current camera position
   * @param viewportWidth - Viewport width in pixels
   * @param viewportHeight - Viewport height in pixels
   */
  update(
    deltaMs: number,
    cameraPos: { x: number; y: number },
    viewportWidth: number,
    viewportHeight: number
  ): void {
    this.gameTime += deltaMs;
    this.spawnTimer -= deltaMs;

    // Check if it's time to spawn
    while (this.spawnTimer <= 0) {
      // Check max enemies cap
      if (this.getCurrentCount() >= this.config.maxEnemies) {
        // Reset timer and wait
        this.spawnTimer += this.getCurrentSpawnInterval();
        break;
      }

      // Spawn enemy
      this.spawnEnemy(cameraPos, viewportWidth, viewportHeight);

      // Reset timer (accumulate remainder for consistent spawning)
      this.spawnTimer += this.getCurrentSpawnInterval();
    }
  }

  /**
   * Get the current spawn timer value
   */
  getSpawnTimer(): number {
    return this.spawnTimer;
  }

  /**
   * Get the current spawn interval based on difficulty
   */
  getCurrentSpawnInterval(): number {
    const minutesPlayed = this.gameTime / 60000;
    const decrease = minutesPlayed * this.config.difficultyScaling.intervalDecreasePerMinute;
    const interval = this.config.baseSpawnInterval - decrease;

    return Math.max(interval, this.config.minSpawnInterval);
  }

  /**
   * Set the game time (for testing)
   */
  setGameTime(time: number): void {
    this.gameTime = time;
  }

  /**
   * Get total number of enemies spawned
   */
  getTotalSpawned(): number {
    return this.totalSpawned;
  }

  /**
   * Get current number of enemies in the world
   */
  getCurrentCount(): number {
    return Array.from(this.world.with("enemy")).length;
  }

  /**
   * Spawn a single enemy at a random position outside the viewport
   */
  private spawnEnemy(
    cameraPos: { x: number; y: number },
    viewportWidth: number,
    viewportHeight: number
  ): void {
    // Pick random enemy type
    const enemyType =
      this.config.enemyTypes[Math.floor(Math.random() * this.config.enemyTypes.length)];

    const config = this.registry.get(enemyType);
    if (!config) {
      console.warn(`Enemy type '${enemyType}' not found in registry`);
      return;
    }

    // Calculate spawn position outside viewport
    const position = this.calculateSpawnPosition(cameraPos, viewportWidth, viewportHeight);

    // Create enemy using factory
    createEnemy(this.world, this.yukaManager, this.container, config, position);

    this.totalSpawned++;
  }

  /**
   * Calculate a spawn position outside the viewport
   */
  private calculateSpawnPosition(
    cameraPos: { x: number; y: number },
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number } {
    const halfWidth = viewportWidth / 2;
    const halfHeight = viewportHeight / 2;
    const offset = this.config.spawnDistanceFromViewport;

    // Pick random edge
    const edges: SpawnEdge[] = ["top", "bottom", "left", "right"];
    const edge = edges[Math.floor(Math.random() * edges.length)];

    let x: number;
    let y: number;

    switch (edge) {
      case "top":
        x = cameraPos.x - halfWidth + Math.random() * viewportWidth;
        y = cameraPos.y - halfHeight - offset;
        break;
      case "bottom":
        x = cameraPos.x - halfWidth + Math.random() * viewportWidth;
        y = cameraPos.y + halfHeight + offset;
        break;
      case "left":
        x = cameraPos.x - halfWidth - offset;
        y = cameraPos.y - halfHeight + Math.random() * viewportHeight;
        break;
      case "right":
        x = cameraPos.x + halfWidth + offset;
        y = cameraPos.y - halfHeight + Math.random() * viewportHeight;
        break;
    }

    return { x, y };
  }
}
