import { describe, it, expect } from "vitest";
import { createGameWorld } from "../World";
import { renderSystem } from "./RenderSystem";
import type { Graphics } from "pixi.js";

// Mock Graphics for sprite tests
function createMockGraphics(x = 0, y = 0): Graphics {
  return {
    x,
    y,
    alpha: 1,
  } as unknown as Graphics;
}

describe("RenderSystem", () => {
  describe("Position Sync", () => {
    it("should sync sprite position to entity position", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 100, y: 200 },
        sprite: { graphics },
      });

      renderSystem(world);

      expect(graphics.x).toBe(100);
      expect(graphics.y).toBe(200);
    });

    it("should update sprite when position changes", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      const entity = world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics },
      });

      renderSystem(world);
      expect(graphics.x).toBe(0);
      expect(graphics.y).toBe(0);

      // Update position
      entity.position!.x = 50;
      entity.position!.y = 75;

      renderSystem(world);
      expect(graphics.x).toBe(50);
      expect(graphics.y).toBe(75);
    });

    it("should handle negative positions", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: -100, y: -50 },
        sprite: { graphics },
      });

      renderSystem(world);

      expect(graphics.x).toBe(-100);
      expect(graphics.y).toBe(-50);
    });

    it("should handle decimal positions", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 100.5, y: 200.75 },
        sprite: { graphics },
      });

      renderSystem(world);

      expect(graphics.x).toBe(100.5);
      expect(graphics.y).toBe(200.75);
    });
  });

  describe("Multiple Entities", () => {
    it("should sync all entities with position and sprite", () => {
      const world = createGameWorld();
      const graphics1 = createMockGraphics();
      const graphics2 = createMockGraphics();
      const graphics3 = createMockGraphics();

      world.add({
        position: { x: 10, y: 20 },
        sprite: { graphics: graphics1 },
      });
      world.add({
        position: { x: 30, y: 40 },
        sprite: { graphics: graphics2 },
      });
      world.add({
        position: { x: 50, y: 60 },
        sprite: { graphics: graphics3 },
      });

      renderSystem(world);

      expect(graphics1.x).toBe(10);
      expect(graphics1.y).toBe(20);
      expect(graphics2.x).toBe(30);
      expect(graphics2.y).toBe(40);
      expect(graphics3.x).toBe(50);
      expect(graphics3.y).toBe(60);
    });
  });

  describe("Entity Filtering", () => {
    it("should not affect entities without sprite", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 100, y: 200 },
        // No sprite
      });

      // Should not throw
      expect(() => renderSystem(world)).not.toThrow();
    });

    it("should not affect entities without position", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics(999, 999);
      world.add({
        sprite: { graphics },
        // No position
      });

      renderSystem(world);

      // Graphics should remain unchanged
      expect(graphics.x).toBe(999);
      expect(graphics.y).toBe(999);
    });

    it("should only update entities with both position and sprite", () => {
      const world = createGameWorld();
      const graphicsWithPosition = createMockGraphics();
      const graphicsNoPosition = createMockGraphics(999, 999);

      world.add({
        position: { x: 100, y: 200 },
        sprite: { graphics: graphicsWithPosition },
      });
      world.add({
        sprite: { graphics: graphicsNoPosition },
        velocity: { vx: 10, vy: 10 },
      });
      world.add({
        position: { x: 300, y: 400 },
        // No sprite
      });

      renderSystem(world);

      expect(graphicsWithPosition.x).toBe(100);
      expect(graphicsWithPosition.y).toBe(200);
      expect(graphicsNoPosition.x).toBe(999); // Unchanged
      expect(graphicsNoPosition.y).toBe(999); // Unchanged
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty world", () => {
      const world = createGameWorld();

      // Should not throw
      expect(() => renderSystem(world)).not.toThrow();
    });

    it("should handle zero position", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics(100, 100);
      world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics },
      });

      renderSystem(world);

      expect(graphics.x).toBe(0);
      expect(graphics.y).toBe(0);
    });

    it("should handle very large positions", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 999999, y: 999999 },
        sprite: { graphics },
      });

      renderSystem(world);

      expect(graphics.x).toBe(999999);
      expect(graphics.y).toBe(999999);
    });
  });
});
