import type { GameWorld, Entity } from "../ecs/World";

/**
 * Result of collision detection
 */
export interface CollisionResult {
  /** Whether the player was hit */
  playerHit: boolean;
  /** List of enemies that collided with the player */
  collidingEnemies: Entity[];
  /** Total damage from all collisions */
  totalDamage: number;
}

/**
 * CollisionSystem - Detects collisions between player and enemies
 *
 * Uses simple circle-based collision detection.
 * Enemy spacing is handled by Yuka's SeparationBehavior.
 *
 * @param world - ECS world
 * @param playerRadius - Player collision radius
 * @returns Collision detection results
 */
export function collisionSystem(world: GameWorld, playerRadius: number): CollisionResult {
  const result: CollisionResult = {
    playerHit: false,
    collidingEnemies: [],
    totalDamage: 0,
  };

  // Find player entity
  let playerEntity: Entity | null = null;
  for (const entity of world.with("playerControlled")) {
    playerEntity = entity;
    break;
  }

  // No player or player has no position - no collisions possible
  if (!playerEntity || !playerEntity.position) {
    return result;
  }

  const playerX = playerEntity.position.x;
  const playerY = playerEntity.position.y;

  // Check each enemy for collision
  for (const enemy of world.with("enemy")) {
    // Skip enemies without position
    if (!enemy.position) {
      continue;
    }

    const enemyRadius = enemy.enemy!.config.visual.radius;

    // Calculate distance between centers
    const dx = enemy.position.x - playerX;
    const dy = enemy.position.y - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if circles overlap (or touch)
    const combinedRadii = playerRadius + enemyRadius;
    if (distance <= combinedRadii) {
      result.playerHit = true;
      result.collidingEnemies.push(enemy);
      // Use effective damage (from wave modifiers) if available, else base damage
      result.totalDamage += enemy.enemy!.effectiveDamage ?? enemy.enemy!.config.combat.damage;
    }
  }

  return result;
}
