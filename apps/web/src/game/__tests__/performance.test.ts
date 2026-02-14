/**
 * Performance Tests for Game Systems
 *
 * Measures processing time of core ECS systems under realistic
 * entity counts to detect regressions and validate frame-budget compliance.
 *
 * Target: All systems combined must complete within 16ms (60 FPS budget).
 */

import { describe, it, expect, vi } from "vitest";
import { World } from "miniplex";
import type { Entity } from "../ecs/World";
import { movementSystem } from "../ecs/systems/MovementSystem";
import { collisionSystem } from "../enemies/CollisionSystem";
import { projectileCollisionSystem } from "../combat/ProjectileCollisionSystem";

// Mock PixiJS (not needed for logic-only perf tests)
vi.mock("pixi.js", () => ({
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    removeChildren: vi.fn(),
    destroy: vi.fn(),
    children: [],
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    x: 0,
    y: 0,
    alpha: 1,
  })),
}));

/**
 * Helper: create a minimal enemy entity configuration
 */
function createEnemyConfig() {
  return {
    config: {
      id: "basic",
      name: "Basic Enemy",
      visual: { radius: 15, color: 0xff0000 },
      combat: { damage: 10, health: 50, xpValue: 10 },
      movement: { maxSpeed: 100, maxForce: 5, mass: 1 },
      flocking: { alignment: 1, cohesion: 1, separation: 1.5 },
      vision: { range: 300, fieldOfView: 360 },
      behavior: { seekWeight: 1 },
    },
    vehicle: {} as any,
    currentBehavior: "seeking" as const,
  };
}

/**
 * Helper: populate world with a player + N enemies + M projectiles
 */
function populateWorld(
  world: World<Entity>,
  enemyCount: number,
  projectileCount: number = 0
): void {
  // Player entity
  world.add({
    playerControlled: true,
    position: { x: 400, y: 300 },
    velocity: { vx: 0, vy: 0 },
    health: { current: 100, max: 100 },
  });

  // Enemy entities spread around the arena
  for (let i = 0; i < enemyCount; i++) {
    const angle = (i / enemyCount) * Math.PI * 2;
    const distance = 200 + Math.random() * 600;
    world.add({
      enemy: createEnemyConfig(),
      position: {
        x: 400 + Math.cos(angle) * distance,
        y: 300 + Math.sin(angle) * distance,
      },
      velocity: { vx: 0, vy: 0 },
      health: { current: 50, max: 50 },
    });
  }

  // Projectile entities
  for (let i = 0; i < projectileCount; i++) {
    const angle = (i / projectileCount) * Math.PI * 2;
    world.add({
      projectile: {
        faction: "player" as const,
        damage: 25,
        lifetime: 2000,
        maxLifetime: 2000,
        consumed: false,
        pierceRemaining: 0,
      },
      position: {
        x: 400 + Math.cos(angle) * 50,
        y: 300 + Math.sin(angle) * 50,
      },
      velocity: {
        vx: Math.cos(angle) * 500,
        vy: Math.sin(angle) * 500,
      },
    });
  }
}

/**
 * Measure average execution time over multiple iterations
 */
function benchmark(fn: () => void, iterations: number = 100): number {
  // Warm up
  for (let i = 0; i < 10; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsed = performance.now() - start;
  return elapsed / iterations;
}

// Dummy input for movement system
const idleInput = { movement: { x: 0, y: 0 }, isMoving: false };
const movingInput = { movement: { x: 1, y: 0 }, isMoving: true };

describe("Performance: MovementSystem", () => {
  it("should process 100 entities under 0.5ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 100);

    const avgMs = benchmark(() => {
      movementSystem(world, 16, movingInput);
    });

    expect(avgMs).toBeLessThan(0.5);
  });

  it("should process 500 entities under 2ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 500);

    const avgMs = benchmark(() => {
      movementSystem(world, 16, movingInput);
    });

    expect(avgMs).toBeLessThan(2);
  });

  it("should process 1000 entities under 4ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 1000);

    const avgMs = benchmark(() => {
      movementSystem(world, 16, idleInput);
    });

    expect(avgMs).toBeLessThan(4);
  });
});

