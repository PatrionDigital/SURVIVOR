import { describe, it, expect, beforeEach } from "vitest";
import { LevelingSystem, DEFAULT_LEVELING_CONFIG } from "./LevelingSystem";

describe("LevelingSystem", () => {
  let system: LevelingSystem;

  beforeEach(() => {
    system = new LevelingSystem();
  });

  describe("Initial state", () => {
    it("should start at level 1", () => {
      expect(system.getLevel()).toBe(1);
    });

    it("should start with 0 XP", () => {
      expect(system.getCurrentXP()).toBe(0);
    });

    it("should not be in level-up state", () => {
      expect(system.isLevelingUp()).toBe(false);
    });
  });

  describe("XP thresholds", () => {
    it("should calculate threshold for level 1 (100 XP)", () => {
      expect(system.getXPThreshold(1)).toBe(100);
    });

    it("should calculate threshold for level 2 (120 XP)", () => {
      // 100 * 1.2 = 120
      expect(system.getXPThreshold(2)).toBe(120);
    });

    it("should calculate threshold for level 5", () => {
      // 100 * 1.2^4 = 207.36 -> 207
      expect(system.getXPThreshold(5)).toBe(207);
    });

    it("should calculate threshold for level 10", () => {
      // 100 * 1.2^9 = 515.97 -> 515 (floor)
      expect(system.getXPThreshold(10)).toBe(515);
    });
  });

  describe("Adding XP", () => {
    it("should add XP without leveling up", () => {
      const result = system.addXP(50);

      expect(system.getCurrentXP()).toBe(50);
      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBe(1);
    });

    it("should trigger level up when reaching threshold", () => {
      const result = system.addXP(100);

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(system.getLevel()).toBe(2);
    });

    it("should carry over excess XP after level up", () => {
      system.addXP(120); // 100 to level up, 20 carried over

      expect(system.getLevel()).toBe(2);
      expect(system.getCurrentXP()).toBe(20);
    });

    it("should handle multiple level ups at once", () => {
      // Level 1 needs 100, Level 2 needs 120, Level 3 needs 144
      // Total for levels 1-3: 100 + 120 + 144 = 364
      const result = system.addXP(400);

      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(3);
      expect(system.getLevel()).toBe(4);
    });

    it("should return levels gained count", () => {
      const result = system.addXP(250); // Should gain 2 levels

      expect(result.levelsGained).toBe(2);
    });
  });

  describe("Level-up state", () => {
    it("should enter level-up state when leveling up", () => {
      system.addXP(100);

      expect(system.isLevelingUp()).toBe(true);
    });

    it("should provide pending level ups count", () => {
      system.addXP(400); // Multiple levels

      expect(system.getPendingLevelUps()).toBeGreaterThan(0);
    });

    it("should consume one pending level up", () => {
      system.addXP(250); // Gain 2 levels
      const pending = system.getPendingLevelUps();

      system.consumeLevelUp();

      expect(system.getPendingLevelUps()).toBe(pending - 1);
    });

    it("should exit level-up state when all level ups consumed", () => {
      system.addXP(100); // Gain 1 level
      system.consumeLevelUp();

      expect(system.isLevelingUp()).toBe(false);
    });

    it("should not consume if no pending level ups", () => {
      const result = system.consumeLevelUp();

      expect(result).toBe(false);
    });
  });

  describe("Custom configuration", () => {
    it("should use custom base XP threshold", () => {
      const customSystem = new LevelingSystem({ baseXPThreshold: 50 });

      expect(customSystem.getXPThreshold(1)).toBe(50);
    });

    it("should use custom scaling factor", () => {
      const customSystem = new LevelingSystem({
        baseXPThreshold: 100,
        scalingFactor: 1.5,
      });

      // 100 * 1.5 = 150
      expect(customSystem.getXPThreshold(2)).toBe(150);
    });

    it("should respect max level", () => {
      const customSystem = new LevelingSystem({ maxLevel: 5 });

      // Add enough XP to exceed max level
      customSystem.addXP(10000);

      expect(customSystem.getLevel()).toBe(5);
    });
  });

  describe("Progress calculation", () => {
    it("should calculate progress percentage", () => {
      system.addXP(50); // 50% of 100 needed for level 2

      expect(system.getProgressPercent()).toBe(50);
    });

    it("should calculate progress at 0%", () => {
      expect(system.getProgressPercent()).toBe(0);
    });

    it("should return XP needed for next level", () => {
      system.addXP(30);

      expect(system.getXPToNextLevel()).toBe(70); // 100 - 30
    });
  });

  describe("Reset", () => {
    it("should reset to initial state", () => {
      system.addXP(500);
      system.reset();

      expect(system.getLevel()).toBe(1);
      expect(system.getCurrentXP()).toBe(0);
      expect(system.isLevelingUp()).toBe(false);
    });
  });
});

describe("DEFAULT_LEVELING_CONFIG", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_LEVELING_CONFIG.baseXPThreshold).toBe(100);
    expect(DEFAULT_LEVELING_CONFIG.scalingFactor).toBe(1.2);
    expect(DEFAULT_LEVELING_CONFIG.maxLevel).toBe(100);
  });
});
