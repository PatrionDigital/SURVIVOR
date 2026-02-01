import { describe, it, expect, vi, beforeEach } from "vitest";
import { Vehicle } from "yuka";
import { PlayerWeaponSystem } from "./PlayerWeaponSystem";
import { createGameWorld } from "../ecs/World";
import type { WeaponConfig } from "./types";
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

const basicWeaponConfig: WeaponConfig = {
  id: "basic-shot",
  name: "Basic Shot",
  damage: 10,
  cooldown: 500,
  projectileSpeed: 400,
  projectileLifetime: 2000,
  visual: { color: 0x00ff00, radius: 5 },
  projectilesPerShot: 1,
  spreadAngle: 0,
  pierce: 0,
};

const spreadWeaponConfig: WeaponConfig = {
  id: "spread-shot",
  name: "Spread Shot",
  damage: 8,
  cooldown: 600,
  projectileSpeed: 350,
  projectileLifetime: 1500,
  visual: { color: 0xffff00, radius: 4 },
  projectilesPerShot: 3,
  spreadAngle: 30,
  pierce: 0,
};

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

describe("PlayerWeaponSystem", () => {
  let world: ReturnType<typeof createGameWorld>;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe("Initialization", () => {
    it("should create with weapon config", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      expect(system).toBeDefined();
    });

    it("should start with full cooldown", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      expect(system.getCooldownRemaining()).toBe(0); // Ready to fire immediately
    });
  });

  describe("Auto-aim targeting", () => {
    it("should find nearest enemy", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      // Player at origin
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy far away
      const vehicle1 = new Vehicle();
      world.add({
        position: { x: 200, y: 0 },
        enemy: {
          vehicle: vehicle1,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Enemy closer
      const vehicle2 = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle: vehicle2,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const target = system.findNearestEnemy({ x: 0, y: 0 });

      expect(target).toBeDefined();
      expect(target!.x).toBe(100);
    });

    it("should return null when no enemies", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      const target = system.findNearestEnemy({ x: 0, y: 0 });

      expect(target).toBeNull();
    });
  });

  describe("Firing", () => {
    it("should fire projectile at nearest enemy", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      // Player
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      system.update(16, { x: 0, y: 0 }); // 16ms delta

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(1);
      expect(projectiles[0].projectile!.faction).toBe("player");
    });

    it("should not fire when on cooldown", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      // Player
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Fire once
      system.update(16, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(1);

      // Try to fire again immediately
      system.update(16, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(1); // Still 1
    });

    it("should fire again after cooldown expires", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(
        world,
        container as never,
        basicWeaponConfig // 500ms cooldown
      );

      // Player
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Fire once
      system.update(16, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(1);

      // Wait for cooldown
      system.update(600, { x: 0, y: 0 }); // 600ms
      expect(Array.from(world.with("projectile")).length).toBe(2);
    });

    it("should not fire when no enemies in range", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      // Player only, no enemies
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      system.update(16, { x: 0, y: 0 });

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(0);
    });
  });

  describe("Spread shot", () => {
    it("should fire multiple projectiles with spread", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(
        world,
        container as never,
        spreadWeaponConfig // 3 projectiles, 30 degree spread
      );

      // Player
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy to the right
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      system.update(16, { x: 0, y: 0 });

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(3);
    });

    it("should distribute projectiles within spread angle", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, spreadWeaponConfig);

      // Player
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy directly to the right
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      system.update(16, { x: 0, y: 0 });

      const projectiles = Array.from(world.with("projectile"));

      // All projectiles should have different velocities
      const velocities = projectiles.map((p) => ({
        vx: p.velocity!.vx,
        vy: p.velocity!.vy,
      }));

      // Center projectile should go mostly right
      // Side projectiles should have some y component
      const hasVariedVelocities = velocities.some((v) => v.vy !== 0);
      expect(hasVariedVelocities).toBe(true);
    });
  });

  describe("Weapon config", () => {
    it("should update weapon config", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      const upgradedConfig: WeaponConfig = {
        ...basicWeaponConfig,
        damage: 20,
        cooldown: 300,
      };

      system.setWeaponConfig(upgradedConfig);

      expect(system.getWeaponConfig().damage).toBe(20);
      expect(system.getWeaponConfig().cooldown).toBe(300);
    });
  });
});
