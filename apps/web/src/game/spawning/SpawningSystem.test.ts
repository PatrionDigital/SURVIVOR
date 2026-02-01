import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntityManager } from "yuka";
import { Container } from "pixi.js";
import { SpawningSystem, type SpawningConfig } from "./SpawningSystem";
import { createGameWorld } from "../ecs/World";
import { EnemyTypeRegistry } from "../enemies/EnemyTypeRegistry";

// Mock PixiJS
vi.mock("pixi.js", () => ({
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  })),
}));

// Mock EnemyTypeRegistry
vi.mock("../enemies/EnemyTypeRegistry", () => ({
  EnemyTypeRegistry: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({
      id: "basic",
      name: "Basic Enemy",
      visual: { color: 0xff4444, radius: 15 },
      combat: { damage: 10, health: 30, xpValue: 10 },
      movement: { maxSpeed: 100, maxForce: 80, mass: 1.0 },
      flocking: { alignment: 0.8, cohesion: 1.0, separation: 1.2 },
      vision: { range: 250, fieldOfView: 360 },
      behavior: { seekWeight: 1.5 },
    }),
    get: vi.fn().mockReturnValue({
      id: "basic",
      name: "Basic Enemy",
      visual: { color: 0xff4444, radius: 15 },
      combat: { damage: 10, health: 30, xpValue: 10 },
      movement: { maxSpeed: 100, maxForce: 80, mass: 1.0 },
      flocking: { alignment: 0.8, cohesion: 1.0, separation: 1.2 },
      vision: { range: 250, fieldOfView: 360 },
      behavior: { seekWeight: 1.5 },
    }),
  })),
}));

const defaultConfig: SpawningConfig = {
  baseSpawnInterval: 2000, // 2 seconds
  minSpawnInterval: 500, // 0.5 seconds minimum
  spawnDistanceFromViewport: 50,
  maxEnemies: 50,
  difficultyScaling: {
    intervalDecreasePerMinute: 100, // Spawn interval decreases by 100ms per minute
    enemiesPerWaveIncreasePerMinute: 1,
  },
  enemyTypes: ["basic"],
};

describe("SpawningSystem", () => {
  let world: ReturnType<typeof createGameWorld>;
  let yukaManager: EntityManager;
  let container: Container;
  let registry: EnemyTypeRegistry;

  beforeEach(() => {
    world = createGameWorld();
    yukaManager = new EntityManager();
    container = new Container();
    registry = new EnemyTypeRegistry();
  });

  describe("Initialization", () => {
    it("should create with config", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      expect(spawner).toBeDefined();
    });

    it("should initialize with correct spawn timer", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      // Timer starts at spawn interval
      expect(spawner.getSpawnTimer()).toBe(defaultConfig.baseSpawnInterval);
    });
  });

  describe("Spawn timer", () => {
    it("should decrement spawn timer on update", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      spawner.update(500, { x: 0, y: 0 }, 800, 600);

      expect(spawner.getSpawnTimer()).toBe(1500); // 2000 - 500
    });

    it("should spawn enemy when timer reaches zero", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      // Update past the spawn timer
      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      // Should have spawned at least one enemy
      const enemies = Array.from(world.with("enemy"));
      expect(enemies.length).toBeGreaterThan(0);
    });

    it("should reset timer after spawning", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      // Timer should be reset (may have some remainder)
      expect(spawner.getSpawnTimer()).toBeLessThanOrEqual(defaultConfig.baseSpawnInterval);
    });
  });

  describe("Spawn positioning", () => {
    it("should spawn enemies outside viewport", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      const viewportWidth = 800;
      const viewportHeight = 600;
      const cameraPos = { x: 0, y: 0 };

      spawner.update(2500, cameraPos, viewportWidth, viewportHeight);

      const enemies = Array.from(world.with("enemy"));
      expect(enemies.length).toBeGreaterThan(0);

      const enemy = enemies[0];
      if (enemy.position) {
        // Check that enemy is outside the visible viewport
        const halfWidth = viewportWidth / 2;
        const halfHeight = viewportHeight / 2;

        // Enemy should be at least outside the viewport bounds
        const isOutsideX =
          enemy.position.x < cameraPos.x - halfWidth || enemy.position.x > cameraPos.x + halfWidth;
        const isOutsideY =
          enemy.position.y < cameraPos.y - halfHeight ||
          enemy.position.y > cameraPos.y + halfHeight;

        // At least one axis should be outside the viewport
        expect(isOutsideX || isOutsideY).toBe(true);
      }
    });
  });

  describe("Difficulty scaling", () => {
    it("should decrease spawn interval over time", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      const initialInterval = spawner.getCurrentSpawnInterval();

      // Advance game time by 1 minute (60000ms)
      spawner.setGameTime(60000);

      const newInterval = spawner.getCurrentSpawnInterval();

      // Interval should be decreased
      expect(newInterval).toBeLessThan(initialInterval);
    });

    it("should not go below minimum spawn interval", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      // Advance game time by 30 minutes
      spawner.setGameTime(30 * 60 * 1000);

      const interval = spawner.getCurrentSpawnInterval();

      expect(interval).toBeGreaterThanOrEqual(defaultConfig.minSpawnInterval);
    });
  });

  describe("Max enemies cap", () => {
    it("should not spawn when at max enemies", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, {
        ...defaultConfig,
        maxEnemies: 2,
      });

      // Spawn 2 enemies
      spawner.update(2500, { x: 0, y: 0 }, 800, 600);
      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      // Try to spawn more
      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      const count = Array.from(world.with("enemy")).length;

      // Should not exceed max (2)
      expect(count).toBeLessThanOrEqual(2);
    });
  });

  describe("Enemy variety", () => {
    it("should spawn specified enemy types", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      const enemies = Array.from(world.with("enemy"));
      expect(enemies.length).toBeGreaterThan(0);

      // Enemy should have config from registry
      const enemy = enemies[0];
      expect(enemy.enemy?.config.id).toBe("basic");
    });
  });

  describe("Yuka EntityManager integration", () => {
    it("should add spawned enemies to Yuka EntityManager", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      // Yuka manager should have the enemy's vehicle
      const vehicles = Array.from(yukaManager.entities);
      expect(vehicles.length).toBeGreaterThan(0);
    });
  });

  describe("Statistics", () => {
    it("should track total spawned count", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      expect(spawner.getTotalSpawned()).toBe(0);

      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      expect(spawner.getTotalSpawned()).toBeGreaterThan(0);
    });

    it("should track current enemy count", () => {
      const spawner = new SpawningSystem(world, yukaManager, container, registry, defaultConfig);

      expect(spawner.getCurrentCount()).toBe(0);

      spawner.update(2500, { x: 0, y: 0 }, 800, 600);

      expect(spawner.getCurrentCount()).toBe(Array.from(world.with("enemy")).length);
    });
  });
});
