import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameScene } from "./GameScene";
import { InputSystem } from "../InputSystem";
import type { Upgrade } from "../leveling";

// Mock PixiJS Graphics
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
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    x: 0,
    y: 0,
    alpha: 1,
  })),
}));

// Helper to create a typed upgrade
function createUpgrade(type: Upgrade["type"], value: number, name?: string): Upgrade {
  return {
    id: `test-${type}`,
    name: name ?? `Test ${type}`,
    description: `Test upgrade for ${type}`,
    type,
    value,
  };
}

describe("GameScene.applyUpgrade", () => {
  let scene: GameScene;
  let inputSystem: InputSystem;

  beforeEach(() => {
    scene = new GameScene();
    inputSystem = new InputSystem();
    scene.setInputSystem(inputSystem);
    scene.resize(800, 600);
    scene.enter();

    // Trigger a level-up so we can apply upgrades
    // Add enough XP to level up (level 1 -> 2 requires 100 XP by default)
    const leveling = scene.getLevelingSystem();
    if (leveling) {
      leveling.addXP(100);
    }
  });

  afterEach(() => {
    inputSystem.destroy();
  });

  describe("Stat tracking via getPlayerStats", () => {
    it("should expose player stats", () => {
      const stats = scene.getPlayerStats();
      expect(stats).toBeDefined();
      expect(stats.damage).toBe(0);
      expect(stats.attackSpeed).toBe(0);
      expect(stats.moveSpeed).toBe(0);
      expect(stats.maxHealth).toBe(0);
      expect(stats.healthRegen).toBe(0);
      expect(stats.pickupRange).toBe(0);
      expect(stats.xpBonus).toBe(0);
    });

    it("should apply damage upgrade to playerStats", () => {
      const upgrade = createUpgrade("damage", 5);
      scene.applyUpgrade(upgrade);

      const stats = scene.getPlayerStats();
      expect(stats.damage).toBe(5);
    });

    it("should apply attackSpeed upgrade to playerStats", () => {
      const upgrade = createUpgrade("attackSpeed", 0.2);
      scene.applyUpgrade(upgrade);

      const stats = scene.getPlayerStats();
      expect(stats.attackSpeed).toBe(0.2);
    });

    it("should apply moveSpeed upgrade to playerStats", () => {
      const upgrade = createUpgrade("moveSpeed", 40);
      scene.applyUpgrade(upgrade);

      const stats = scene.getPlayerStats();
      expect(stats.moveSpeed).toBe(40);
    });

    it("should apply maxHealth upgrade to playerStats and player entity", () => {
      const upgrade = createUpgrade("maxHealth", 25);
      scene.applyUpgrade(upgrade);

      const stats = scene.getPlayerStats();
      expect(stats.maxHealth).toBe(25);

      // Also verify entity health was updated
      const health = scene.getPlayerHealth();
      expect(health.max).toBe(125); // 100 base + 25
    });

    it("should apply healthRegen upgrade to playerStats", () => {
      const upgrade = createUpgrade("healthRegen", 2);
      scene.applyUpgrade(upgrade);

      const stats = scene.getPlayerStats();
      expect(stats.healthRegen).toBe(2);
    });

    it("should apply pickupRange upgrade to playerStats", () => {
      const upgrade = createUpgrade("pickupRange", 25);
      scene.applyUpgrade(upgrade);

      const stats = scene.getPlayerStats();
      expect(stats.pickupRange).toBe(25);
    });

    it("should apply xpBonus upgrade to playerStats", () => {
      const upgrade = createUpgrade("xpBonus", 10);
      scene.applyUpgrade(upgrade);

      const stats = scene.getPlayerStats();
      expect(stats.xpBonus).toBe(10);
    });
  });

  describe("Stat stacking", () => {
    it("should stack multiple upgrades of the same type", () => {
      // Need multiple level-ups for multiple upgrades
      const leveling = scene.getLevelingSystem()!;
      leveling.addXP(500); // Trigger more level-ups

      const upgrade1 = createUpgrade("damage", 5);
      const upgrade2 = createUpgrade("damage", 10);
      scene.applyUpgrade(upgrade1);
      scene.applyUpgrade(upgrade2);

      const stats = scene.getPlayerStats();
      expect(stats.damage).toBe(15); // 5 + 10
    });

    it("should stack different upgrade types independently", () => {
      const leveling = scene.getLevelingSystem()!;
      leveling.addXP(500);

      scene.applyUpgrade(createUpgrade("damage", 5));
      scene.applyUpgrade(createUpgrade("moveSpeed", 20));
      scene.applyUpgrade(createUpgrade("attackSpeed", 0.1));

      const stats = scene.getPlayerStats();
      expect(stats.damage).toBe(5);
      expect(stats.moveSpeed).toBe(20);
      expect(stats.attackSpeed).toBe(0.1);
    });
  });

  describe("System propagation", () => {
    it("should return false when no pending level-ups", () => {
      // Consume the pending level-up
      scene.applyUpgrade(createUpgrade("damage", 5));

      // No more level-ups pending
      const result = scene.applyUpgrade(createUpgrade("damage", 5));
      expect(result).toBe(false);
    });

    it("should track applied upgrades", () => {
      const upgrade = createUpgrade("damage", 5, "Sharp Bullets");
      scene.applyUpgrade(upgrade);

      const applied = scene.getAppliedUpgrades();
      expect(applied.length).toBe(1);
      expect(applied[0].name).toBe("Sharp Bullets");
    });
  });
});
