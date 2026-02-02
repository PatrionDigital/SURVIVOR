import { describe, it, expect, beforeEach, vi } from "vitest";
import { WaveManager } from "./WaveManager";
import { WaveConfigRegistry } from "./WaveConfigRegistry";
import type { WaveConfig } from "./types";

describe("WaveManager", () => {
  let registry: WaveConfigRegistry;
  let manager: WaveManager;

  const testConfig: WaveConfig = {
    id: "test-waves",
    name: "Test Wave Config",
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
        healthMultiplier: 1.0,
        damageMultiplier: 1.0,
        speedMultiplier: 1.0,
      },
      {
        id: "mid",
        name: "Mid Game",
        startTime: 60000,
        endTime: 180000,
        enemyTypes: ["basic", "fast"],
        spawnRateMultiplier: 1.5,
        maxEnemies: 40,
        healthMultiplier: 1.2,
        damageMultiplier: 1.1,
        speedMultiplier: 1.1,
      },
      {
        id: "late",
        name: "Late Game",
        startTime: 180000,
        endTime: 600000,
        enemyTypes: ["basic", "fast", "tank"],
        spawnRateMultiplier: 2.0,
        maxEnemies: 60,
        healthMultiplier: 1.5,
        damageMultiplier: 1.3,
        speedMultiplier: 1.2,
      },
    ],
    events: [
      {
        id: "first-horde",
        type: "horde",
        triggerTime: 30000,
        data: { enemyType: "basic", count: 10 },
      },
      {
        id: "first-boss",
        type: "boss_spawn",
        triggerTime: 120000,
        data: { bossType: "elite_basic", count: 1 },
      },
      {
        id: "periodic-horde",
        type: "horde",
        triggerTime: 60000,
        data: { enemyType: "fast", count: 15 },
        repeat: {
          interval: 60000,
          maxRepeats: 3,
        },
      },
    ],
    globalSettings: {
      baseSpawnInterval: 2000,
      minSpawnInterval: 500,
      maxGameTime: 600000,
    },
  };

  beforeEach(() => {
    registry = new WaveConfigRegistry();
    registry.register(testConfig);
    manager = new WaveManager(registry, "test-waves");
  });

  describe("constructor", () => {
    it("should initialize with config from registry", () => {
      expect(manager.getConfigId()).toBe("test-waves");
    });

    it("should throw if config not found", () => {
      expect(() => new WaveManager(registry, "nonexistent")).toThrow(
        "Wave config 'nonexistent' not found"
      );
    });

    it("should start in first phase", () => {
      const state = manager.getState();
      expect(state.currentPhaseId).toBe("early");
      expect(state.gameTime).toBe(0);
    });
  });

  describe("update()", () => {
    it("should advance game time", () => {
      manager.update(1000);
      expect(manager.getState().gameTime).toBe(1000);

      manager.update(500);
      expect(manager.getState().gameTime).toBe(1500);
    });

    it("should not advance time when paused", () => {
      manager.pause();
      manager.update(1000);
      expect(manager.getState().gameTime).toBe(0);
    });

    it("should transition to next phase at correct time", () => {
      expect(manager.getCurrentPhase()?.id).toBe("early");

      // Advance to mid phase
      manager.update(60000);
      expect(manager.getCurrentPhase()?.id).toBe("mid");

      // Advance to late phase
      manager.update(120000);
      expect(manager.getCurrentPhase()?.id).toBe("late");
    });

    it("should return triggered events", () => {
      // Advance past first horde event at 30000ms
      const events1 = manager.update(31000);
      expect(events1).toHaveLength(1);
      expect(events1[0].id).toBe("first-horde");

      // Further update should not re-trigger same event
      const events2 = manager.update(1000);
      expect(events2.filter((e) => e.id === "first-horde")).toHaveLength(0);
    });

    it("should handle repeating events", () => {
      // First trigger at 60000
      manager.update(61000);
      expect(manager.getState().eventsTriggered).toContain("periodic-horde");
      expect(manager.getState().eventRepeatCounts?.["periodic-horde"]).toBe(1);

      // Second trigger at 120000
      manager.update(60000);
      expect(manager.getState().eventRepeatCounts?.["periodic-horde"]).toBe(2);

      // Third trigger at 180000
      manager.update(60000);
      expect(manager.getState().eventRepeatCounts?.["periodic-horde"]).toBe(3);

      // Should not trigger fourth time (maxRepeats: 3)
      manager.update(60000);
      expect(manager.getState().eventRepeatCounts?.["periodic-horde"]).toBe(3);
    });
  });

  describe("getCurrentPhase()", () => {
    it("should return current phase", () => {
      const phase = manager.getCurrentPhase();
      expect(phase?.id).toBe("early");
      expect(phase?.enemyTypes).toContain("basic");
    });

    it("should return undefined after all phases end", () => {
      manager.update(700000); // Beyond all phases
      expect(manager.getCurrentPhase()).toBeUndefined();
    });
  });

  describe("getSpawnParameters()", () => {
    it("should return spawn parameters based on current phase", () => {
      const params = manager.getSpawnParameters();

      expect(params.enemyTypes).toEqual(["basic"]);
      expect(params.spawnRateMultiplier).toBe(1.0);
      expect(params.maxEnemies).toBe(20);
      expect(params.healthMultiplier).toBe(1.0);
      expect(params.damageMultiplier).toBe(1.0);
      expect(params.speedMultiplier).toBe(1.0);
    });

    it("should update parameters when phase changes", () => {
      manager.update(60000); // Move to mid phase
      const params = manager.getSpawnParameters();

      expect(params.enemyTypes).toContain("fast");
      expect(params.spawnRateMultiplier).toBe(1.5);
      expect(params.maxEnemies).toBe(40);
      expect(params.healthMultiplier).toBe(1.2);
    });

    it("should apply global scaling on top of phase modifiers", () => {
      // At time 0, global scaling should be 1.0
      const params1 = manager.getSpawnParameters();
      expect(params1.globalScaling).toBe(1.0);

      // After some time, global scaling should increase
      manager.update(300000); // 5 minutes
      const params2 = manager.getSpawnParameters();
      expect(params2.globalScaling).toBeGreaterThan(1.0);
    });
  });

  describe("getEnemyTypeForSpawn()", () => {
    it("should return enemy type from current phase pool", () => {
      const enemyType = manager.getEnemyTypeForSpawn();
      expect(testConfig.phases[0].enemyTypes).toContain(enemyType);
    });

    it("should return from updated pool after phase change", () => {
      manager.update(180000); // Late phase
      const enemyType = manager.getEnemyTypeForSpawn();
      expect(["basic", "fast", "tank"]).toContain(enemyType);
    });
  });

  describe("pause/resume", () => {
    it("should pause and resume time progression", () => {
      manager.update(1000);
      expect(manager.getState().gameTime).toBe(1000);

      manager.pause();
      expect(manager.getState().isPaused).toBe(true);

      manager.update(1000);
      expect(manager.getState().gameTime).toBe(1000); // No change

      manager.resume();
      expect(manager.getState().isPaused).toBe(false);

      manager.update(1000);
      expect(manager.getState().gameTime).toBe(2000);
    });
  });

  describe("reset()", () => {
    it("should reset to initial state", () => {
      manager.update(100000);
      manager.reset();

      const state = manager.getState();
      expect(state.gameTime).toBe(0);
      expect(state.currentPhaseId).toBe("early");
      expect(state.eventsTriggered).toHaveLength(0);
      expect(state.eventRepeatCounts).toEqual({});
    });
  });

  describe("isGameOver()", () => {
    it("should return false before max game time", () => {
      manager.update(300000);
      expect(manager.isGameOver()).toBe(false);
    });

    it("should return true after max game time", () => {
      manager.update(600001);
      expect(manager.isGameOver()).toBe(true);
    });
  });

  describe("getProgress()", () => {
    it("should return progress as percentage of max game time", () => {
      expect(manager.getProgress()).toBe(0);

      manager.update(300000); // 50%
      expect(manager.getProgress()).toBe(0.5);

      manager.update(300000); // 100%
      expect(manager.getProgress()).toBe(1.0);
    });
  });

  describe("getTimeRemaining()", () => {
    it("should return time remaining until max game time", () => {
      expect(manager.getTimeRemaining()).toBe(600000);

      manager.update(100000);
      expect(manager.getTimeRemaining()).toBe(500000);
    });

    it("should return 0 when past max game time", () => {
      manager.update(700000);
      expect(manager.getTimeRemaining()).toBe(0);
    });
  });

  describe("event callbacks", () => {
    it("should call onPhaseChange callback when phase changes", () => {
      const callback = vi.fn();
      manager.onPhaseChange(callback);

      manager.update(60000); // Trigger phase change

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: "mid" }),
        expect.objectContaining({ id: "early" })
      );
    });

    it("should call onEvent callback when event triggers", () => {
      const callback = vi.fn();
      manager.onEvent(callback);

      manager.update(31000); // Trigger first-horde event

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ id: "first-horde" }));
    });
  });
});
