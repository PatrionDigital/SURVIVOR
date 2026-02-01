import { EntityManager, SeekBehavior, Vehicle } from "yuka";
import type { GameWorld } from "../ecs/World";

/**
 * EnemyAISystem - Updates enemy AI using Yuka steering behaviors
 *
 * This system:
 * 1. Updates the Yuka EntityManager (runs steering behaviors)
 * 2. Syncs Yuka Vehicle positions/velocities back to ECS components
 * 3. Switches behaviors based on player proximity (flocking <-> seeking)
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
    const { vehicle, config } = entity.enemy!;

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

    // Update behavior based on player proximity
    if (playerPosition && entity.position) {
      const dx = playerPosition.x - entity.position.x;
      const dy = playerPosition.y - entity.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= config.vision.range) {
        // Player in range - switch to seeking
        if (entity.enemy!.currentBehavior !== "seeking") {
          entity.enemy!.currentBehavior = "seeking";
          setSeekingBehavior(vehicle, true);
        }
        // Always update seek target to track player movement
        updateSeekTarget(vehicle, playerPosition);
      } else {
        // Player out of range - switch to flocking
        if (entity.enemy!.currentBehavior !== "flocking") {
          entity.enemy!.currentBehavior = "flocking";
          setSeekingBehavior(vehicle, false);
        }
      }
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
 * Enable or disable seeking behavior
 */
function setSeekingBehavior(vehicle: Vehicle, active: boolean): void {
  const seekBehavior = findSeekBehavior(vehicle);
  if (seekBehavior) {
    seekBehavior.active = active;
  }
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
