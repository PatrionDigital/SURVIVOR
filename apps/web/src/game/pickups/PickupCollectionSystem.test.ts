import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickupCollectionSystem } from "./PickupCollectionSystem";
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

describe("PickupCollectionSystem", () => {
  let world: ReturnType<typeof createGameWorld>;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe("Collection detection", () => {
    it("should collect pickup when within collection range", () => {
      const playerPos = { x: 0, y: 0 };

      // Pickup within collection range (25px default)
      world.add({
        position: { x: 10, y: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: true,
          lifetime: 30000,
        },
        sprite: {
          graphics: {
            destroy: vi.fn(),
          } as never,
        },
      });

      const result = pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(result.collectedCount).toBe(1);
      expect(result.totalXP).toBe(10);
    });

    it("should not collect pickup outside collection range", () => {
      const playerPos = { x: 0, y: 0 };

      // Pickup outside collection range
      world.add({
        position: { x: 50, y: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      const result = pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(result.collectedCount).toBe(0);
      expect(result.totalXP).toBe(0);
    });

    it("should use custom collection range from config", () => {
      const playerPos = { x: 0, y: 0 };
      const customConfig = { ...DEFAULT_PICKUP_CONFIG, collectionRange: 100 };

      world.add({
        position: { x: 50, y: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
        sprite: {
          graphics: {
            destroy: vi.fn(),
          } as never,
        },
      });

      const result = pickupCollectionSystem(world, 16, playerPos, customConfig);

      expect(result.collectedCount).toBe(1);
    });
  });

  describe("XP accumulation", () => {
    it("should sum XP from multiple collected pickups", () => {
      const playerPos = { x: 0, y: 0 };

      // Multiple pickups within range
      world.add({
        position: { x: 10, y: 0 },
        pickup: { type: "xp_gem", xpValue: 5, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      world.add({
        position: { x: -10, y: 0 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      world.add({
        position: { x: 0, y: 10 },
        pickup: { type: "xp_gem", xpValue: 20, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      const result = pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(result.collectedCount).toBe(3);
      expect(result.totalXP).toBe(35);
    });
  });

  describe("Entity cleanup", () => {
    it("should remove collected pickups from world", () => {
      const playerPos = { x: 0, y: 0 };

      const pickup = world.add({
        position: { x: 10, y: 0 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      const pickups = Array.from(world.with("pickup"));
      expect(pickups).not.toContain(pickup);
    });

    it("should destroy sprite graphics on collection", () => {
      const playerPos = { x: 0, y: 0 };
      const destroySpy = vi.fn();

      world.add({
        position: { x: 10, y: 0 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: destroySpy } as never },
      });

      pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe("Lifetime and despawning", () => {
    it("should decrease pickup lifetime", () => {
      const playerPos = { x: 0, y: 0 };

      const pickup = world.add({
        position: { x: 100, y: 0 }, // Outside collection range
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: false, lifetime: 30000 },
      });

      pickupCollectionSystem(world, 1000, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(pickup.pickup!.lifetime).toBe(29000);
    });

    it("should remove pickups with expired lifetime", () => {
      const playerPos = { x: 0, y: 0 };

      const pickup = world.add({
        position: { x: 100, y: 0 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: false, lifetime: 500 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      // Advance time past lifetime
      pickupCollectionSystem(world, 600, playerPos, DEFAULT_PICKUP_CONFIG);

      const pickups = Array.from(world.with("pickup"));
      expect(pickups).not.toContain(pickup);
    });

    it("should not count expired pickups as collected (no XP)", () => {
      const playerPos = { x: 0, y: 0 };

      world.add({
        position: { x: 100, y: 0 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: false, lifetime: 500 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      const result = pickupCollectionSystem(world, 600, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(result.expiredCount).toBe(1);
      expect(result.totalXP).toBe(0);
    });
  });

  describe("No player position", () => {
    it("should still process lifetime when player position is null", () => {
      const pickup = world.add({
        position: { x: 100, y: 0 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: false, lifetime: 30000 },
      });

      pickupCollectionSystem(world, 1000, null, DEFAULT_PICKUP_CONFIG);

      expect(pickup.pickup!.lifetime).toBe(29000);
    });

    it("should not collect any pickups when player position is null", () => {
      world.add({
        position: { x: 0, y: 0 }, // At origin, would be collected if player was there
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: true, lifetime: 30000 },
      });

      const result = pickupCollectionSystem(world, 16, null, DEFAULT_PICKUP_CONFIG);

      expect(result.collectedCount).toBe(0);
    });
  });

  describe("Result object", () => {
    it("should return collected entities for cleanup", () => {
      const playerPos = { x: 0, y: 0 };

      const pickup1 = world.add({
        position: { x: 10, y: 0 },
        pickup: { type: "xp_gem", xpValue: 5, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      const pickup2 = world.add({
        position: { x: -10, y: 0 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      const result = pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(result.collectedEntities).toContain(pickup1);
      expect(result.collectedEntities).toContain(pickup2);
    });
  });

  describe("Edge cases", () => {
    it("should handle pickup without position gracefully", () => {
      const playerPos = { x: 0, y: 0 };

      world.add({
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: false, lifetime: 30000 },
      });

      expect(() =>
        pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG)
      ).not.toThrow();
    });

    it("should handle pickup at exact player position", () => {
      const playerPos = { x: 100, y: 100 };

      world.add({
        position: { x: 100, y: 100 },
        pickup: { type: "xp_gem", xpValue: 10, isAttracted: true, lifetime: 30000 },
        sprite: { graphics: { destroy: vi.fn() } as never },
      });

      const result = pickupCollectionSystem(world, 16, playerPos, DEFAULT_PICKUP_CONFIG);

      expect(result.collectedCount).toBe(1);
    });
  });
});
