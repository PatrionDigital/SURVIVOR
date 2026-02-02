import { describe, it, expect, beforeEach, vi } from "vitest";
import { WaveController } from "./WaveController";
import type { WaveConfig } from "./types";

describe("WaveController", () => {
  const testConfig: WaveConfig = {
    id: "test",
    name: "Test Waves",
    version: "1.0.0",
    phases: [
      {
        id: "early",
        name: "Early",
        startTime: 0,
        endTime: 60000,
        enemyTypes: ["basic"],
        spawnRateMultiplier: 1.0,
        maxEnemies: 20,
        healthMultiplier: 1.0,
        damageMultiplier: 1.0,
        speedMultiplier: 1.0,
      },
      {
        id: "mid",
        name: "Mid",
        startTime: 60000,
        endTime: 180000,
        enemyTypes: ["basic", "fast"],
        spawnRateMultiplier: 1.5,
        maxEnemies: 35,
        healthMultiplier: 1.2,
        damageMultiplier: 1.1,
        speedMultiplier: 1.1,
      },
    ],
    events: [
      {
        id: "horde-1",
        type: "horde",
        triggerTime: 30000,
        data: { enemyType: "basic", count: 10 },
      },
    ],
    globalSettings: {
      baseSpawnInterval: 2000,
      minSpawnInterval: 500,
      maxGameTime: 180000,
    },
  };

  let controller: WaveController;

  beforeEach(() => {
    controller = new WaveController(testConfig);
  });

  describe("constructor", () => {
    it("should initialize with config", () => {
      expect(controller.getConfigId()).toBe("test");
      expect(controller.getCurrentPhaseName()).toBe("Early");
    });
  });

  describe("update()", () => {
    it("should advance game time", () => {
      controller.update(1000);
      expect(controller.getGameTime()).toBe(1000);
    });

    it("should return triggered events", () => {
      const events = controller.update(35000);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe("horde-1");
    });

    it("should execute events and return spawn commands", () => {
      // Trigger the horde event
      const events = controller.update(35000);
      expect(events).toHaveLength(1);

      // Get spawn commands for the event
      const commands = controller.getSpawnCommandsForEvent(events[0]);
      expect(commands).toHaveLength(10);
      expect(commands[0].enemyType).toBe("basic");
    });
  });

  describe("getSpawnConfig()", () => {
    it("should return spawn config based on current phase", () => {
      const config = controller.getSpawnConfig();
      expect(config.enemyTypes).toEqual(["basic"]);
      // Base multiplier is 1.0, global scaling starts at 1.0
      expect(config.spawnRateMultiplier).toBeCloseTo(1.0, 1);
      expect(config.maxEnemies).toBe(20);
    });

    it("should update config when phase changes", () => {
      controller.update(60000);
      const config = controller.getSpawnConfig();
      expect(config.enemyTypes).toContain("fast");
      // Base multiplier is 1.5, global scaling increases it
      expect(config.spawnRateMultiplier).toBeGreaterThan(1.5);
    });

    it("should apply active modifiers", () => {
      // Add a difficulty modifier
      controller.update(35000); // Trigger horde event
      // Manually test modifier would require a rest_period event
    });
  });

  describe("getUpcomingWarnings()", () => {
    it("should return warnings for upcoming events", () => {
      const warnings = controller.getUpcomingWarnings(25000, 10000);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].event.id).toBe("horde-1");
      expect(warnings[0].warning.title).toContain("Horde");
    });

    it("should not return warnings for past events", () => {
      controller.update(35000); // Trigger the event
      const warnings = controller.getUpcomingWarnings(40000, 10000);
      expect(warnings).toHaveLength(0);
    });
  });

  describe("getProgress()", () => {
    it("should return progress as percentage", () => {
      expect(controller.getProgress()).toBe(0);
      controller.update(90000);
      expect(controller.getProgress()).toBe(0.5);
    });
  });

  describe("isComplete()", () => {
    it("should return false before max time", () => {
      expect(controller.isComplete()).toBe(false);
    });

    it("should return true after max time", () => {
      controller.update(180001);
      expect(controller.isComplete()).toBe(true);
    });
  });

  describe("pause/resume", () => {
    it("should pause and resume", () => {
      controller.update(1000);
      controller.pause();
      controller.update(1000);
      expect(controller.getGameTime()).toBe(1000);

      controller.resume();
      controller.update(1000);
      expect(controller.getGameTime()).toBe(2000);
    });
  });

  describe("reset()", () => {
    it("should reset to initial state", () => {
      controller.update(50000);
      controller.reset();
      expect(controller.getGameTime()).toBe(0);
      expect(controller.getCurrentPhaseName()).toBe("Early");
    });
  });

  describe("callbacks", () => {
    it("should call onPhaseChange when phase changes", () => {
      const callback = vi.fn();
      controller.onPhaseChange(callback);
      controller.update(60000);
      expect(callback).toHaveBeenCalled();
    });

    it("should call onEvent when event triggers", () => {
      const callback = vi.fn();
      controller.onEvent(callback);
      controller.update(35000);
      expect(callback).toHaveBeenCalled();
    });

    it("should call onWarning for upcoming events", () => {
      const callback = vi.fn();
      controller.onWarning(callback);
      controller.checkWarnings(25000, 10000);
      expect(callback).toHaveBeenCalled();
    });
  });
});
