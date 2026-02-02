import { describe, it, expect, vi, beforeEach } from "vitest";
import { createXPGem, destroyPickup } from "./PickupFactory";
import { createGameWorld } from "../ecs/World";
import { DEFAULT_PICKUP_CONFIG } from "./types";

// Mock PixiJS
vi.mock("pixi.js", () => ({
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  })),
}));

describe("PickupFactory", () => {
  let world: ReturnType<typeof createGameWorld>;
  let mockContainer: { addChild: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    world = createGameWorld();
    mockContainer = { addChild: vi.fn() };
  });

  describe("createXPGem", () => {
    it("should create an entity with position component", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 100, y: 200 }, 10);

      expect(entity.position).toBeDefined();
      expect(entity.position!.x).toBe(100);
      expect(entity.position!.y).toBe(200);
    });

    it("should create an entity with velocity component (zero initial)", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      expect(entity.velocity).toBeDefined();
      expect(entity.velocity!.vx).toBe(0);
      expect(entity.velocity!.vy).toBe(0);
    });

    it("should create an entity with sprite component", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      expect(entity.sprite).toBeDefined();
      expect(entity.sprite!.graphics).toBeDefined();
    });

    it("should create an entity with pickup component", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      expect(entity.pickup).toBeDefined();
      expect(entity.pickup!.type).toBe("xp_gem");
      expect(entity.pickup!.xpValue).toBe(10);
      expect(entity.pickup!.isAttracted).toBe(false);
    });

    it("should set correct XP value from parameter", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 25);

      expect(entity.pickup!.xpValue).toBe(25);
    });

    it("should use default lifetime from config", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      expect(entity.pickup!.lifetime).toBe(DEFAULT_PICKUP_CONFIG.lifetime);
    });

    it("should use custom lifetime when provided", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10, 5000);

      expect(entity.pickup!.lifetime).toBe(5000);
    });

    it("should assign small tier for low XP values", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 1);

      expect(entity.pickup!.tier).toBe("small");
    });

    it("should assign medium tier for moderate XP values", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      expect(entity.pickup!.tier).toBe("medium");
    });

    it("should assign large tier for high XP values", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 20);

      expect(entity.pickup!.tier).toBe("large");
    });

    it("should add sprite to container", () => {
      createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      expect(mockContainer.addChild).toHaveBeenCalled();
    });

    it("should add entity to ECS world", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      const pickups = Array.from(world.with("pickup"));
      expect(pickups).toContain(entity);
    });
  });

  describe("destroyPickup", () => {
    it("should remove entity from ECS world", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      destroyPickup(world, entity);

      const pickups = Array.from(world.with("pickup"));
      expect(pickups).not.toContain(entity);
    });

    it("should destroy sprite graphics", () => {
      const entity = createXPGem(world, mockContainer as never, { x: 0, y: 0 }, 10);

      const destroySpy = vi.spyOn(entity.sprite!.graphics, "destroy");
      destroyPickup(world, entity);

      expect(destroySpy).toHaveBeenCalled();
    });

    it("should handle entity without sprite gracefully", () => {
      const entity = world.add({
        position: { x: 0, y: 0 },
        pickup: {
          type: "xp_gem",
          xpValue: 10,
          isAttracted: false,
          lifetime: 30000,
        },
      });

      // Should not throw
      expect(() => destroyPickup(world, entity)).not.toThrow();
    });
  });
});
