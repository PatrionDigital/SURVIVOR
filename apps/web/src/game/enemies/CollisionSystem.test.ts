import { describe, it, expect, vi, beforeEach } from "vitest";
import { Vehicle } from "yuka";
import { collisionSystem } from "./CollisionSystem";
import { createGameWorld } from "../ecs/World";
import type { EnemyTypeConfig } from "./types";

// Mock PixiJS
vi.mock("pixi.js", () => ({
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  })),
}));

const mockConfig: EnemyTypeConfig = {
  id: "basic",
  name: "Basic Enemy",
  visual: { color: 0xff4444, radius: 15 },
  combat: { damage: 10, health: 30, xpValue: 10 },
  movement: { maxSpeed: 100, maxForce: 80, mass: 1.0 },
  flocking: { alignment: 0.8, cohesion: 1.0, separation: 1.2 },
  vision: { range: 250, fieldOfView: 360 },
  behavior: { seekWeight: 1.5 },
};

describe("CollisionSystem", () => {
  let world: ReturnType<typeof createGameWorld>;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe("Player-Enemy collision detection", () => {
    it("should detect collision when player and enemy overlap", () => {
      // Player at (100, 100) with radius 20
      world.add({
        position: { x: 100, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Enemy at (110, 100) with radius 15 - overlapping (distance 10 < 20+15)
      const vehicle = new Vehicle();
      world.add({
        position: { x: 110, y: 100 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = collisionSystem(world, 20);

      expect(result.playerHit).toBe(true);
      expect(result.collidingEnemies).toHaveLength(1);
    });

    it("should not detect collision when player and enemy are apart", () => {
      // Player at (100, 100)
      world.add({
        position: { x: 100, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Enemy at (200, 100) - not overlapping (distance 100 > 20+15)
      const vehicle = new Vehicle();
      world.add({
        position: { x: 200, y: 100 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = collisionSystem(world, 20);

      expect(result.playerHit).toBe(false);
      expect(result.collidingEnemies).toHaveLength(0);
    });

    it("should detect multiple enemy collisions", () => {
      world.add({
        position: { x: 100, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Two overlapping enemies
      const vehicle1 = new Vehicle();
      world.add({
        position: { x: 110, y: 100 },
        enemy: {
          vehicle: vehicle1,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const vehicle2 = new Vehicle();
      world.add({
        position: { x: 100, y: 115 },
        enemy: {
          vehicle: vehicle2,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = collisionSystem(world, 20);

      expect(result.playerHit).toBe(true);
      expect(result.collidingEnemies).toHaveLength(2);
    });

    it("should return total damage from all colliding enemies", () => {
      world.add({
        position: { x: 100, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Two overlapping enemies with damage 10 each
      const vehicle1 = new Vehicle();
      world.add({
        position: { x: 110, y: 100 },
        enemy: {
          vehicle: vehicle1,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const vehicle2 = new Vehicle();
      world.add({
        position: { x: 100, y: 115 },
        enemy: {
          vehicle: vehicle2,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = collisionSystem(world, 20);

      expect(result.totalDamage).toBe(20); // 10 + 10
    });
  });

  describe("Edge cases", () => {
    it("should handle no player entity", () => {
      // Only enemies, no player
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 100 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = collisionSystem(world, 20);

      expect(result.playerHit).toBe(false);
      expect(result.collidingEnemies).toHaveLength(0);
    });

    it("should handle no enemies", () => {
      world.add({
        position: { x: 100, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      const result = collisionSystem(world, 20);

      expect(result.playerHit).toBe(false);
      expect(result.collidingEnemies).toHaveLength(0);
    });

    it("should handle player without position", () => {
      world.add({
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 100 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = collisionSystem(world, 20);

      expect(result.playerHit).toBe(false);
    });

    it("should handle enemy without position", () => {
      world.add({
        position: { x: 100, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      const vehicle = new Vehicle();
      world.add({
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      // Should not throw
      const result = collisionSystem(world, 20);
      expect(result.playerHit).toBe(false);
    });

    it("should detect collision at exact boundary (touching)", () => {
      // Player at (0, 0) with radius 20
      world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Enemy at (35, 0) with radius 15 - exactly touching (distance 35 = 20+15)
      const vehicle = new Vehicle();
      world.add({
        position: { x: 35, y: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = collisionSystem(world, 20);

      // At exact boundary, we consider it a collision
      expect(result.playerHit).toBe(true);
    });
  });

  describe("Different enemy radii", () => {
    it("should use enemy config radius for collision detection", () => {
      world.add({
        position: { x: 100, y: 100 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      // Large enemy (radius 30) farther away but still colliding
      const largeConfig = { ...mockConfig, visual: { ...mockConfig.visual, radius: 30 } };
      const vehicle = new Vehicle();
      world.add({
        position: { x: 145, y: 100 },
        enemy: {
          vehicle,
          config: largeConfig,
          currentBehavior: "flocking",
        },
      });

      // Distance 45, player radius 20 + enemy radius 30 = 50
      // So this should be colliding (45 < 50)
      const result = collisionSystem(world, 20);

      expect(result.playerHit).toBe(true);
    });
  });
});
