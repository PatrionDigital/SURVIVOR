import { EntityManager, SeekBehavior, Vehicle } from "yuka";
import type { GameWorld } from "../ecs/World";

/**
 * EnemyAISystem - Updates enemy AI using Yuka steering behaviors
 *
 * This system:
 * 1. Updates the Yuka EntityManager (runs steering behaviors)
 * 2. Syncs Yuka Vehicle positions/velocities back to ECS components
 * 3. Updates seek target to track player position
 *
 * @param world - ECS world
 * @param yukaManager - Yuka EntityManager
 * @param deltaMs - Delta time in milliseconds
 * @param playerPosition - Current player position (null if not available)
 */
export function enemyAISystem(
  world: GameWorld,
  yukaManager: EntityManager,
  deltaMs: number,
  playerPosition: { x: number; y: number } | null
): void {
  // Update Yuka (delta in seconds)
  yukaManager.update(deltaMs / 1000);

  // Sync each enemy entity
  for (const entity of world.with("enemy")) {
    const { vehicle } = entity.enemy!;

    // Sync position from Yuka to ECS
    if (entity.position) {
      entity.position.x = vehicle.position.x;
      entity.position.y = vehicle.position.y;
    }

    // Sync velocity from Yuka to ECS
    if (entity.velocity) {
      entity.velocity.vx = vehicle.velocity.x;
      entity.velocity.vy = vehicle.velocity.y;
    }

    // Always update seek target to chase player (survivor gameplay)
    if (playerPosition) {
      updateSeekTarget(vehicle, playerPosition);
    }
  }
}

/**
 * Find the seek behavior in a vehicle's steering behaviors
 */
function findSeekBehavior(vehicle: Vehicle): SeekBehavior | null {
  for (const behavior of vehicle.steering.behaviors) {
    if (behavior instanceof SeekBehavior) {
      return behavior;
    }
  }
  return null;
}

/**
 * Update the seek behavior target position
 */
function updateSeekTarget(vehicle: Vehicle, target: { x: number; y: number }): void {
  const seekBehavior = findSeekBehavior(vehicle);
  if (seekBehavior) {
    seekBehavior.target.set(target.x, target.y, 0);
  }
}
