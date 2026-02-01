import { describe, it, expect, vi, beforeEach } from "vitest";
import { Vehicle } from "yuka";
import { enemyAttackSystem } from "./EnemyAttackSystem";
import { createGameWorld } from "../ecs/World";
import type { EnemyTypeConfig } from "../enemies/types";

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
    position: { x: 0, y: 0 },
  })),
}));

// Ranged enemy config
const rangedEnemyConfig: EnemyTypeConfig = {
  id: "ranged",
  name: "Ranged Enemy",
  visual: { color: 0xff4444, radius: 15 },
  combat: { damage: 5, health: 20, xpValue: 15 },
  movement: { maxSpeed: 50, maxForce: 40, mass: 1.0 },
  flocking: { alignment: 0.8, cohesion: 1.0, separation: 1.2 },
  vision: { range: 300, fieldOfView: 360 },
  behavior: { seekWeight: 0.5 },
};

describe("EnemyAttackSystem", () => {
  let world: ReturnType<typeof createGameWorld>;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe("Ranged attacks", () => {
    it("should fire projectile at player when in range", () => {
      const container = { addChild: vi.fn() };

      // Player
      world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Ranged enemy with attack capability
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Configure attack params (could be part of enemy config in the future)
      const attackConfig = {
        cooldown: 1000,
        range: 200,
        projectileSpeed: 200,
        projectileLifetime: 2000,
        projectileDamage: 5,
        visual: { color: 0xff0000, radius: 6 },
      };

      enemyAttackSystem(world, container as never, 16, attackConfig);

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(1);
      expect(projectiles[0].projectile!.faction).toBe("enemy");
    });

    it("should not fire when player out of range", () => {
      const container = { addChild: vi.fn() };

      // Player far away
      world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Enemy too far to attack
      const vehicle = new Vehicle();
      world.add({
        position: { x: 500, y: 0 },
        enemy: {
          vehicle,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const attackConfig = {
        cooldown: 1000,
        range: 200, // Player is 500 away, out of range
        projectileSpeed: 200,
        projectileLifetime: 2000,
        projectileDamage: 5,
        visual: { color: 0xff0000, radius: 6 },
      };

      enemyAttackSystem(world, container as never, 16, attackConfig);

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(0);
    });

    it("should respect cooldown between attacks", () => {
      const container = { addChild: vi.fn() };

      // Player
      world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Ranged enemy
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const attackConfig = {
        cooldown: 1000,
        range: 200,
        projectileSpeed: 200,
        projectileLifetime: 2000,
        projectileDamage: 5,
        visual: { color: 0xff0000, radius: 6 },
      };

      // First attack
      enemyAttackSystem(world, container as never, 16, attackConfig);
      expect(Array.from(world.with("projectile")).length).toBe(1);

      // Try again immediately - should be on cooldown
      enemyAttackSystem(world, container as never, 16, attackConfig);
      expect(Array.from(world.with("projectile")).length).toBe(1);
    });

    it("should fire again after cooldown expires", () => {
      const container = { addChild: vi.fn() };

      // Player
      world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Ranged enemy
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const attackConfig = {
        cooldown: 500,
        range: 200,
        projectileSpeed: 200,
        projectileLifetime: 2000,
        projectileDamage: 5,
        visual: { color: 0xff0000, radius: 6 },
      };

      // First attack
      enemyAttackSystem(world, container as never, 16, attackConfig);
      expect(Array.from(world.with("projectile")).length).toBe(1);

      // Wait for cooldown (500ms+)
      enemyAttackSystem(world, container as never, 600, attackConfig);
      expect(Array.from(world.with("projectile")).length).toBe(2);
    });

    it("should fire projectile towards player", () => {
      const container = { addChild: vi.fn() };

      // Player at origin
      world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Enemy to the right of player
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const attackConfig = {
        cooldown: 1000,
        range: 200,
        projectileSpeed: 200,
        projectileLifetime: 2000,
        projectileDamage: 5,
        visual: { color: 0xff0000, radius: 6 },
      };

      enemyAttackSystem(world, container as never, 16, attackConfig);

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(1);

      // Projectile should be moving towards player (negative x direction)
      expect(projectiles[0].velocity!.vx).toBeLessThan(0);
    });

    it("should not fire when no player exists", () => {
      const container = { addChild: vi.fn() };

      // No player, just enemy
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const attackConfig = {
        cooldown: 1000,
        range: 200,
        projectileSpeed: 200,
        projectileLifetime: 2000,
        projectileDamage: 5,
        visual: { color: 0xff0000, radius: 6 },
      };

      enemyAttackSystem(world, container as never, 16, attackConfig);

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(0);
    });
  });

  describe("Multiple enemies", () => {
    it("should allow multiple enemies to attack independently", () => {
      const container = { addChild: vi.fn() };

      // Player
      world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Two enemies in range
      const vehicle1 = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle: vehicle1,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const vehicle2 = new Vehicle();
      world.add({
        position: { x: 0, y: 100 },
        enemy: {
          vehicle: vehicle2,
          config: rangedEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const attackConfig = {
        cooldown: 1000,
        range: 200,
        projectileSpeed: 200,
        projectileLifetime: 2000,
        projectileDamage: 5,
        visual: { color: 0xff0000, radius: 6 },
      };

      enemyAttackSystem(world, container as never, 16, attackConfig);

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(2); // Both enemies attack
    });
  });
});
