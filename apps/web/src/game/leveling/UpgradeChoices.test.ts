import { describe, it, expect, beforeEach } from "vitest";
import {
  generateUpgradeChoices,
  applyUpgrade,
  type Upgrade,
  type UpgradeType,
  type PlayerStats,
  UPGRADE_POOL,
} from "./UpgradeChoices";

describe("UpgradeChoices", () => {
  describe("UPGRADE_POOL", () => {
    it("should contain upgrades for each type", () => {
      const types: UpgradeType[] = [
        "damage",
        "attackSpeed",
        "moveSpeed",
        "maxHealth",
        "healthRegen",
        "pickupRange",
        "xpBonus",
      ];

      for (const type of types) {
        const upgradesOfType = UPGRADE_POOL.filter((u) => u.type === type);
        expect(upgradesOfType.length).toBeGreaterThan(0);
      }
    });

    it("should have valid upgrade properties", () => {
      for (const upgrade of UPGRADE_POOL) {
        expect(upgrade.id).toBeTruthy();
        expect(upgrade.name).toBeTruthy();
        expect(upgrade.description).toBeTruthy();
        expect(upgrade.type).toBeTruthy();
        expect(typeof upgrade.value).toBe("number");
        expect(upgrade.value).toBeGreaterThan(0);
      }
    });
  });

  describe("generateUpgradeChoices", () => {
    it("should return 3 choices by default", () => {
      const choices = generateUpgradeChoices();

      expect(choices).toHaveLength(3);
    });

    it("should return requested number of choices", () => {
      const choices = generateUpgradeChoices(2);

      expect(choices).toHaveLength(2);
    });

    it("should return unique choices", () => {
      const choices = generateUpgradeChoices(3);
      const ids = choices.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it("should return valid upgrades", () => {
      const choices = generateUpgradeChoices();

      for (const choice of choices) {
        expect(UPGRADE_POOL.some((u) => u.id === choice.id)).toBe(true);
      }
    });

    it("should handle request for more choices than available", () => {
      const choices = generateUpgradeChoices(100);

      expect(choices.length).toBe(UPGRADE_POOL.length);
    });

    it("should generate different choices on multiple calls (random)", () => {
      // This test checks randomness - run multiple times to increase confidence
      const allChoices: string[][] = [];

      for (let i = 0; i < 10; i++) {
        const choices = generateUpgradeChoices(3);
        allChoices.push(choices.map((c) => c.id).sort());
      }

      // At least some should be different (unless extremely unlucky)
      const uniqueSets = new Set(allChoices.map((c) => c.join(",")));
      expect(uniqueSets.size).toBeGreaterThan(1);
    });
  });

  describe("applyUpgrade", () => {
    let baseStats: PlayerStats;

    beforeEach(() => {
      baseStats = {
        damage: 10,
        attackSpeed: 1.0,
        moveSpeed: 200,
        maxHealth: 100,
        healthRegen: 0,
        pickupRange: 100,
        xpBonus: 0,
      };
    });

    it("should apply damage upgrade", () => {
      const upgrade: Upgrade = {
        id: "test-damage",
        name: "Test Damage",
        description: "Test",
        type: "damage",
        value: 5,
      };

      const newStats = applyUpgrade(baseStats, upgrade);

      expect(newStats.damage).toBe(15);
      expect(baseStats.damage).toBe(10); // Original unchanged
    });

    it("should apply attackSpeed upgrade", () => {
      const upgrade: Upgrade = {
        id: "test-as",
        name: "Test AS",
        description: "Test",
        type: "attackSpeed",
        value: 0.1,
      };

      const newStats = applyUpgrade(baseStats, upgrade);

      expect(newStats.attackSpeed).toBe(1.1);
    });

    it("should apply moveSpeed upgrade", () => {
      const upgrade: Upgrade = {
        id: "test-ms",
        name: "Test MS",
        description: "Test",
        type: "moveSpeed",
        value: 20,
      };

      const newStats = applyUpgrade(baseStats, upgrade);

      expect(newStats.moveSpeed).toBe(220);
    });

    it("should apply maxHealth upgrade", () => {
      const upgrade: Upgrade = {
        id: "test-hp",
        name: "Test HP",
        description: "Test",
        type: "maxHealth",
        value: 25,
      };

      const newStats = applyUpgrade(baseStats, upgrade);

      expect(newStats.maxHealth).toBe(125);
    });

    it("should apply healthRegen upgrade", () => {
      const upgrade: Upgrade = {
        id: "test-regen",
        name: "Test Regen",
        description: "Test",
        type: "healthRegen",
        value: 1,
      };

      const newStats = applyUpgrade(baseStats, upgrade);

      expect(newStats.healthRegen).toBe(1);
    });

    it("should apply pickupRange upgrade", () => {
      const upgrade: Upgrade = {
        id: "test-pickup",
        name: "Test Pickup",
        description: "Test",
        type: "pickupRange",
        value: 25,
      };

      const newStats = applyUpgrade(baseStats, upgrade);

      expect(newStats.pickupRange).toBe(125);
    });

    it("should apply xpBonus upgrade", () => {
      const upgrade: Upgrade = {
        id: "test-xp",
        name: "Test XP",
        description: "Test",
        type: "xpBonus",
        value: 10,
      };

      const newStats = applyUpgrade(baseStats, upgrade);

      expect(newStats.xpBonus).toBe(10);
    });

    it("should not mutate original stats", () => {
      const upgrade: Upgrade = {
        id: "test",
        name: "Test",
        description: "Test",
        type: "damage",
        value: 100,
      };
      const originalDamage = baseStats.damage;

      applyUpgrade(baseStats, upgrade);

      expect(baseStats.damage).toBe(originalDamage);
    });
  });
});
