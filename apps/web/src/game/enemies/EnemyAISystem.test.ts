import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntityManager, Vehicle } from "yuka";
import { enemyAISystem } from "./EnemyAISystem";
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

describe("EnemyAISystem", () => {
  let world: ReturnType<typeof createGameWorld>;
  let yukaManager: EntityManager;

  beforeEach(() => {
    world = createGameWorld();
    yukaManager = new EntityManager();
  });

  describe("Yuka EntityManager update", () => {
    it("should update Yuka EntityManager with delta time", () => {
      const updateSpy = vi.spyOn(yukaManager, "update");

      enemyAISystem(world, yukaManager, 16, null);

      // Delta is converted from ms to seconds
      expect(updateSpy).toHaveBeenCalledWith(0.016);
    });
  });

  describe("Position sync from Yuka to ECS", () => {
    it("should sync Yuka Vehicle position to ECS position", () => {
      // Create a vehicle and move it
      const vehicle = new Vehicle();
      vehicle.position.set(100, 200, 0);

      // Create enemy entity with the vehicle
      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle);

      // Run the system
      enemyAISystem(world, yukaManager, 16, null);

      // Position should be synced from Yuka
      expect(entity.position!.x).toBe(100);
      expect(entity.position!.y).toBe(200);
    });

    it("should sync velocity from Yuka Vehicle to ECS after update", () => {
      const vehicle = new Vehicle();
      vehicle.position.set(0, 0, 0);

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle);

      // Run the system
      enemyAISystem(world, yukaManager, 16, null);

      // ECS velocity should match what Yuka computed (synced from vehicle)
      expect(entity.velocity!.vx).toBe(vehicle.velocity.x);
      expect(entity.velocity!.vy).toBe(vehicle.velocity.y);
    });
  });

  describe("Behavior switching", () => {
    it("should switch to seeking when player is in range", () => {
      const vehicle = new Vehicle();
      vehicle.position.set(100, 100, 0);

      const entity = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle);

      // Player at 200, 100 - distance is 100, within vision range 250
      const playerPos = { x: 200, y: 100 };

      enemyAISystem(world, yukaManager, 16, playerPos);

      expect(entity.enemy!.currentBehavior).toBe("seeking");
    });

    it("should stay in flocking when player is out of range", () => {
      const vehicle = new Vehicle();
      vehicle.position.set(0, 0, 0);

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle);

      // Player at 500, 500 - distance is ~707, outside vision range 250
      const playerPos = { x: 500, y: 500 };

      enemyAISystem(world, yukaManager, 16, playerPos);

      expect(entity.enemy!.currentBehavior).toBe("flocking");
    });

    it("should stay in flocking when no player position provided", () => {
      const vehicle = new Vehicle();
      vehicle.position.set(0, 0, 0);

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle);

      enemyAISystem(world, yukaManager, 16, null);

      expect(entity.enemy!.currentBehavior).toBe("flocking");
    });

    it("should switch back to flocking when player leaves range", () => {
      const vehicle = new Vehicle();
      vehicle.position.set(0, 0, 0);

      const entity = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "seeking",
        },
      });

      yukaManager.add(vehicle);

      // Player far away
      const playerPos = { x: 1000, y: 1000 };

      enemyAISystem(world, yukaManager, 16, playerPos);

      expect(entity.enemy!.currentBehavior).toBe("flocking");
    });
  });

  describe("Multiple enemies", () => {
    it("should process all enemy entities", () => {
      const vehicle1 = new Vehicle();
      vehicle1.position.set(10, 20, 0);

      const vehicle2 = new Vehicle();
      vehicle2.position.set(30, 40, 0);

      const entity1 = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle: vehicle1,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      const entity2 = world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle: vehicle2,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle1);
      yukaManager.add(vehicle2);

      enemyAISystem(world, yukaManager, 16, null);

      expect(entity1.position!.x).toBe(10);
      expect(entity1.position!.y).toBe(20);
      expect(entity2.position!.x).toBe(30);
      expect(entity2.position!.y).toBe(40);
    });
  });

  describe("Edge cases", () => {
    it("should handle entity without position component", () => {
      const vehicle = new Vehicle();

      world.add({
        velocity: { vx: 0, vy: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle);

      // Should not throw
      expect(() => enemyAISystem(world, yukaManager, 16, null)).not.toThrow();
    });

    it("should handle entity without velocity component", () => {
      const vehicle = new Vehicle();

      world.add({
        position: { x: 0, y: 0 },
        enemy: {
          vehicle,
          config: mockConfig,
          currentBehavior: "flocking",
        },
      });

      yukaManager.add(vehicle);

      // Should not throw
      expect(() => enemyAISystem(world, yukaManager, 16, null)).not.toThrow();
    });
  });
});
