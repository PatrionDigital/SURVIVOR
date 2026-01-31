import { describe, it, expect } from "vitest";
import { createGameWorld } from "../World";
import { movementSystem, PLAYER_SPEED, BOUNDARY_PADDING } from "./MovementSystem";
import type { InputState } from "../../InputSystem";

// Helper to create mock input state
function createMockInput(movement = { x: 0, y: 0 }): InputState {
  return {
    movement,
  };
}

describe("MovementSystem", () => {
  describe("Velocity Application", () => {
    it("should apply velocity to position over time", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 100, vy: 50 },
      });

      const input = createMockInput();
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds); // 1 second

      const [entity] = [...world.with("position")];
      expect(entity.position?.x).toBe(200); // 100 + 100*1
      expect(entity.position?.y).toBe(150); // 100 + 50*1
    });

    it("should scale movement by delta time", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 200, vy: 100 },
      });

      const input = createMockInput();
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 500, input, bounds); // 0.5 seconds

      const [entity] = [...world.with("position")];
      expect(entity.position?.x).toBe(100); // 200 * 0.5
      expect(entity.position?.y).toBe(50); // 100 * 0.5
    });

    it("should move multiple entities", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 10, vy: 10 },
      });
      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: -20, vy: -20 },
      });

      const input = createMockInput();
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds);

      const entities = [...world.with("position", "velocity")];
      expect(entities[0].position?.x).toBe(10);
      expect(entities[1].position?.x).toBe(80);
    });

    it("should not move entities without velocity", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 50, y: 50 },
        // No velocity
      });

      const input = createMockInput();
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds);

      const [entity] = [...world.with("position")];
      expect(entity.position?.x).toBe(50);
      expect(entity.position?.y).toBe(50);
    });
  });

  describe("Player Input", () => {
    it("should set player velocity from input", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 400, y: 300 },
        velocity: { vx: 0, vy: 0 },
        playerControlled: true,
      });

      const input = createMockInput({ x: 1, y: 0 }); // Moving right
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 16, input, bounds);

      const [player] = [...world.with("playerControlled", "velocity")];
      expect(player.velocity?.vx).toBe(PLAYER_SPEED);
      expect(player.velocity?.vy).toBe(0);
    });

    it("should handle diagonal movement input", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 400, y: 300 },
        velocity: { vx: 0, vy: 0 },
        playerControlled: true,
      });

      // Diagonal input (normalized would be ~0.707)
      const input = createMockInput({ x: 0.707, y: 0.707 });
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 16, input, bounds);

      const [player] = [...world.with("playerControlled", "velocity")];
      expect(player.velocity?.vx).toBeCloseTo(PLAYER_SPEED * 0.707, 1);
      expect(player.velocity?.vy).toBeCloseTo(PLAYER_SPEED * 0.707, 1);
    });

    it("should stop player when no input", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 400, y: 300 },
        velocity: { vx: PLAYER_SPEED, vy: 0 }, // Already moving
        playerControlled: true,
      });

      const input = createMockInput({ x: 0, y: 0 }); // No input
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 16, input, bounds);

      const [player] = [...world.with("playerControlled", "velocity")];
      expect(player.velocity?.vx).toBe(0);
      expect(player.velocity?.vy).toBe(0);
    });

    it("should not affect non-player entities with input", () => {
      const world = createGameWorld();
      // Player
      world.add({
        position: { x: 400, y: 300 },
        velocity: { vx: 0, vy: 0 },
        playerControlled: true,
      });
      // Enemy (no playerControlled)
      world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 50, vy: 50 },
      });

      const input = createMockInput({ x: 1, y: 0 });
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 16, input, bounds);

      const enemies = [...world.with("velocity")].filter((e) => !e.playerControlled);
      expect(enemies[0].velocity?.vx).toBe(50); // Unchanged
      expect(enemies[0].velocity?.vy).toBe(50);
    });
  });

  describe("Screen Boundary Clamping", () => {
    it("should clamp player to left boundary", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 0, y: 300 },
        velocity: { vx: -100, vy: 0 },
        playerControlled: true,
      });

      const input = createMockInput({ x: -1, y: 0 });
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds);

      const [player] = [...world.with("playerControlled", "position")];
      expect(player.position?.x).toBe(BOUNDARY_PADDING);
    });

    it("should clamp player to right boundary", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 800, y: 300 },
        velocity: { vx: 100, vy: 0 },
        playerControlled: true,
      });

      const input = createMockInput({ x: 1, y: 0 });
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds);

      const [player] = [...world.with("playerControlled", "position")];
      expect(player.position?.x).toBe(800 - BOUNDARY_PADDING);
    });

    it("should clamp player to top boundary", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 400, y: 0 },
        velocity: { vx: 0, vy: -100 },
        playerControlled: true,
      });

      const input = createMockInput({ x: 0, y: -1 });
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds);

      const [player] = [...world.with("playerControlled", "position")];
      expect(player.position?.y).toBe(BOUNDARY_PADDING);
    });

    it("should clamp player to bottom boundary", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 400, y: 600 },
        velocity: { vx: 0, vy: 100 },
        playerControlled: true,
      });

      const input = createMockInput({ x: 0, y: 1 });
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds);

      const [player] = [...world.with("playerControlled", "position")];
      expect(player.position?.y).toBe(600 - BOUNDARY_PADDING);
    });

    it("should not clamp non-player entities", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: -100, vy: -100 },
        // Not player controlled
      });

      const input = createMockInput();
      const bounds = { width: 800, height: 600 };

      movementSystem(world, 1000, input, bounds);

      const [entity] = [...world.with("position", "velocity")];
      expect(entity.position?.x).toBe(-100); // Not clamped
      expect(entity.position?.y).toBe(-100);
    });
  });
});
