import { describe, it, expect, vi, beforeEach } from "vitest";
import { Vehicle } from "yuka";
import { projectileCollisionSystem } from "./ProjectileCollisionSystem";
import { createGameWorld } from "../ecs/World";
import type { EnemyTypeConfig } from "../enemies/types";

// Mock PixiJS
vi.mock("pixi.js", () => ({
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  })),
}));

const mockEnemyConfig: EnemyTypeConfig = {
  id: "basic",
  name: "Basic Enemy",
  visual: { color: 0xff4444, radius: 15 },
  combat: { damage: 10, health: 30, xpValue: 10 },
  movement: { maxSpeed: 100, maxForce: 80, mass: 1.0 },
  flocking: { alignment: 0.8, cohesion: 1.0, separation: 1.2 },
  vision: { range: 250, fieldOfView: 360 },
  behavior: { seekWeight: 1.5 },
};

describe("ProjectileCollisionSystem", () => {
  let world: ReturnType<typeof createGameWorld>;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe("Player projectile vs Enemy", () => {
    it("should detect collision between player projectile and enemy", () => {
      // Player projectile at (100, 100) with radius 5
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      // Enemy at (105, 100) with radius 15 - overlapping
      const vehicle = new Vehicle();
      world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const result = projectileCollisionSystem(world, 5); // projectile radius 5

      expect(result.enemiesHit).toBe(1);
      expect(result.totalDamageDealt).toBe(10);
    });

    it("should damage enemy on hit", () => {
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 15,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      const vehicle = new Vehicle();
      const enemy = world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      projectileCollisionSystem(world, 5);

      expect(enemy.health!.current).toBe(15); // 30 - 15
    });

    it("should mark projectile as consumed after hit", () => {
      const projectile = world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      const vehicle = new Vehicle();
      world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      projectileCollisionSystem(world, 5);

      expect(projectile.projectile!.consumed).toBe(true);
    });

    it("should not hit enemies far away", () => {
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      const vehicle = new Vehicle();
      const enemy = world.add({
        position: { x: 200, y: 100 }, // Far away
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const result = projectileCollisionSystem(world, 5);

      expect(result.enemiesHit).toBe(0);
      expect(enemy.health!.current).toBe(30); // Unchanged
    });
  });

  describe("Enemy projectile vs Player", () => {
    it("should detect collision between enemy projectile and player", () => {
      // Enemy projectile
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "enemy",
          damage: 5,
          lifetime: 1500,
          maxLifetime: 1500,
          consumed: false,
        },
      });

      // Player
      world.add({
        position: { x: 105, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      const result = projectileCollisionSystem(world, 5, 20); // projectile radius 5, player radius 20

      expect(result.playerHit).toBe(true);
      expect(result.playerDamageTaken).toBe(5);
    });

    it("should damage player on hit", () => {
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "enemy",
          damage: 8,
          lifetime: 1500,
          maxLifetime: 1500,
          consumed: false,
        },
      });

      const player = world.add({
        position: { x: 105, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      projectileCollisionSystem(world, 5, 20);

      expect(player.health!.current).toBe(92); // 100 - 8
    });

    it("should mark enemy projectile as consumed after hitting player", () => {
      const projectile = world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "enemy",
          damage: 5,
          lifetime: 1500,
          maxLifetime: 1500,
          consumed: false,
        },
      });

      world.add({
        position: { x: 105, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      projectileCollisionSystem(world, 5, 20);

      expect(projectile.projectile!.consumed).toBe(true);
    });

    it("should not hit invincible player", () => {
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "enemy",
          damage: 10,
          lifetime: 1500,
          maxLifetime: 1500,
          consumed: false,
        },
      });

      const player = world.add({
        position: { x: 105, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
        invincibility: { remaining: 500, duration: 1000 },
      });

      const result = projectileCollisionSystem(world, 5, 20);

      expect(result.playerHit).toBe(false);
      expect(player.health!.current).toBe(100); // Unchanged
    });
  });

  describe("Faction filtering", () => {
    it("should not damage enemies with enemy projectiles", () => {
      // Enemy projectile
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "enemy",
          damage: 10,
          lifetime: 1500,
          maxLifetime: 1500,
          consumed: false,
        },
      });

      // Enemy
      const vehicle = new Vehicle();
      const enemy = world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const result = projectileCollisionSystem(world, 5);

      expect(result.enemiesHit).toBe(0);
      expect(enemy.health!.current).toBe(30); // Unchanged
    });

    it("should not damage player with player projectiles", () => {
      // Player projectile
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      // Player
      const player = world.add({
        position: { x: 105, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      const result = projectileCollisionSystem(world, 5, 20);

      expect(result.playerHit).toBe(false);
      expect(player.health!.current).toBe(100); // Unchanged
    });
  });

  describe("Pierce mechanics", () => {
    it("should hit multiple enemies if pierce > 0", () => {
      // Piercing projectile
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
          pierceRemaining: 2,
        },
      });

      // Two overlapping enemies
      const vehicle1 = new Vehicle();
      world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle: vehicle1,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const vehicle2 = new Vehicle();
      world.add({
        position: { x: 108, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle: vehicle2,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const result = projectileCollisionSystem(world, 5);

      expect(result.enemiesHit).toBe(2);
    });

    it("should decrement pierce on each hit", () => {
      const projectile = world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
          pierceRemaining: 3,
        },
      });

      const vehicle = new Vehicle();
      world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      projectileCollisionSystem(world, 5);

      expect(projectile.projectile!.pierceRemaining).toBe(2);
    });

    it("should consume projectile when pierce reaches 0", () => {
      const projectile = world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
          pierceRemaining: 1,
        },
      });

      const vehicle = new Vehicle();
      world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      projectileCollisionSystem(world, 5);

      expect(projectile.projectile!.consumed).toBe(true);
    });
  });

  describe("Skip consumed projectiles", () => {
    it("should skip already consumed projectiles", () => {
      world.add({
        position: { x: 100, y: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: true, // Already consumed
        },
      });

      const vehicle = new Vehicle();
      const enemy = world.add({
        position: { x: 105, y: 100 },
        health: { current: 30, max: 30 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const result = projectileCollisionSystem(world, 5);

      expect(result.enemiesHit).toBe(0);
      expect(enemy.health!.current).toBe(30);
    });
  });
});
