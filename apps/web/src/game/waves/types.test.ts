import { describe, it, expect } from "vitest";
import type {
  WavePhase,
  TimedEvent,
  SpawnPattern,
  WaveConfig,
  WaveState,
  WaveEventType,
} from "./types";

describe("Wave System Types", () => {
  describe("WavePhase", () => {
    it("should define a wave phase with required properties", () => {
      const phase: WavePhase = {
        id: "phase-1",
        name: "Early Game",
        startTime: 0,
        endTime: 60000, // 1 minute in ms
        enemyTypes: ["basic"],
        spawnRateMultiplier: 1.0,
        maxEnemies: 20,
      };

      expect(phase.id).toBe("phase-1");
      expect(phase.name).toBe("Early Game");
      expect(phase.startTime).toBe(0);
      expect(phase.endTime).toBe(60000);
      expect(phase.enemyTypes).toContain("basic");
      expect(phase.spawnRateMultiplier).toBe(1.0);
      expect(phase.maxEnemies).toBe(20);
    });

    it("should allow optional difficulty modifiers", () => {
      const phase: WavePhase = {
        id: "phase-2",
        name: "Mid Game",
        startTime: 60000,
        endTime: 180000,
        enemyTypes: ["basic", "fast"],
        spawnRateMultiplier: 1.5,
        maxEnemies: 40,
        healthMultiplier: 1.2,
        damageMultiplier: 1.1,
        speedMultiplier: 1.0,
      };

      expect(phase.healthMultiplier).toBe(1.2);
      expect(phase.damageMultiplier).toBe(1.1);
      expect(phase.speedMultiplier).toBe(1.0);
    });
  });

  describe("TimedEvent", () => {
    it("should define a timed event with trigger time", () => {
      const event: TimedEvent = {
        id: "boss-spawn-1",
        type: "boss_spawn",
        triggerTime: 120000, // 2 minutes
        data: {
          bossType: "elite_basic",
          count: 1,
        },
      };

      expect(event.id).toBe("boss-spawn-1");
      expect(event.type).toBe("boss_spawn");
      expect(event.triggerTime).toBe(120000);
      expect(event.data.bossType).toBe("elite_basic");
    });

    it("should support different event types", () => {
      const hordeEvent: TimedEvent = {
        id: "horde-1",
        type: "horde",
        triggerTime: 90000,
        data: {
          enemyType: "basic",
          count: 30,
          duration: 5000,
        },
      };

      const phaseChangeEvent: TimedEvent = {
        id: "phase-change-1",
        type: "phase_change",
        triggerTime: 60000,
        data: {
          nextPhaseId: "phase-2",
        },
      };

      const specialSpawnEvent: TimedEvent = {
        id: "special-1",
        type: "special_spawn",
        triggerTime: 45000,
        data: {
          enemyType: "elite",
          position: { x: 0, y: -200 },
        },
      };

      expect(hordeEvent.type).toBe("horde");
      expect(phaseChangeEvent.type).toBe("phase_change");
      expect(specialSpawnEvent.type).toBe("special_spawn");
    });

    it("should allow optional repeat configuration", () => {
      const repeatingEvent: TimedEvent = {
        id: "periodic-horde",
        type: "horde",
        triggerTime: 60000,
        data: { enemyType: "basic", count: 10 },
        repeat: {
          interval: 30000, // Every 30 seconds
          maxRepeats: 5,
        },
      };

      expect(repeatingEvent.repeat?.interval).toBe(30000);
      expect(repeatingEvent.repeat?.maxRepeats).toBe(5);
    });
  });

  describe("SpawnPattern", () => {
    it("should define spawn pattern for enemy placement", () => {
      const circlePattern: SpawnPattern = {
        type: "circle",
        config: {
          radius: 300,
          count: 8,
          centered: true,
        },
      };

      expect(circlePattern.type).toBe("circle");
      expect(circlePattern.config.radius).toBe(300);
    });

    it("should support different pattern types", () => {
      const linePattern: SpawnPattern = {
        type: "line",
        config: {
          startX: -400,
          endX: 400,
          y: -300,
          count: 10,
        },
      };

      const randomPattern: SpawnPattern = {
        type: "random",
        config: {
          minDistance: 200,
          maxDistance: 400,
        },
      };

      const directionalPattern: SpawnPattern = {
        type: "directional",
        config: {
          direction: "top",
          spread: 100,
          count: 5,
        },
      };

      expect(linePattern.type).toBe("line");
      expect(randomPattern.type).toBe("random");
      expect(directionalPattern.type).toBe("directional");
    });
  });

  describe("WaveConfig", () => {
    it("should define a complete wave configuration", () => {
      const config: WaveConfig = {
        id: "default-waves",
        name: "Default Wave Configuration",
        version: "1.0.0",
        phases: [
          {
            id: "phase-1",
            name: "Early",
            startTime: 0,
            endTime: 60000,
            enemyTypes: ["basic"],
            spawnRateMultiplier: 1.0,
            maxEnemies: 20,
          },
        ],
        events: [
          {
            id: "first-boss",
            type: "boss_spawn",
            triggerTime: 60000,
            data: { bossType: "elite" },
          },
        ],
        globalSettings: {
          baseSpawnInterval: 2000,
          minSpawnInterval: 500,
          maxGameTime: 1800000, // 30 minutes
        },
      };

      expect(config.id).toBe("default-waves");
      expect(config.phases).toHaveLength(1);
      expect(config.events).toHaveLength(1);
      expect(config.globalSettings.baseSpawnInterval).toBe(2000);
    });

    it("should allow optional description and metadata", () => {
      const config: WaveConfig = {
        id: "easy-mode",
        name: "Easy Mode",
        version: "1.0.0",
        description: "Slower enemy spawns, fewer bosses",
        phases: [],
        events: [],
        globalSettings: {
          baseSpawnInterval: 3000,
          minSpawnInterval: 1000,
          maxGameTime: 1800000,
        },
        metadata: {
          difficulty: "easy",
          author: "game-team",
        },
      };

      expect(config.description).toBe("Slower enemy spawns, fewer bosses");
      expect(config.metadata?.difficulty).toBe("easy");
    });
  });

  describe("WaveState", () => {
    it("should track current wave runtime state", () => {
      const state: WaveState = {
        currentPhaseId: "phase-1",
        gameTime: 45000,
        eventsTriggered: ["event-1", "event-2"],
        phaseStartTime: 0,
        isPaused: false,
      };

      expect(state.currentPhaseId).toBe("phase-1");
      expect(state.gameTime).toBe(45000);
      expect(state.eventsTriggered).toHaveLength(2);
      expect(state.isPaused).toBe(false);
    });

    it("should track repeat counts for repeating events", () => {
      const state: WaveState = {
        currentPhaseId: "phase-2",
        gameTime: 150000,
        eventsTriggered: ["periodic-horde"],
        phaseStartTime: 60000,
        isPaused: false,
        eventRepeatCounts: {
          "periodic-horde": 3,
        },
      };

      expect(state.eventRepeatCounts?.["periodic-horde"]).toBe(3);
    });
  });

  describe("WaveEventType", () => {
    it("should define all valid event types", () => {
      const eventTypes: WaveEventType[] = [
        "boss_spawn",
        "horde",
        "phase_change",
        "special_spawn",
        "difficulty_spike",
        "rest_period",
      ];

      expect(eventTypes).toContain("boss_spawn");
      expect(eventTypes).toContain("horde");
      expect(eventTypes).toContain("phase_change");
      expect(eventTypes).toContain("special_spawn");
      expect(eventTypes).toContain("difficulty_spike");
      expect(eventTypes).toContain("rest_period");
    });
  });
});
