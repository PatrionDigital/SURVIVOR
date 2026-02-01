import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntityManager, Vehicle } from "yuka";
import { enemyDeathSystem } from "./EnemyDeathSystem";
import { createGameWorld } from "../ecs/World";
import type { EnemyTypeConfig } from "./types";
import { Graphics } from "pixi.js";

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

describe("EnemyDeathSystem", () => {
  let world: ReturnType<typeof createGameWorld>;
  let yukaManager: EntityManager;

  beforeEach(() => {
    world = createGameWorld();
    yukaManager = new EntityManager();
  });

  describe("Enemy death detection", () => {
    it("should detect dead enemy (health = 0)", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 0, max: 30 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = enemyDeathSystem(world, yukaManager);

      expect(result.killedCount).toBe(1);
    });

    it("should detect dead enemy (health < 0)", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: -5, max: 30 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = enemyDeathSystem(world, yukaManager);

      expect(result.killedCount).toBe(1);
    });

    it("should not detect living enemy", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 15, max: 30 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const result = enemyDeathSystem(world, yukaManager);

      expect(result.killedCount).toBe(0);
    });
  });

  describe("XP rewards", () => {
    it("should return XP value for killed enemy", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 0, max: 30 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig, // xpValue: 10
          currentBehavior: "flocking",
        },
      });

      const result = enemyDeathSystem(world, yukaManager);

      expect(result.totalXP).toBe(10);
    });

    it("should sum XP for multiple killed enemies", () => {
      const vehicle1 = new Vehicle();
      const graphics1 = new Graphics();
      yukaManager.add(vehicle1);

      const vehicle2 = new Vehicle();
      const graphics2 = new Graphics();
      yukaManager.add(vehicle2);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 0, max: 30 },
        sprite: { graphics: graphics1 },
        enemy: {
          vehicle: vehicle1,
          config: mockConfig, // xpValue: 10
          currentBehavior: "flocking",
        },
      });

      const highXPConfig = { ...mockConfig, combat: { ...mockConfig.combat, xpValue: 25 } };
      world.add({
        position: { x: 200, y: 200 },
        health: { current: 0, max: 30 },
        sprite: { graphics: graphics2 },
        enemy: {
          vehicle: vehicle2,
          config: highXPConfig, // xpValue: 25
          currentBehavior: "flocking",
        },
      });

      const result = enemyDeathSystem(world, yukaManager);

      expect(result.totalXP).toBe(35); // 10 + 25
      expect(result.killedCount).toBe(2);
    });
  });

  describe("Cleanup", () => {
    it("should remove dead enemy from ECS world", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 0, max: 30 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      enemyDeathSystem(world, yukaManager);

      const enemies = Array.from(world.with("enemy"));
      expect(enemies).toHaveLength(0);
    });

    it("should remove Vehicle from Yuka EntityManager", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 0, max: 30 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      enemyDeathSystem(world, yukaManager);

      const vehicles = Array.from(yukaManager.entities);
      expect(vehicles).not.toContain(vehicle);
    });

    it("should destroy sprite graphics", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      const destroySpy = vi.spyOn(graphics, "destroy");
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 0, max: 30 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      enemyDeathSystem(world, yukaManager);

      expect(destroySpy).toHaveBeenCalled();
    });

    it("should keep living enemies", () => {
      const deadVehicle = new Vehicle();
      const deadGraphics = new Graphics();
      yukaManager.add(deadVehicle);

      const livingVehicle = new Vehicle();
      const livingGraphics = new Graphics();
      yukaManager.add(livingVehicle);

      world.add({
        position: { x: 100, y: 100 },
        health: { current: 0, max: 30 },
        sprite: { graphics: deadGraphics },
        enemy: {
          vehicle: deadVehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const livingEntity = world.add({
        position: { x: 200, y: 200 },
        health: { current: 15, max: 30 },
        sprite: { graphics: livingGraphics },
        enemy: {
          vehicle: livingVehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      enemyDeathSystem(world, yukaManager);

      const enemies = Array.from(world.with("enemy"));
      expect(enemies).toHaveLength(1);
      expect(enemies).toContain(livingEntity);
    });
  });

  describe("Edge cases", () => {
    it("should handle enemy without health component", () => {
      const vehicle = new Vehicle();
      const graphics = new Graphics();
      yukaManager.add(vehicle);

      world.add({
        position: { x: 100, y: 100 },
        sprite: { graphics },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      // Should not throw, and should not kill enemy without health
      const result = enemyDeathSystem(world, yukaManager);

      expect(result.killedCount).toBe(0);
      const enemies = Array.from(world.with("enemy"));
      expect(enemies).toHaveLength(1);
    });

    it("should handle no enemies", () => {
      const result = enemyDeathSystem(world, yukaManager);

      expect(result.killedCount).toBe(0);
      expect(result.totalXP).toBe(0);
    });
  });
});
