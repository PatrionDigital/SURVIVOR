import { Container, Graphics } from "pixi.js";
import type { GameWorld, Entity } from "../ecs/World";
import { XP_GEM_TIERS, DEFAULT_PICKUP_CONFIG, getXPGemTier } from "./types";

/**
 * Create an XP gem pickup entity
 *
 * @param world - ECS world to add entity to
 * @param container - PixiJS container for sprite
 * @param position - Spawn position
 * @param xpValue - XP value when collected
 * @param lifetime - Optional custom lifetime in ms
 * @returns The created entity
 */
export function createXPGem(
  world: GameWorld,
  container: Container,
  position: { x: number; y: number },
  xpValue: number,
  lifetime?: number
): Entity {
  // Determine tier based on XP value
  const tier = getXPGemTier(xpValue);
  const tierConfig = XP_GEM_TIERS[tier];

  // Create sprite graphics
  const graphics = new Graphics();
  graphics.circle(0, 0, tierConfig.visual.radius);
  graphics.fill({ color: tierConfig.visual.color });

  container.addChild(graphics);

  // Create ECS entity with all components
  const entity = world.add({
    position: { x: position.x, y: position.y },
    velocity: { vx: 0, vy: 0 },
    sprite: { graphics },
    pickup: {
      type: "xp_gem",
      xpValue,
      tier,
      isAttracted: false,
      lifetime: lifetime ?? DEFAULT_PICKUP_CONFIG.lifetime,
    },
  });

  return entity;
}

/**
 * Destroy a pickup entity and clean up resources
 *
 * @param world - ECS world to remove entity from
 * @param entity - The entity to destroy
 */
export function destroyPickup(world: GameWorld, entity: Entity): void {
  // Destroy sprite graphics
  if (entity.sprite?.graphics) {
    entity.sprite.graphics.destroy();
  }

  // Remove entity from ECS world
  world.remove(entity);
}