describe("Performance: CollisionSystem", () => {
  it("should handle player vs 100 enemies under 0.5ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 100);

    const avgMs = benchmark(() => {
      collisionSystem(world, 20);
    });

    expect(avgMs).toBeLessThan(0.5);
  });

  it("should handle player vs 500 enemies under 2ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 500);

    const avgMs = benchmark(() => {
      collisionSystem(world, 20);
    });

    expect(avgMs).toBeLessThan(2);
  });

  it("should handle player vs 1000 enemies under 4ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 1000);

    const avgMs = benchmark(() => {
      collisionSystem(world, 20);
    });

    expect(avgMs).toBeLessThan(4);
  });
});

describe("Performance: ProjectileCollisionSystem", () => {
  it("should handle 50 projectiles vs 100 enemies under 1ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 100, 50);

    const avgMs = benchmark(() => {
      // Reset consumed state so projectiles can be reused
      for (const p of world.with("projectile")) {
        p.projectile.consumed = false;
      }
      projectileCollisionSystem(world, 8);
    });

    expect(avgMs).toBeLessThan(1);
  });

  it("should handle 100 projectiles vs 500 enemies under 5ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 500, 100);

    const avgMs = benchmark(() => {
      for (const p of world.with("projectile")) {
        p.projectile.consumed = false;
      }
      projectileCollisionSystem(world, 8);
    });

    expect(avgMs).toBeLessThan(5);
  });
});

describe("Performance: Combined Systems (per-frame budget)", () => {
  it("should process a typical frame (60 enemies, 20 projectiles) under 2ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 60, 20);

    const avgMs = benchmark(() => {
      movementSystem(world, 16, movingInput);
      collisionSystem(world, 20);
      for (const p of world.with("projectile")) {
        p.projectile.consumed = false;
      }
      projectileCollisionSystem(world, 8);
    });

    expect(avgMs).toBeLessThan(2);
  });

  it("should process a heavy frame (200 enemies, 50 projectiles) under 5ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 200, 50);

    const avgMs = benchmark(() => {
      movementSystem(world, 16, movingInput);
      collisionSystem(world, 20);
      for (const p of world.with("projectile")) {
        p.projectile.consumed = false;
      }
      projectileCollisionSystem(world, 8);
    });

    expect(avgMs).toBeLessThan(5);
  });

  it("should process a stress frame (500 enemies, 100 projectiles) under 10ms", () => {
    const world = new World<Entity>();
    populateWorld(world, 500, 100);

    const avgMs = benchmark(() => {
      movementSystem(world, 16, movingInput);
      collisionSystem(world, 20);
      for (const p of world.with("projectile")) {
        p.projectile.consumed = false;
      }
      projectileCollisionSystem(world, 8);
    });

    expect(avgMs).toBeLessThan(10);
  });
});

describe("Performance: Entity Creation/Destruction", () => {
  it("should create 100 entities under 2ms", () => {
    const world = new World<Entity>();

    const avgMs = benchmark(() => {
      const entities: Entity[] = [];
      for (let i = 0; i < 100; i++) {
        entities.push(
          world.add({
            position: { x: Math.random() * 800, y: Math.random() * 600 },
            velocity: { vx: 0, vy: 0 },
            enemy: createEnemyConfig(),
            health: { current: 50, max: 50 },
          })
        );
      }
      // Clean up for next iteration
      for (const e of entities) {
        world.remove(e);
      }
    }, 50);

    expect(avgMs).toBeLessThan(2);
  });

  it("should destroy 100 entities under 2ms", () => {
    const world = new World<Entity>();
    const entities: Entity[] = [];
    for (let i = 0; i < 100; i++) {
      entities.push(
        world.add({
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          velocity: { vx: 0, vy: 0 },
          enemy: createEnemyConfig(),
          health: { current: 50, max: 50 },
        })
      );
    }

    const avgMs = benchmark(() => {
      // Remove and re-add for each iteration
      for (const e of entities) {
        world.remove(e);
      }
      entities.length = 0;
      for (let i = 0; i < 100; i++) {
        entities.push(
          world.add({
            position: { x: Math.random() * 800, y: Math.random() * 600 },
            velocity: { vx: 0, vy: 0 },
            enemy: createEnemyConfig(),
            health: { current: 50, max: 50 },
          })
        );
      }
    }, 50);

    expect(avgMs).toBeLessThan(2);
  });
});
