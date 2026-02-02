import type { GameWorld, Entity } from "../ecs/World";
import type { PickupConfig } from "./types";

/**
 * Result of pickup collection processing
 */
export interface CollectionResult {
  /** Number of pickups collected this frame */
  collectedCount: number;
  /** Total XP gained from collected pickups */
  totalXP: number;
  /** Number of pickups that expired (despawned) */
  expiredCount: number;
  /** Entities that were collected (for external cleanup if needed) */
  collectedEntities: Entity[];
}

/**
 * PickupCollectionSystem - Handles pickup collection and lifetime
 *
 * This system:
 * 1. Checks if pickups are within collection range of player
 * 2. Collects pickups and accumulates XP
 * 3. Decreases pickup lifetime
 * 4. Removes expired pickups
 *
 * @param world - ECS world
 * @param deltaMs - Delta time in milliseconds
 * @param playerPosition - Current player position (null if not available)
 * @param config - Pickup configuration
 * @returns Collection results
 */
export function pickupCollectionSystem(
  world: GameWorld,
  deltaMs: number,
  playerPosition: { x: number; y: number } | null,
  config: PickupConfig
): CollectionResult {
  const result: CollectionResult = {
    collectedCount: 0,
    totalXP: 0,
    expiredCount: 0,
    collectedEntities: [],
  };

  // Collect pickups to remove (can't modify while iterating)
  const toRemove: { entity: Entity; reason: "collected" | "expired" }[] = [];

  for (const entity of world.with("pickup")) {
    const pickup = entity.pickup!;

    // Decrease lifetime
    pickup.lifetime -= deltaMs;

    // Check for expiration
    if (pickup.lifetime <= 0) {
      toRemove.push({ entity, reason: "expired" });
      continue;
    }

    // Skip collection check if no player position or no pickup position
    if (!playerPosition || !entity.position) {
      continue;
    }

    // Calculate distance to player
    const dx = playerPosition.x - entity.position.x;
    const dy = playerPosition.y - entity.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within collection range
    if (distance <= config.collectionRange) {
      toRemove.push({ entity, reason: "collected" });
      result.collectedCount++;
      result.totalXP += pickup.xpValue;
      result.collectedEntities.push(entity);
    }
  }

  // Remove collected and expired pickups
  for (const { entity, reason } of toRemove) {
    // Destroy sprite graphics
    if (entity.sprite?.graphics) {
      entity.sprite.graphics.destroy();
    }

    // Remove from world
    world.remove(entity);

    if (reason === "expired") {
      result.expiredCount++;
    }
  }

  return result;
}
