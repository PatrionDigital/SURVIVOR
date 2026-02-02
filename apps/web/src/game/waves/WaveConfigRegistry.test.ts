import { describe, it, expect, beforeEach } from "vitest";
import { WaveConfigRegistry } from "./WaveConfigRegistry";
import type { WaveConfig } from "./types";

describe("WaveConfigRegistry", () => {
  let registry: WaveConfigRegistry;

  const mockConfig: WaveConfig = {
    id: "default",
    name: "Default Waves",
    version: "1.0.0",
    phases: [
      {
        id: "early",
        name: "Early Game",
        startTime: 0,
        endTime: 60000,
        enemyTypes: ["basic"],
        spawnRateMultiplier: 1.0,
        maxEnemies: 20,
      },
      {
        id: "mid",
        name: "Mid Game",
        startTime: 60000,
        endTime: 180000,
        enemyTypes: ["basic", "fast"],
        spawnRateMultiplier: 1.5,
        maxEnemies: 40,
      },
    ],
    events: [
      {
        id: "first-boss",
        type: "boss_spawn",
        triggerTime: 120000,
        data: { bossType: "elite" },
      },
    ],
    globalSettings: {
      baseSpawnInterval: 2000,
      minSpawnInterval: 500,
      maxGameTime: 1800000,
    },
  };

  const easyConfig: WaveConfig = {
    id: "easy",
    name: "Easy Mode",
    version: "1.0.0",
    phases: [
      {
        id: "relaxed",
        name: "Relaxed",
        startTime: 0,
        endTime: 120000,
        enemyTypes: ["basic"],
        spawnRateMultiplier: 0.5,
        maxEnemies: 10,
      },
    ],
    events: [],
    globalSettings: {
      baseSpawnInterval: 3000,
      minSpawnInterval: 1000,
      maxGameTime: 1800000,
    },
  };

  beforeEach(() => {
    registry = new WaveConfigRegistry();
  });

  describe("register()", () => {
    it("should register a wave configuration", () => {
      registry.register(mockConfig);
      expect(registry.has("default")).toBe(true);
    });

    it("should throw error when registering duplicate id", () => {
      registry.register(mockConfig);
      expect(() => registry.register(mockConfig)).toThrow(
        "Wave config 'default' is already registered"
      );
    });
  });

  describe("get()", () => {
    it("should return registered configuration", () => {
      registry.register(mockConfig);
      const config = registry.get("default");
      expect(config).toEqual(mockConfig);
    });

    it("should return undefined for unknown id", () => {
      const config = registry.get("unknown");
      expect(config).toBeUndefined();
    });
  });

  describe("getOrThrow()", () => {
    it("should return registered configuration", () => {
      registry.register(mockConfig);
      const config = registry.getOrThrow("default");
      expect(config).toEqual(mockConfig);
    });

    it("should throw error for unknown id", () => {
      expect(() => registry.getOrThrow("unknown")).toThrow("Wave config 'unknown' not found");
    });
  });

  describe("has()", () => {
    it("should return true for registered config", () => {
      registry.register(mockConfig);
      expect(registry.has("default")).toBe(true);
    });

    it("should return false for unregistered config", () => {
      expect(registry.has("unknown")).toBe(false);
    });
  });

  describe("getAll()", () => {
    it("should return all registered configurations", () => {
      registry.register(mockConfig);
      registry.register(easyConfig);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((c) => c.id)).toContain("default");
      expect(all.map((c) => c.id)).toContain("easy");
    });

    it("should return empty array when no configs registered", () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("getIds()", () => {
    it("should return all registered config ids", () => {
      registry.register(mockConfig);
      registry.register(easyConfig);

      const ids = registry.getIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain("default");
      expect(ids).toContain("easy");
    });
  });

  describe("unregister()", () => {
    it("should remove registered configuration", () => {
      registry.register(mockConfig);
      expect(registry.has("default")).toBe(true);

      const removed = registry.unregister("default");
      expect(removed).toBe(true);
      expect(registry.has("default")).toBe(false);
    });

    it("should return false for unknown id", () => {
      const removed = registry.unregister("unknown");
      expect(removed).toBe(false);
    });
  });

  describe("clear()", () => {
    it("should remove all registered configurations", () => {
      registry.register(mockConfig);
      registry.register(easyConfig);
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe("loadFromJSON()", () => {
    it("should register configuration from JSON string", () => {
      const json = JSON.stringify(mockConfig);
      registry.loadFromJSON(json);
      expect(registry.has("default")).toBe(true);
    });

    it("should throw error for invalid JSON", () => {
      expect(() => registry.loadFromJSON("invalid json")).toThrow();
    });
  });

  describe("validateConfig()", () => {
    it("should return true for valid configuration", () => {
      expect(WaveConfigRegistry.validateConfig(mockConfig)).toBe(true);
    });

    it("should return false for config without id", () => {
      const invalid = { ...mockConfig, id: "" } as WaveConfig;
      expect(WaveConfigRegistry.validateConfig(invalid)).toBe(false);
    });

    it("should return false for config without phases", () => {
      const invalid = { ...mockConfig, phases: undefined } as unknown as WaveConfig;
      expect(WaveConfigRegistry.validateConfig(invalid)).toBe(false);
    });

    it("should return false for config with overlapping phases", () => {
      const invalid: WaveConfig = {
        ...mockConfig,
        phases: [
          {
            id: "phase1",
            name: "Phase 1",
            startTime: 0,
            endTime: 60000,
            enemyTypes: ["basic"],
            spawnRateMultiplier: 1,
            maxEnemies: 20,
          },
          {
            id: "phase2",
            name: "Phase 2",
            startTime: 30000, // Overlaps with phase1
            endTime: 90000,
            enemyTypes: ["fast"],
            spawnRateMultiplier: 1,
            maxEnemies: 30,
          },
        ],
      };
      expect(WaveConfigRegistry.validateConfig(invalid)).toBe(false);
    });

    it("should return false for phase with startTime >= endTime", () => {
      const invalid: WaveConfig = {
        ...mockConfig,
        phases: [
          {
            id: "bad-phase",
            name: "Bad Phase",
            startTime: 60000,
            endTime: 30000, // End before start
            enemyTypes: ["basic"],
            spawnRateMultiplier: 1,
            maxEnemies: 20,
          },
        ],
      };
      expect(WaveConfigRegistry.validateConfig(invalid)).toBe(false);
    });
  });

  describe("getPhaseAt()", () => {
    it("should return phase for given time", () => {
      registry.register(mockConfig);
      const phase = registry.getPhaseAt("default", 30000);
      expect(phase?.id).toBe("early");
    });

    it("should return correct phase as time progresses", () => {
      registry.register(mockConfig);

      const earlyPhase = registry.getPhaseAt("default", 30000);
      expect(earlyPhase?.id).toBe("early");

      const midPhase = registry.getPhaseAt("default", 120000);
      expect(midPhase?.id).toBe("mid");
    });

    it("should return undefined for time beyond all phases", () => {
      registry.register(mockConfig);
      const phase = registry.getPhaseAt("default", 500000);
      expect(phase).toBeUndefined();
    });

    it("should return undefined for unknown config id", () => {
      const phase = registry.getPhaseAt("unknown", 30000);
      expect(phase).toBeUndefined();
    });
  });

  describe("getEventsInRange()", () => {
    it("should return events within time range", () => {
      registry.register(mockConfig);
      const events = registry.getEventsInRange("default", 100000, 130000);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe("first-boss");
    });

    it("should return empty array when no events in range", () => {
      registry.register(mockConfig);
      const events = registry.getEventsInRange("default", 0, 60000);
      expect(events).toHaveLength(0);
    });

    it("should return empty array for unknown config", () => {
      const events = registry.getEventsInRange("unknown", 0, 1000000);
      expect(events).toHaveLength(0);
    });
  });
});
