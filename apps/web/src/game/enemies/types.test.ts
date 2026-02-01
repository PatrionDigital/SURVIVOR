import { describe, it, expect } from "vitest";
import { parseEnemyTypeConfig, validateEnemyTypeConfig, type EnemyTypeConfigJSON } from "./types";

const validConfig: EnemyTypeConfigJSON = {
  id: "basic",
  name: "Basic Enemy",
  visual: {
    color: "0xff4444",
    radius: 15,
  },
  combat: {
    damage: 10,
    health: 30,
    xpValue: 10,
  },
  movement: {
    maxSpeed: 100,
    maxForce: 80,
    mass: 1.0,
  },
  flocking: {
    alignment: 0.8,
    cohesion: 1.0,
    separation: 1.2,
  },
  vision: {
    range: 250,
    fieldOfView: 360,
  },
  behavior: {
    seekWeight: 1.5,
  },
};

describe("parseEnemyTypeConfig", () => {
  it("should convert color string to number", () => {
    const result = parseEnemyTypeConfig(validConfig);

    expect(result.visual.color).toBe(0xff4444);
  });

  it("should preserve all other fields", () => {
    const result = parseEnemyTypeConfig(validConfig);

    expect(result.id).toBe("basic");
    expect(result.name).toBe("Basic Enemy");
    expect(result.visual.radius).toBe(15);
    expect(result.combat.damage).toBe(10);
    expect(result.combat.health).toBe(30);
    expect(result.combat.xpValue).toBe(10);
    expect(result.movement.maxSpeed).toBe(100);
    expect(result.movement.maxForce).toBe(80);
    expect(result.movement.mass).toBe(1.0);
    expect(result.flocking.alignment).toBe(0.8);
    expect(result.flocking.cohesion).toBe(1.0);
    expect(result.flocking.separation).toBe(1.2);
    expect(result.vision.range).toBe(250);
    expect(result.vision.fieldOfView).toBe(360);
    expect(result.behavior.seekWeight).toBe(1.5);
  });

  it("should handle different color formats", () => {
    const config = {
      ...validConfig,
      visual: { ...validConfig.visual, color: "0x00ff00" },
    };

    const result = parseEnemyTypeConfig(config);
    expect(result.visual.color).toBe(0x00ff00);
  });
});

describe("validateEnemyTypeConfig", () => {
  it("should return true for valid config", () => {
    expect(validateEnemyTypeConfig(validConfig)).toBe(true);
  });

  it("should return false for null", () => {
    expect(validateEnemyTypeConfig(null)).toBe(false);
  });

  it("should return false for non-object", () => {
    expect(validateEnemyTypeConfig("string")).toBe(false);
    expect(validateEnemyTypeConfig(123)).toBe(false);
    expect(validateEnemyTypeConfig(undefined)).toBe(false);
  });

  it("should return false when id is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).id;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when id is wrong type", () => {
    const config = { ...validConfig, id: 123 };
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when name is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).name;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when visual is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).visual;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when visual.color is wrong type", () => {
    const config = {
      ...validConfig,
      visual: { ...validConfig.visual, color: 0xff4444 },
    };
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when visual.radius is missing", () => {
    const config = {
      ...validConfig,
      visual: { color: "0xff4444" },
    };
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when combat is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).combat;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when combat.damage is wrong type", () => {
    const config = {
      ...validConfig,
      combat: { ...validConfig.combat, damage: "10" },
    };
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when movement is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).movement;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when flocking is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).flocking;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when vision is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).vision;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when behavior is missing", () => {
    const config = { ...validConfig };
    delete (config as Record<string, unknown>).behavior;
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });

  it("should return false when behavior.seekWeight is wrong type", () => {
    const config = {
      ...validConfig,
      behavior: { seekWeight: "1.5" },
    };
    expect(validateEnemyTypeConfig(config)).toBe(false);
  });
});
