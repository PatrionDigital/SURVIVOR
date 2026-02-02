import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  projectileMovementSystem,
  projectileLifetimeSystem,
  spawnProjectile,
} from "./ProjectileSystem";
import { createGameWorld } from "../ecs/World";
import type { WeaponConfig } from "./types";

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

const mockWeaponConfig: WeaponConfig = {
  id: "basic-shot",
  name: "Basic Shot",
  damage: 10,
  cooldown: 500,
  projectileSpeed: 400,
  projectileLifetime: 2000,
  range: 500,
  visual: { color: 0x00ff00, radius: 5 },
  projectilesPerShot: 1,
  spreadAngle: 0,
  pierce: 0,
};

describe("ProjectileSystem", () => {
  let world: ReturnType<typeof createGameWorld>;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe("spawnProjectile", () => {
    it("should create projectile entity with correct components", () => {
      const container = { addChild: vi.fn() };

      const entity = spawnProjectile(
        world,
        container as never,
        "player",
        { x: 100, y: 100 },
        { x: 1, y: 0 }, // direction
        mockWeaponConfig.damage,
        mockWeaponConfig.projectileSpeed,
        mockWeaponConfig.projectileLifetime,
        mockWeaponConfig.visual
      );

      expect(entity.position).toBeDefined();
      expect(entity.position!.x).toBe(100);
      expect(entity.position!.y).toBe(100);
    });

    it("should set velocity based on direction and speed", () => {
      const container = { addChild: vi.fn() };

      const entity = spawnProjectile(
        world,
        container as never,
        "player",
        { x: 0, y: 0 },
        { x: 1, y: 0 }, // right direction
        10,
        400, // speed
        2000,
        { color: 0xffffff, radius: 5 }
      );

      expect(entity.velocity).toBeDefined();
      expect(entity.velocity!.vx).toBe(400); // speed * direction.x
      expect(entity.velocity!.vy).toBe(0);
    });

    it("should normalize direction vector", () => {
      const container = { addChild: vi.fn() };

      // Diagonal direction (1, 1) should be normalized
      const entity = spawnProjectile(
        world,
        container as never,
        "player",
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        10,
        100,
        2000,
        { color: 0xffffff, radius: 5 }
      );

      // Normalized (1,1) is approximately (0.707, 0.707)
      const expectedSpeed = 100 / Math.sqrt(2);
      expect(entity.velocity!.vx).toBeCloseTo(expectedSpeed, 1);
      expect(entity.velocity!.vy).toBeCloseTo(expectedSpeed, 1);
    });

    it("should set projectile component with correct faction", () => {
      const container = { addChild: vi.fn() };

      const playerProjectile = spawnProjectile(
        world,
        container as never,
        "player",
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        10,
        400,
        2000,
        { color: 0xffffff, radius: 5 }
      );

      const enemyProjectile = spawnProjectile(
        world,
        container as never,
        "enemy",
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        5,
        200,
        1500,
        { color: 0xff0000, radius: 8 }
      );

      expect(playerProjectile.projectile!.faction).toBe("player");
      expect(enemyProjectile.projectile!.faction).toBe("enemy");
    });

    it("should set projectile damage and lifetime", () => {
      const container = { addChild: vi.fn() };

      const entity = spawnProjectile(
        world,
        container as never,
        "player",
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        25, // damage
        400,
        3000, // lifetime
        { color: 0xffffff, radius: 5 }
      );

      expect(entity.projectile!.damage).toBe(25);
      expect(entity.projectile!.lifetime).toBe(3000);
      expect(entity.projectile!.maxLifetime).toBe(3000);
      expect(entity.projectile!.consumed).toBe(false);
    });

    it("should add sprite to container", () => {
      const container = { addChild: vi.fn() };

      spawnProjectile(
        world,
        container as never,
        "player",
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        10,
        400,
        2000,
        { color: 0xffffff, radius: 5 }
      );

      expect(container.addChild).toHaveBeenCalled();
    });
  });

  describe("projectileMovementSystem", () => {
    it("should update projectile positions based on velocity", () => {
      const entity = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 200, vy: -100 }, // moving right and up
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      // Update for 100ms
      projectileMovementSystem(world, 100);

      // Position should change by velocity * (delta/1000)
      expect(entity.position!.x).toBe(120); // 100 + 200 * 0.1
      expect(entity.position!.y).toBe(90); // 100 + (-100) * 0.1
    });

    it("should only move entities with projectile component", () => {
      // Regular entity (not a projectile)
      const regularEntity = world.add({
        position: { x: 50, y: 50 },
        velocity: { vx: 100, vy: 100 },
      });

      // Projectile entity
      const projectileEntity = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 100, vy: 100 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      projectileMovementSystem(world, 100);

      // Regular entity should not be affected by projectile system
      expect(regularEntity.position!.x).toBe(50);
      expect(projectileEntity.position!.x).toBe(110);
    });
  });

  describe("projectileLifetimeSystem", () => {
    it("should decrement projectile lifetime", () => {
      const entity = world.add({
        position: { x: 0, y: 0 },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      projectileLifetimeSystem(world, 500);

      expect(entity.projectile!.lifetime).toBe(1500);
    });

    it("should remove projectile when lifetime reaches zero", () => {
      const mockGraphics = { destroy: vi.fn() };

      world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics: mockGraphics as never },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 100,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      // Update past lifetime
      projectileLifetimeSystem(world, 150);

      // Projectile should be removed
      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles).toHaveLength(0);
    });

    it("should destroy sprite graphics when removing projectile", () => {
      const mockGraphics = { destroy: vi.fn() };

      world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics: mockGraphics as never },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 50,
          maxLifetime: 2000,
          consumed: false,
        },
      });

      projectileLifetimeSystem(world, 100);

      expect(mockGraphics.destroy).toHaveBeenCalled();
    });

    it("should remove consumed projectiles", () => {
      const mockGraphics = { destroy: vi.fn() };

      world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics: mockGraphics as never },
        projectile: {
          faction: "player",
          damage: 10,
          lifetime: 2000,
          maxLifetime: 2000,
          consumed: true, // Already hit something
        },
      });

      projectileLifetimeSystem(world, 16);

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles).toHaveLength(0);
    });
  });
});
