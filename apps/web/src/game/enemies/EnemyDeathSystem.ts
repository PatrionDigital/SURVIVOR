import { EntityManager } from "yuka";
import type { GameWorld, Entity } from "../ecs/World";

/**
 * Information about a single enemy death
 */
export interface EnemyDeath {
  /** Position where enemy died */
  position: { x: number; y: number };
  /** XP value of the enemy */
  xpValue: number;
}

/**
 * Result of enemy death processing
 */
export interface DeathResult {
  /** Number of enemies killed this frame */
  killedCount: number;
  /** Total XP earned from killed enemies */
  totalXP: number;
  /** Details of each enemy death (position and XP) */
  deaths: EnemyDeath[];
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
export function enemyDeathSystem(world: GameWorld, yukaManager: EntityManager): DeathResult {
  const result: DeathResult = {
    killedCount: 0,
    totalXP: 0,
    deaths: [],
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
      const xpValue = entity.enemy!.config.combat.xpValue;
      result.killedCount++;
      result.totalXP += xpValue;

      // Record death position for pickup spawning
      if (entity.position) {
        result.deaths.push({
          position: { x: entity.position.x, y: entity.position.y },
          xpValue,
        });
      }
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
