import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickupAttractionSystem } from "./PickupAttractionSystem";
import { createGameWorld } from "../ecs/World";
import { DEFAULT_PICKUP_CONFIG } from "./types";

// Mock PixiJS
vi.mock("pixi.js", () => ({
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  })),
}));

describe("PickupAttractionSystem", () => {
  let world: ReturnType<typeof createGameWorld>;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe("Attraction triggering", () => {
    it("should mark pickup as attracted when within magnet range", () => {
      // Player at origin
      const playerPos = { x: 0, y: 0 };

      // Pickup at 50px (within default 100px range)
      const pickup = world.add({
        position: { x: 50, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(pickup.pickup!.isAttracted).toBe(true);
    });

    it("should not mark pickup as attracted when outside magnet range", () => {
      const playerPos = { x: 0, y: 0 };

      // Pickup at 150px (outside default 100px range)
      const pickup = world.add({
        position: { x: 150, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(pickup.pickup!.isAttracted).toBe(false);
    });

    it("should use custom magnet range from config", () => {
      const playerPos = { x: 0, y: 0 };
      const customConfig = { ...DEFAULT_PICKUP_CONFIG, magnetRange: 200 };

      // Pickup at 150px (within 200px custom range)
      const pickup = world.add({
        position: { x: 150, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, playerPos, customConfig);

      expect(pickup.pickup!.isAttracted).toBe(true);
    });
  });

  describe("Velocity toward player", () => {
    it("should set velocity toward player when attracted", () => {
      const playerPos = { x: 0, y: 0 };

      // Pickup to the right of player, already attracted
      const pickup = world.add({
        position: { x: 100, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: true,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      // Should move left (negative vx) toward player
      expect(pickup.velocity!.vx).toBeLessThan(0);
      expect(pickup.velocity!.vy).toBe(0);
    });

    it("should set velocity at attraction speed", () => {
      const playerPos = { x: 0, y: 0 };

      const pickup = world.add({
        position: { x: 100, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: true,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      // Velocity magnitude should equal attractionSpeed
      const speed = Math.sqrt(pickup.velocity!.vx ** 2 + pickup.velocity!.vy ** 2);
      expect(speed).toBeCloseTo(DEFAULT_PICKUP_CONFIG.attractionSpeed, 0);
    });

    it("should handle diagonal attraction", () => {
      const playerPos = { x: 0, y: 0 };

      // Pickup at diagonal position
      const pickup = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: true,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      // Both components should be negative (moving toward origin)
      expect(pickup.velocity!.vx).toBeLessThan(0);
      expect(pickup.velocity!.vy).toBeLessThan(0);

      // Velocity magnitude should still equal attractionSpeed
      const speed = Math.sqrt(pickup.velocity!.vx ** 2 + pickup.velocity!.vy ** 2);
      expect(speed).toBeCloseTo(DEFAULT_PICKUP_CONFIG.attractionSpeed, 0);
    });
  });

  describe("Position update", () => {
    it("should update position based on velocity and delta time", () => {
      const playerPos = { x: 0, y: 0 };

      const pickup = world.add({
        position: { x: 100, y: 0 },
        velocity: { vx: -100, vy: 0 }, // Moving left at 100px/s
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: true,
          lifetime: 30000,
        },
      });

      // 100ms delta
      pickupAttractionSystem(world, 100, playerPos, DEFAULT_PICKUP_CONFIG);

      // Should have moved 10px left (100px/s * 0.1s)
      // But velocity is recalculated, so check it moved closer to player
      expect(pickup.position!.x).toBeLessThan(100);
    });
  });

  describe("No player position", () => {
    it("should not modify pickups when player position is null", () => {
      const pickup = world.add({
        position: { x: 50, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, null, DEFAULT_PICKUP_CONFIG);

      expect(pickup.pickup!.isAttracted).toBe(false);
      expect(pickup.velocity!.vx).toBe(0);
      expect(pickup.velocity!.vy).toBe(0);
    });
  });

  describe("Multiple pickups", () => {
    it("should process all pickups independently", () => {
      const playerPos = { x: 0, y: 0 };

      // Close pickup (should be attracted)
      const closePickup = world.add({
        position: { x: 50, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      // Far pickup (should not be attracted)
      const farPickup = world.add({
        position: { x: 200, y: 0 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(closePickup.pickup!.isAttracted).toBe(true);
      expect(farPickup.pickup!.isAttracted).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle pickup at same position as player", () => {
      const playerPos = { x: 100, y: 100 };

      const pickup = world.add({
        position: { x: 100, y: 100 },
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: true,
          lifetime: 30000,
        },
      });

      // Should not throw or produce NaN
      expect(() =>
        pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG)
      ).not.toThrow();

      expect(Number.isNaN(pickup.velocity!.vx)).toBe(false);
      expect(Number.isNaN(pickup.velocity!.vy)).toBe(false);
    });

    it("should handle pickup without position component", () => {
      world.add({
        velocity: { vx: 0, vy: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      const playerPos = { x: 0, y: 0 };

      // Should not throw
      expect(() =>
        pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG)
      ).not.toThrow();
    });

    it("should handle pickup without velocity component", () => {
      world.add({
        position: { x: 50, y: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      const playerPos = { x: 0, y: 0 };

      // Should not throw
      expect(() =>
        pickupAttractionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG)
      ).not.toThrow();
    });
  });
});
