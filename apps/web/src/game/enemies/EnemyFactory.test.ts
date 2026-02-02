import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntityManager } from "yuka";
import { createEnemy, destroyEnemy } from "./EnemyFactory";
import { createGameWorld } from "../ecs/World";
import type { EnemyTypeConfig } from "./types";

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

describe("EnemyFactory", () => {
  let world: ReturnType<typeof createGameWorld>;
  let yukaManager: EntityManager;
  let mockContainer: { addChild: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    world = createGameWorld();
    yukaManager = new EntityManager();
    mockContainer = { addChild: vi.fn() };
  });

  describe("createEnemy", () => {
    it("should create an entity with position component", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 100,
        y: 200,
      });

      expect(entity.position).toBeDefined();
      expect(entity.position!.x).toBe(100);
      expect(entity.position!.y).toBe(200);
    });

    it("should create an entity with velocity component", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      expect(entity.velocity).toBeDefined();
      expect(entity.velocity!.vx).toBe(0);
      expect(entity.velocity!.vy).toBe(0);
    });

    it("should create an entity with health from config", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      expect(entity.health).toBeDefined();
      expect(entity.health!.current).toBe(30);
      expect(entity.health!.max).toBe(30);
    });

    it("should create an entity with sprite component", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      expect(entity.sprite).toBeDefined();
      expect(entity.sprite!.graphics).toBeDefined();
    });

    it("should create an entity with enemy AI component", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      expect(entity.enemy).toBeDefined();
      expect(entity.enemy!.vehicle).toBeDefined();
      expect(entity.enemy!.config).toBe(mockConfig);
      expect(entity.enemy!.currentBehavior).toBe("seeking");
    });

    it("should configure Yuka Vehicle with movement settings", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      const vehicle = entity.enemy!.vehicle;
      expect(vehicle.maxSpeed).toBe(100);
      expect(vehicle.maxForce).toBe(80);
      expect(vehicle.mass).toBe(1.0);
    });

    it("should set Yuka Vehicle position", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 150,
        y: 250,
      });

      const vehicle = entity.enemy!.vehicle;
      expect(vehicle.position.x).toBe(150);
      expect(vehicle.position.y).toBe(250);
      expect(vehicle.position.z).toBe(0);
    });

    it("should add Vehicle to Yuka EntityManager", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      // Check that the vehicle is in the manager
      const vehicles = Array.from(yukaManager.entities);
      expect(vehicles).toContain(entity.enemy!.vehicle);
    });

    it("should add sprite to container", () => {
      createEnemy(world, yukaManager, mockContainer as never, mockConfig, { x: 0, y: 0 });

      expect(mockContainer.addChild).toHaveBeenCalled();
    });

    it("should add entity to ECS world", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      const enemies = Array.from(world.with("enemy"));
      expect(enemies).toContain(entity);
    });

    it("should add flocking behaviors to vehicle", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      const vehicle = entity.enemy!.vehicle;
      // Vehicle should have steering behaviors
      expect(vehicle.steering).toBeDefined();
    });
  });

  describe("destroyEnemy", () => {
    it("should remove entity from ECS world", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      destroyEnemy(world, yukaManager, entity);

      const enemies = Array.from(world.with("enemy"));
      expect(enemies).not.toContain(entity);
    });

    it("should remove Vehicle from Yuka EntityManager", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      const vehicle = entity.enemy!.vehicle;
      destroyEnemy(world, yukaManager, entity);

      const vehicles = Array.from(yukaManager.entities);
      expect(vehicles).not.toContain(vehicle);
    });

    it("should destroy sprite graphics", () => {
      const entity = createEnemy(world, yukaManager, mockContainer as never, mockConfig, {
        x: 0,
        y: 0,
      });

      const destroySpy = vi.spyOn(entity.sprite!.graphics, "destroy");
      destroyEnemy(world, yukaManager, entity);

      expect(destroySpy).toHaveBeenCalled();
    });
  });
});
