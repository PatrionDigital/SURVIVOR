import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventExecutor } from "./EventExecutor";
import type { WaveConfig } from "./types";

describe("EventExecutor", () => {
  let executor: EventExecutor;

  const mockConfig: WaveConfig = {
    id: "test",
    name: "Test",
    version: "1.0.0",
    phases: [],
    events: [
      {
        id: "horde-1",
        type: "horde",
        triggerTime: 30000,
        data: { enemyType: "basic", count: 10, duration: 2000 },
      },
      {
        id: "boss-1",
        type: "boss_spawn",
        triggerTime: 60000,
        data: { bossType: "elite_basic", count: 1 },
      },
      {
        id: "rest-1",
        type: "rest_period",
        triggerTime: 90000,
        data: { duration: 5000, spawnMultiplier: 0.2 },
      },
      {
        id: "difficulty-spike",
        type: "difficulty_spike",
        triggerTime: 120000,
        data: { duration: 10000, multiplier: 2.0 },
      },
    ],
    globalSettings: {
      baseSpawnInterval: 2000,
      minSpawnInterval: 500,
      maxGameTime: 600000,
    },
  };

  beforeEach(() => {
    executor = new EventExecutor(mockConfig);
  });

  describe("executeEvent()", () => {
    it("should execute horde event and return spawn commands", () => {
      const event = mockConfig.events[0]; // horde
      const result = executor.executeEvent(event);

      expect(result.type).toBe("horde");
      expect(result.spawnCommands).toBeDefined();
      expect(result.spawnCommands?.length).toBe(10);
      expect(result.spawnCommands?.[0].enemyType).toBe("basic");
    });

    it("should execute boss_spawn event", () => {
      const event = mockConfig.events[1]; // boss
      const result = executor.executeEvent(event);

      expect(result.type).toBe("boss_spawn");
      expect(result.spawnCommands?.length).toBe(1);
      expect(result.spawnCommands?.[0].enemyType).toBe("elite_basic");
      expect(result.spawnCommands?.[0].isBoss).toBe(true);
    });

    it("should execute rest_period event", () => {
      const event = mockConfig.events[2]; // rest
      const result = executor.executeEvent(event);

      expect(result.type).toBe("rest_period");
      expect(result.spawnModifier).toBeDefined();
      expect(result.spawnModifier?.multiplier).toBe(0.2);
      expect(result.spawnModifier?.duration).toBe(5000);
    });

    it("should execute difficulty_spike event", () => {
      const event = mockConfig.events[3]; // difficulty spike
      const result = executor.executeEvent(event);

      expect(result.type).toBe("difficulty_spike");
      expect(result.spawnModifier?.multiplier).toBe(2.0);
      expect(result.spawnModifier?.duration).toBe(10000);
    });
  });

  describe("getUpcomingEvents()", () => {
    it("should return events within warning window", () => {
      const upcoming = executor.getUpcomingEvents(25000, 10000); // 25s, 10s window
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe("horde-1");
    });

    it("should return multiple events in range", () => {
      const upcoming = executor.getUpcomingEvents(55000, 10000);
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe("boss-1");
    });

    it("should return empty array when no events upcoming", () => {
      const upcoming = executor.getUpcomingEvents(0, 10000);
      expect(upcoming).toHaveLength(0);
    });

    it("should not include already triggered events", () => {
      executor.markEventTriggered("horde-1");
      const upcoming = executor.getUpcomingEvents(25000, 10000);
      expect(upcoming).toHaveLength(0);
    });
  });

  describe("getWarningForEvent()", () => {
    it("should return warning text for horde event", () => {
      const event = mockConfig.events[0];
      const warning = executor.getWarningForEvent(event);

      expect(warning.title).toBe("Horde Incoming!");
      expect(warning.description).toContain("10");
      expect(warning.description).toContain("basic");
    });

    it("should return warning text for boss event", () => {
      const event = mockConfig.events[1];
      const warning = executor.getWarningForEvent(event);

      expect(warning.title).toContain("Boss");
      expect(warning.description).toContain("elite_basic");
    });

    it("should return warning for rest period", () => {
      const event = mockConfig.events[2];
      const warning = executor.getWarningForEvent(event);

      expect(warning.title).toContain("Rest");
    });
  });

  describe("markEventTriggered()", () => {
    it("should track triggered events", () => {
      expect(executor.isEventTriggered("horde-1")).toBe(false);
      executor.markEventTriggered("horde-1");
      expect(executor.isEventTriggered("horde-1")).toBe(true);
    });
  });

  describe("getActiveModifiers()", () => {
    it("should return empty when no active modifiers", () => {
      const modifiers = executor.getActiveModifiers(0);
      expect(modifiers).toHaveLength(0);
    });

    it("should return active modifier during duration", () => {
      // Execute rest period at time 90000
      const event = mockConfig.events[2];
      executor.executeEvent(event, 90000);

      // Check at 92000 (during 5000ms duration)
      const modifiers = executor.getActiveModifiers(92000);
      expect(modifiers).toHaveLength(1);
      expect(modifiers[0].multiplier).toBe(0.2);
    });

    it("should remove expired modifiers", () => {
      const event = mockConfig.events[2];
      executor.executeEvent(event, 90000);

      // Check after duration expires
      const modifiers = executor.getActiveModifiers(96000);
      expect(modifiers).toHaveLength(0);
    });
  });

  describe("reset()", () => {
    it("should clear triggered events and modifiers", () => {
      executor.markEventTriggered("horde-1");
      const event = mockConfig.events[2];
      executor.executeEvent(event, 90000);

      executor.reset();

      expect(executor.isEventTriggered("horde-1")).toBe(false);
      expect(executor.getActiveModifiers(92000)).toHaveLength(0);
    });
  });

  describe("event callbacks", () => {
    it("should call onWarning callback for upcoming events", () => {
      const callback = vi.fn();
      executor.onWarning(callback);

      executor.checkWarnings(25000, 10000);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: "horde-1" }),
        expect.objectContaining({ title: expect.any(String) })
      );
    });

    it("should not call warning callback for already warned events", () => {
      const callback = vi.fn();
      executor.onWarning(callback);

      executor.checkWarnings(25000, 10000);
      executor.checkWarnings(26000, 10000);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
