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
  range: 500, // 500px targeting range
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
  range: 500, // 500px targeting range
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

    it("should not target enemies outside weapon range", () => {
      const shortRangeConfig: WeaponConfig = {
        ...basicWeaponConfig,
        range: 150, // Short range
      };
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, shortRangeConfig);

      // Player at origin
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy outside range at 200px
      const vehicle = new Vehicle();
      world.add({
        position: { x: 200, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const target = system.findNearestEnemy({ x: 0, y: 0 });

      expect(target).toBeNull(); // Should not find enemy outside range
    });

    it("should target enemies within weapon range", () => {
      const shortRangeConfig: WeaponConfig = {
        ...basicWeaponConfig,
        range: 150, // Short range
      };
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, shortRangeConfig);

      // Player at origin
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Enemy inside range at 100px
      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const target = system.findNearestEnemy({ x: 0, y: 0 });

      expect(target).toBeDefined();
      expect(target!.x).toBe(100);
    });

    it("should prefer closer enemy within range over farther one", () => {
      const shortRangeConfig: WeaponConfig = {
        ...basicWeaponConfig,
        range: 300, // Medium range
      };
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, shortRangeConfig);

      // Player at origin
      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      // Close enemy at 100px
      const vehicle1 = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle: vehicle1,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Farther enemy at 250px (still in range)
      const vehicle2 = new Vehicle();
      world.add({
        position: { x: 250, y: 0 },
        enemy: {
          vehicle: vehicle2,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Enemy outside range at 400px
      const vehicle3 = new Vehicle();
      world.add({
        position: { x: 400, y: 0 },
        enemy: {
          vehicle: vehicle3,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      const target = system.findNearestEnemy({ x: 0, y: 0 });

      expect(target).toBeDefined();
      expect(target!.x).toBe(100); // Should find closest enemy in range
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

  describe("Damage Bonus", () => {
    it("should apply damage bonus to projectile damage", () => {
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

      // Set damage bonus (+5)
      system.setDamageBonus(5);

      system.update(16, { x: 0, y: 0 });

      const projectiles = Array.from(world.with("projectile"));
      expect(projectiles.length).toBe(1);
      // Base damage (10) + bonus (5) = 15
      expect(projectiles[0].projectile!.damage).toBe(basicWeaponConfig.damage + 5);
    });

    it("should default to base damage when no bonus set", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

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
      expect(projectiles[0].projectile!.damage).toBe(basicWeaponConfig.damage);
    });
  });

  describe("Attack Speed Bonus", () => {
    it("should reduce cooldown with attack speed bonus", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Set attack speed bonus (1.0 = doubles fire rate, halves cooldown)
      system.setAttackSpeedBonus(1.0);

      // Fire once
      system.update(16, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(1);

      // Base cooldown is 500ms, with 1.0 bonus: 500 / (1 + 1.0) = 250ms
      // At 260ms, should be able to fire again
      system.update(260, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(2);
    });

    it("should not reduce cooldown below minimum (50ms)", () => {
      const container = { addChild: vi.fn() };
      const system = new PlayerWeaponSystem(world, container as never, basicWeaponConfig);

      world.add({
        position: { x: 0, y: 0 },
        playerControlled: true,
      });

      const vehicle = new Vehicle();
      world.add({
        position: { x: 100, y: 0 },
        enemy: {
          vehicle,
          config: mockEnemyConfig,
          currentBehavior: "flocking",
        },
      });

      // Extreme attack speed bonus
      system.setAttackSpeedBonus(100);

      // Fire once
      system.update(16, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(1);

      // Even with huge bonus, minimum cooldown is 50ms
      // At 30ms, should NOT fire again
      system.update(30, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(1);

      // At 60ms total, should fire
      system.update(30, { x: 0, y: 0 });
      expect(Array.from(world.with("projectile")).length).toBe(2);
    });
  });
});
