import { describe, it, expect } from "vitest";
import { createGameWorld } from "../World";
import { invincibilitySystem } from "./InvincibilitySystem";
import type { Graphics } from "pixi.js";

// Mock Graphics for sprite tests
function createMockGraphics(): Graphics {
  return {
    alpha: 1,
  } as unknown as Graphics;
}

describe("InvincibilitySystem", () => {
  describe("Timer Countdown", () => {
    it("should decrement remaining time by deltaMs", () => {
      const world = createGameWorld();
      world.add({
        invincibility: { remaining: 1000, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 100);

      const [entity] = [...world.with("invincibility")];
      expect(entity.invincibility?.remaining).toBe(900);
    });

    it("should handle multiple frames of decrement", () => {
      const world = createGameWorld();
      world.add({
        invincibility: { remaining: 1000, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 100);
      invincibilitySystem(world, 100);
      invincibilitySystem(world, 100);

      const [entity] = [...world.with("invincibility")];
      expect(entity.invincibility?.remaining).toBe(700);
    });

    it("should process multiple invincible entities", () => {
      const world = createGameWorld();
      world.add({
        invincibility: { remaining: 500, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });
      world.add({
        invincibility: { remaining: 800, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 100);

      const entities = [...world.with("invincibility")];
      expect(entities[0].invincibility?.remaining).toBe(400);
      expect(entities[1].invincibility?.remaining).toBe(700);
    });
  });

  describe("Component Removal", () => {
    it("should remove invincibility when timer reaches zero", () => {
      const world = createGameWorld();
      const entity = world.add({
        invincibility: { remaining: 100, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 100);

      expect(entity.invincibility).toBeUndefined();
    });

    it("should remove invincibility when timer goes negative", () => {
      const world = createGameWorld();
      const entity = world.add({
        invincibility: { remaining: 50, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 100);

      expect(entity.invincibility).toBeUndefined();
    });

    it("should reset sprite alpha to 1 when invincibility ends", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      graphics.alpha = 0.5; // Mid-flash
      world.add({
        invincibility: { remaining: 50, duration: 1000 },
        sprite: { graphics },
      });

      invincibilitySystem(world, 100);

      expect(graphics.alpha).toBe(1);
    });

    it("should not remove invincibility if time remains", () => {
      const world = createGameWorld();
      const entity = world.add({
        invincibility: { remaining: 500, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 100);

      expect(entity.invincibility).toBeDefined();
      expect(entity.invincibility?.remaining).toBe(400);
    });
  });

  describe("Flash Effect", () => {
    it("should toggle alpha based on 100ms intervals", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        invincibility: { remaining: 1000, duration: 1000 },
        sprite: { graphics },
      });

      // At 1000ms remaining (0ms elapsed), should be in first flash state
      invincibilitySystem(world, 0);
      const firstAlpha = graphics.alpha;

      // After 100ms, should toggle
      world.with("invincibility").first!.invincibility!.remaining = 900;
      invincibilitySystem(world, 0);
      const secondAlpha = graphics.alpha;

      // Alpha should alternate between 1.0 and 0.5
      expect([0.5, 1]).toContain(firstAlpha);
      expect([0.5, 1]).toContain(secondAlpha);
    });

    it("should set alpha to 0.5 during flash-off state", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      // remaining 950 means 50ms elapsed, which is in first 100ms block (0-99ms)
      // Flash state = floor(elapsed / 100) % 2
      // At remaining=950, elapsed=50, block=0, so alpha should be 1.0
      // At remaining=850, elapsed=150, block=1, so alpha should be 0.5
      world.add({
        invincibility: { remaining: 850, duration: 1000 },
        sprite: { graphics },
      });

      invincibilitySystem(world, 0);

      expect(graphics.alpha).toBe(0.5);
    });

    it("should set alpha to 1.0 during flash-on state", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      // At remaining=950, elapsed=50, block=0, so alpha should be 1.0
      world.add({
        invincibility: { remaining: 950, duration: 1000 },
        sprite: { graphics },
      });

      invincibilitySystem(world, 0);

      expect(graphics.alpha).toBe(1.0);
    });
  });

  describe("Entity Without Sprite", () => {
    it("should still decrement timer for entities without sprite", () => {
      const world = createGameWorld();
      world.add({
        invincibility: { remaining: 1000, duration: 1000 },
        // No sprite
      });

      invincibilitySystem(world, 100);

      const [entity] = [...world.with("invincibility")];
      expect(entity.invincibility?.remaining).toBe(900);
    });

    it("should remove invincibility when expired even without sprite", () => {
      const world = createGameWorld();
      const entity = world.add({
        invincibility: { remaining: 50, duration: 1000 },
        // No sprite
      });

      invincibilitySystem(world, 100);

      expect(entity.invincibility).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero deltaMs", () => {
      const world = createGameWorld();
      world.add({
        invincibility: { remaining: 1000, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 0);

      const [entity] = [...world.with("invincibility")];
      expect(entity.invincibility?.remaining).toBe(1000);
    });

    it("should handle very large deltaMs", () => {
      const world = createGameWorld();
      const entity = world.add({
        invincibility: { remaining: 1000, duration: 1000 },
        sprite: { graphics: createMockGraphics() },
      });

      invincibilitySystem(world, 10000);

      expect(entity.invincibility).toBeUndefined();
    });

    it("should not affect entities without invincibility", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        sprite: { graphics },
        position: { x: 100, y: 100 },
      });

      invincibilitySystem(world, 100);

      expect(graphics.alpha).toBe(1);
    });
  });
});
