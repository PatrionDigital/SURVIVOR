import { describe, it, expect } from "vitest";
import { createGameWorld } from "./World";

describe("ECS World", () => {
  describe("World Creation", () => {
    it("should create an empty world", () => {
      const world = createGameWorld();

      expect(world).toBeDefined();
      expect(world.entities.length).toBe(0);
    });
  });

  describe("Entity Creation", () => {
    it("should create entity with position component", () => {
      const world = createGameWorld();

      const entity = world.add({
        position: { x: 100, y: 200 },
      });

      expect(entity.position).toBeDefined();
      expect(entity.position?.x).toBe(100);
      expect(entity.position?.y).toBe(200);
    });

    it("should create entity with velocity component", () => {
      const world = createGameWorld();

      const entity = world.add({
        velocity: { vx: 50, vy: -25 },
      });

      expect(entity.velocity).toBeDefined();
      expect(entity.velocity?.vx).toBe(50);
      expect(entity.velocity?.vy).toBe(-25);
    });

    it("should create entity with health component", () => {
      const world = createGameWorld();

      const entity = world.add({
        health: { current: 80, max: 100 },
      });

      expect(entity.health).toBeDefined();
      expect(entity.health?.current).toBe(80);
      expect(entity.health?.max).toBe(100);
    });

    it("should create entity with invincibility component", () => {
      const world = createGameWorld();

      const entity = world.add({
        invincibility: { remaining: 1000, duration: 1000 },
      });

      expect(entity.invincibility).toBeDefined();
      expect(entity.invincibility?.remaining).toBe(1000);
      expect(entity.invincibility?.duration).toBe(1000);
    });

    it("should create entity with playerControlled tag", () => {
      const world = createGameWorld();

      const entity = world.add({
        playerControlled: true,
      });

      expect(entity.playerControlled).toBe(true);
    });

    it("should create entity with multiple components", () => {
      const world = createGameWorld();

      const entity = world.add({
        position: { x: 400, y: 300 },
        velocity: { vx: 0, vy: 0 },
        health: { current: 100, max: 100 },
        playerControlled: true,
      });

      expect(entity.position?.x).toBe(400);
      expect(entity.velocity?.vx).toBe(0);
      expect(entity.health?.current).toBe(100);
      expect(entity.playerControlled).toBe(true);
    });
  });

  describe("Entity Queries", () => {
    it("should query entities with position", () => {
      const world = createGameWorld();

      world.add({ position: { x: 0, y: 0 } });
      world.add({ velocity: { vx: 1, vy: 1 } }); // No position
      world.add({ position: { x: 100, y: 100 } });

      const withPosition = [...world.with("position")];

      expect(withPosition.length).toBe(2);
    });

    it("should query entities with multiple components", () => {
      const world = createGameWorld();

      world.add({ position: { x: 0, y: 0 } }); // Only position
      world.add({ position: { x: 1, y: 1 }, velocity: { vx: 1, vy: 1 } }); // Both
      world.add({ velocity: { vx: 2, vy: 2 } }); // Only velocity

      const withBoth = [...world.with("position", "velocity")];

      expect(withBoth.length).toBe(1);
      expect(withBoth[0].position?.x).toBe(1);
    });

    it("should query player entity", () => {
      const world = createGameWorld();

      world.add({ position: { x: 0, y: 0 } }); // Not player
      world.add({
        position: { x: 100, y: 100 },
        playerControlled: true,
      }); // Player

      const players = [...world.with("playerControlled", "position")];

      expect(players.length).toBe(1);
      expect(players[0].position?.x).toBe(100);
    });
  });

  describe("Entity Removal", () => {
    it("should remove entity from world", () => {
      const world = createGameWorld();

      const entity = world.add({ position: { x: 0, y: 0 } });
      expect(world.entities.length).toBe(1);

      world.remove(entity);
      expect(world.entities.length).toBe(0);
    });
  });

  describe("Component Modification", () => {
    it("should allow modifying component values", () => {
      const world = createGameWorld();

      const entity = world.add({
        position: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
      });

      // Direct mutation (miniplex style)
      entity.position!.x = 50;
      entity.health!.current = 80;

      expect(entity.position?.x).toBe(50);
      expect(entity.health?.current).toBe(80);
    });

    it("should add component to existing entity", () => {
      const world = createGameWorld();

      const entity = world.add({
        position: { x: 0, y: 0 },
      });

      expect(entity.invincibility).toBeUndefined();

      // Add invincibility component
      world.addComponent(entity, "invincibility", {
        remaining: 500,
        duration: 500,
      });

      expect(entity.invincibility?.remaining).toBe(500);
    });

    it("should remove component from entity", () => {
      const world = createGameWorld();

      const entity = world.add({
        position: { x: 0, y: 0 },
        invincibility: { remaining: 100, duration: 1000 },
      });

      expect(entity.invincibility).toBeDefined();

      world.removeComponent(entity, "invincibility");

      expect(entity.invincibility).toBeUndefined();
    });
  });
});
