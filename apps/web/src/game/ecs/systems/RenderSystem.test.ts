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

// Default camera at origin for backward-compatible tests
const defaultCamera = { x: 0, y: 0 };
const defaultScreen = { width: 800, height: 600 };

describe("RenderSystem", () => {
  describe("Position Sync (Camera at Origin)", () => {
    it("should render entity at screen center when at camera position", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics },
      });

      renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height);

      // Entity at (0,0) with camera at (0,0) renders at screen center
      expect(graphics.x).toBe(400); // 800/2
      expect(graphics.y).toBe(300); // 600/2
    });

    it("should offset entity position from camera", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 100, y: 50 },
        sprite: { graphics },
      });

      renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height);

      // Entity at (100,50) with camera at (0,0) renders offset from center
      expect(graphics.x).toBe(500); // 400 + 100
      expect(graphics.y).toBe(350); // 300 + 50
    });

    it("should handle negative entity positions", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: -100, y: -50 },
        sprite: { graphics },
      });

      renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height);

      expect(graphics.x).toBe(300); // 400 - 100
      expect(graphics.y).toBe(250); // 300 - 50
    });
  });

  describe("Camera Offset", () => {
    it("should keep player centered when camera follows player", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 500, y: 300 },
        sprite: { graphics },
      });

      // Camera following player at same position
      const camera = { x: 500, y: 300 };
      renderSystem(world, camera, 800, 600);

      // Player should be at screen center
      expect(graphics.x).toBe(400);
      expect(graphics.y).toBe(300);
    });

    it("should offset other entities relative to camera", () => {
      const world = createGameWorld();
      const playerGraphics = createMockGraphics();
      const enemyGraphics = createMockGraphics();

      world.add({
        position: { x: 1000, y: 500 },
        sprite: { graphics: playerGraphics },
        playerControlled: true,
      });
      world.add({
        position: { x: 1100, y: 550 },
        sprite: { graphics: enemyGraphics },
      });

      // Camera follows player
      const camera = { x: 1000, y: 500 };
      renderSystem(world, camera, 800, 600);

      // Player at screen center
      expect(playerGraphics.x).toBe(400);
      expect(playerGraphics.y).toBe(300);

      // Enemy offset from player
      expect(enemyGraphics.x).toBe(500); // 400 + (1100-1000)
      expect(enemyGraphics.y).toBe(350); // 300 + (550-500)
    });

    it("should handle entities behind camera (negative screen positions)", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics },
      });

      // Camera far ahead
      const camera = { x: 1000, y: 1000 };
      renderSystem(world, camera, 800, 600);

      // Entity should be off-screen to the top-left
      expect(graphics.x).toBe(-600); // 400 - 1000
      expect(graphics.y).toBe(-700); // 300 - 1000
    });

    it("should handle different screen sizes", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 100, y: 100 },
        sprite: { graphics },
      });

      const camera = { x: 100, y: 100 };
      renderSystem(world, camera, 1920, 1080);

      // Entity at camera position = screen center
      expect(graphics.x).toBe(960); // 1920/2
      expect(graphics.y).toBe(540); // 1080/2
    });
  });

  describe("Multiple Entities", () => {
    it("should apply camera offset to all entities", () => {
      const world = createGameWorld();
      const graphics1 = createMockGraphics();
      const graphics2 = createMockGraphics();
      const graphics3 = createMockGraphics();

      world.add({
        position: { x: 0, y: 0 },
        sprite: { graphics: graphics1 },
      });
      world.add({
        position: { x: 100, y: 100 },
        sprite: { graphics: graphics2 },
      });
      world.add({
        position: { x: -50, y: 50 },
        sprite: { graphics: graphics3 },
      });

      const camera = { x: 50, y: 50 };
      renderSystem(world, camera, 800, 600);

      // All positions offset by camera
      expect(graphics1.x).toBe(350); // 400 + (0-50)
      expect(graphics1.y).toBe(250); // 300 + (0-50)
      expect(graphics2.x).toBe(450); // 400 + (100-50)
      expect(graphics2.y).toBe(350); // 300 + (100-50)
      expect(graphics3.x).toBe(300); // 400 + (-50-50)
      expect(graphics3.y).toBe(300); // 300 + (50-50)
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
      expect(() =>
        renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height)
      ).not.toThrow();
    });

    it("should not affect entities without position", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics(999, 999);
      world.add({
        sprite: { graphics },
        // No position
      });

      renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height);

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

      renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height);

      expect(graphicsWithPosition.x).toBe(500); // 400 + 100
      expect(graphicsWithPosition.y).toBe(500); // 300 + 200
      expect(graphicsNoPosition.x).toBe(999); // Unchanged
      expect(graphicsNoPosition.y).toBe(999); // Unchanged
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty world", () => {
      const world = createGameWorld();

      // Should not throw
      expect(() =>
        renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height)
      ).not.toThrow();
    });

    it("should handle very large world positions", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 999999, y: 999999 },
        sprite: { graphics },
      });

      const camera = { x: 999999, y: 999999 };
      renderSystem(world, camera, 800, 600);

      // Should still render at screen center
      expect(graphics.x).toBe(400);
      expect(graphics.y).toBe(300);
    });

    it("should handle decimal positions", () => {
      const world = createGameWorld();
      const graphics = createMockGraphics();
      world.add({
        position: { x: 100.5, y: 200.75 },
        sprite: { graphics },
      });

      renderSystem(world, defaultCamera, defaultScreen.width, defaultScreen.height);

      expect(graphics.x).toBe(500.5); // 400 + 100.5
      expect(graphics.y).toBe(500.75); // 300 + 200.75
    });
  });
});
