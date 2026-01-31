import type { GameWorld } from "../World";

/**
 * Flash interval for invincibility visual effect (ms)
 */
const FLASH_INTERVAL = 100;

/**
 * Invincibility System
 *
 * Processes all entities with invincibility component.
 * - Decrements the remaining timer by deltaMs
 * - Flashes sprite alpha (0.5/1.0 toggle every 100ms) based on elapsed time
 * - Removes invincibility component when timer expires
 * - Resets sprite alpha to 1.0 when invincibility ends
 *
 * @param world - The game world
 * @param deltaMs - Time since last frame in milliseconds
 */
export function invincibilitySystem(world: GameWorld, deltaMs: number): void {
  // Process all entities with invincibility
  for (const entity of world.with("invincibility")) {
    const invincibility = entity.invincibility;

    // Decrement timer
    invincibility.remaining -= deltaMs;

    // Check if invincibility expired
    if (invincibility.remaining <= 0) {
      // Reset sprite alpha if entity has sprite
      if (entity.sprite) {
        entity.sprite.graphics.alpha = 1;
      }

      // Remove invincibility component
      world.removeComponent(entity, "invincibility");
      continue;
    }

    // Apply flash effect if entity has sprite
    if (entity.sprite) {
      // Calculate elapsed time since invincibility started
      const elapsed = invincibility.duration - invincibility.remaining;

      // Determine flash state based on 100ms intervals
      // Even blocks (0, 2, 4...) = full alpha, odd blocks (1, 3, 5...) = half alpha
      const flashBlock = Math.floor(elapsed / FLASH_INTERVAL);
      entity.sprite.graphics.alpha = flashBlock % 2 === 0 ? 1.0 : 0.5;
    }
  }
}
