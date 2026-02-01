import { EntityManager } from "yuka";
import type { GameWorld, Entity } from "../ecs/World";

/**
 * Result of enemy death processing
 */
export interface DeathResult {
  /** Number of enemies killed this frame */
  killedCount: number;
  /** Total XP earned from killed enemies */
  totalXP: number;
}

/**
 * EnemyDeathSystem - Handles enemy death and cleanup
 *
 * This system:
 * 1. Checks for enemies with health <= 0
 * 2. Cleans up dead enemies (removes from ECS and Yuka)
 * 3. Returns XP rewards for killed enemies
 *
 * @param world - ECS world
 * @param yukaManager - Yuka EntityManager
 * @returns Death processing results
 */
export function enemyDeathSystem(
  world: GameWorld,
  yukaManager: EntityManager
): DeathResult {
  const result: DeathResult = {
    killedCount: 0,
    totalXP: 0,
  };

  // Collect dead enemies first (can't modify while iterating)
  const deadEnemies: Entity[] = [];

  for (const entity of world.with("enemy")) {
    // Skip enemies without health component
    if (!entity.health) {
      continue;
    }

    // Check if dead
    if (entity.health.current <= 0) {
      deadEnemies.push(entity);
      result.killedCount++;
      result.totalXP += entity.enemy!.config.combat.xpValue;
    }
  }

  // Clean up dead enemies
  for (const entity of deadEnemies) {
    // Remove vehicle from Yuka manager
    if (entity.enemy?.vehicle) {
      yukaManager.remove(entity.enemy.vehicle);
    }

    // Destroy sprite graphics
    if (entity.sprite?.graphics) {
      entity.sprite.graphics.destroy();
    }

    // Remove entity from ECS world
    world.remove(entity);
  }

  return result;
}
