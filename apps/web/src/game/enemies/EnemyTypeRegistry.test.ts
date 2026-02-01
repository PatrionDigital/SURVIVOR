import { describe, it, expect, beforeEach, vi } from "vitest";
import { EnemyTypeRegistry } from "./EnemyTypeRegistry";

// Mock fetch for testing
const mockValidConfig = {
  id: "basic",
  name: "Basic Enemy",
  visual: { color: "0xff4444", radius: 15 },
  combat: { damage: 10, health: 30, xpValue: 10 },
  movement: { maxSpeed: 100, maxForce: 80, mass: 1.0 },
  flocking: { alignment: 0.8, cohesion: 1.0, separation: 1.2 },
  vision: { range: 250, fieldOfView: 360 },
  behavior: { seekWeight: 1.5 },
};

const mockSwarmConfig = {
  id: "swarm",
  name: "Swarmer",
  visual: { color: "0x44ff44", radius: 10 },
  combat: { damage: 5, health: 15, xpValue: 5 },
  movement: { maxSpeed: 150, maxForce: 100, mass: 0.5 },
  flocking: { alignment: 1.2, cohesion: 2.0, separation: 0.6 },
  vision: { range: 150, fieldOfView: 360 },
  behavior: { seekWeight: 2.0 },
};

describe("EnemyTypeRegistry", () => {
  let registry: EnemyTypeRegistry;

  beforeEach(() => {
    registry = new EnemyTypeRegistry();
    vi.resetAllMocks();
  });

  describe("load", () => {
    it("should load and parse a valid enemy config", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockValidConfig),
      });

      const config = await registry.load("basic");

      expect(config).not.toBeNull();
      expect(config!.id).toBe("basic");
      expect(config!.visual.color).toBe(0xff4444); // Parsed to number
    });

    it("should cache loaded configs", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockValidConfig),
      });

      await registry.load("basic");
      await registry.load("basic");

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should return null for non-existent config", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const config = await registry.load("nonexistent");

      expect(config).toBeNull();
    });

    it("should return null for invalid config format", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "data" }),
      });

      const config = await registry.load("invalid");

      expect(config).toBeNull();
    });

    it("should return null on fetch error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const config = await registry.load("error");

      expect(config).toBeNull();
    });
  });

  describe("get", () => {
    it("should return cached config", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockValidConfig),
      });

      await registry.load("basic");
      const config = registry.get("basic");

      expect(config).not.toBeUndefined();
      expect(config!.id).toBe("basic");
    });

    it("should return undefined for non-loaded config", () => {
      const config = registry.get("notloaded");

      expect(config).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all loaded configs", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidConfig),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSwarmConfig),
        });

      await registry.load("basic");
      await registry.load("swarm");

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all.map((c) => c.id)).toContain("basic");
      expect(all.map((c) => c.id)).toContain("swarm");
    });

    it("should return empty array when nothing loaded", () => {
      const all = registry.getAll();

      expect(all).toHaveLength(0);
    });
  });

  describe("loadMultiple", () => {
    it("should load multiple configs at once", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidConfig),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSwarmConfig),
        });

      await registry.loadMultiple(["basic", "swarm"]);

      expect(registry.get("basic")).not.toBeUndefined();
      expect(registry.get("swarm")).not.toBeUndefined();
    });

    it("should continue loading if one fails", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSwarmConfig),
        });

      await registry.loadMultiple(["nonexistent", "swarm"]);

      expect(registry.get("nonexistent")).toBeUndefined();
      expect(registry.get("swarm")).not.toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should clear all cached configs", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockValidConfig),
      });

      await registry.load("basic");
      registry.clear();

      expect(registry.get("basic")).toBeUndefined();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe("custom base path", () => {
    it("should use custom base path for loading", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockValidConfig),
      });

      const customRegistry = new EnemyTypeRegistry("/custom/path/");
      await customRegistry.load("basic");

      expect(fetch).toHaveBeenCalledWith("/custom/path/basic.json");
    });
  });
});
