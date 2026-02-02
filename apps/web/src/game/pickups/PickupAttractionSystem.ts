import type { GameWorld } from "../ecs/World";
import type { PickupConfig } from "./types";

/**
 * PickupAttractionSystem - Attracts pickups toward the player
 *
 * This system:
 * 1. Checks if pickups are within magnet range
 * 2. Marks pickups as attracted
 * 3. Sets velocity toward player for attracted pickups
 * 4. Updates pickup positions based on velocity
 *
 * @param world - ECS world
 * @param deltaMs - Delta time in milliseconds
 * @param playerPosition - Current player position (null if not available)
 * @param config - Pickup configuration
 */
export function pickupAttractionSystem(
  world: GameWorld,
  deltaMs: number,
  playerPosition: { x: number; y: number } | null,
  config: PickupConfig
): void {
  // Can't attract without player position
  if (!playerPosition) {
    return;
  }

  const deltaSeconds = deltaMs / 1000;

  for (const entity of world.with("pickup")) {
    // Skip pickups without position or velocity
    if (!entity.position || !entity.velocity) {
      continue;
    }

    const pickup = entity.pickup!;
    const pos = entity.position;
    const vel = entity.velocity;

    // Calculate distance to player
    const dx = playerPosition.x - pos.x;
    const dy = playerPosition.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within magnet range
    if (distance <= config.magnetRange && !pickup.isAttracted) {
      pickup.isAttracted = true;
    }

    // Update velocity for attracted pickups
    if (pickup.isAttracted) {
      // Handle edge case: pickup at same position as player
      if (distance < 0.001) {
        vel.vx = 0;
        vel.vy = 0;
      } else {
        // Normalize direction and set velocity
        const dirX = dx / distance;
        const dirY = dy / distance;
        vel.vx = dirX * config.attractionSpeed;
        vel.vy = dirY * config.attractionSpeed;
      }

      // Update position based on velocity
      pos.x += vel.vx * deltaSeconds;
      pos.y += vel.vy * deltaSeconds;
    }
  }
}
