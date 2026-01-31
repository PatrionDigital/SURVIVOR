import { describe, it, expect } from "vitest";
import { createGameWorld } from "../World";
import { movementSystem, PLAYER_SPEED } from "./MovementSystem";
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
      movementSystem(world, 1000, input); // 1 second

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
      movementSystem(world, 500, input); // 0.5 seconds

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
      movementSystem(world, 1000, input);

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
      movementSystem(world, 1000, input);

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
      movementSystem(world, 16, input);

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
      movementSystem(world, 16, input);

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
      movementSystem(world, 16, input);

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
      movementSystem(world, 16, input);

      const enemies = [...world.with("velocity")].filter((e) => !e.playerControlled);
      expect(enemies[0].velocity?.vx).toBe(50); // Unchanged
      expect(enemies[0].velocity?.vy).toBe(50);
    });
  });

  describe("Infinite Arena (No Boundaries)", () => {
    it("should allow player to move to any position", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        playerControlled: true,
      });

      // Move far in negative direction
      const input = createMockInput({ x: -1, y: -1 });
      movementSystem(world, 10000, input); // 10 seconds

      const [player] = [...world.with("playerControlled", "position")];
      // Should be far negative - no clamping
      expect(player.position?.x).toBeLessThan(-1000);
      expect(player.position?.y).toBeLessThan(-1000);
    });

    it("should allow player to move to very large positive positions", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: 0, vy: 0 },
        playerControlled: true,
      });

      const input = createMockInput({ x: 1, y: 1 });
      movementSystem(world, 10000, input); // 10 seconds

      const [player] = [...world.with("playerControlled", "position")];
      // Should be far positive - no clamping
      expect(player.position?.x).toBeGreaterThan(1000);
      expect(player.position?.y).toBeGreaterThan(1000);
    });

    it("should allow non-player entities to move anywhere", () => {
      const world = createGameWorld();
      world.add({
        position: { x: 0, y: 0 },
        velocity: { vx: -1000, vy: -1000 },
      });

      const input = createMockInput();
      movementSystem(world, 1000, input);

      const [entity] = [...world.with("position", "velocity")];
      expect(entity.position?.x).toBe(-1000);
      expect(entity.position?.y).toBe(-1000);
    });
  });
});
