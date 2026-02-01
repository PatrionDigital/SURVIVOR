import type { GameWorld, Entity } from "../ecs/World";

/**
 * Result of projectile collision detection
 */
export interface ProjectileCollisionResult {
  /** Number of enemies hit by player projectiles */
  enemiesHit: number;
  /** Total damage dealt to enemies */
  totalDamageDealt: number;
  /** Whether the player was hit by enemy projectiles */
  playerHit: boolean;
  /** Total damage taken by player */
  playerDamageTaken: number;
}

/**
 * ProjectileCollisionSystem - Handles projectile impacts
 *
 * Faction-based collision filtering:
 * - Player projectiles only hit enemies
 * - Enemy projectiles only hit player (unless invincible)
 *
 * @param world - ECS world
 * @param projectileRadius - Collision radius for projectiles
 * @param playerRadius - Player collision radius (default 20)
 * @returns Collision results
 */
export function projectileCollisionSystem(
  world: GameWorld,
  projectileRadius: number,
  playerRadius: number = 20
): ProjectileCollisionResult {
  const result: ProjectileCollisionResult = {
    enemiesHit: 0,
    totalDamageDealt: 0,
    playerHit: false,
    playerDamageTaken: 0,
  };

  // Find player entity
  let playerEntity: Entity | null = null;
  for (const entity of world.with("playerControlled", "position", "health")) {
    playerEntity = entity;
    break;
  }

  // Process each projectile
  for (const projectile of world.with("projectile", "position")) {
    // Skip consumed projectiles
    if (projectile.projectile.consumed) {
      continue;
    }

    const projPos = projectile.position;

    if (projectile.projectile.faction === "player") {
      // Player projectile - check against enemies
      for (const enemy of world.with("enemy", "position", "health")) {
        const enemyRadius = enemy.enemy!.config.visual.radius;
        const dx = enemy.position.x - projPos.x;
        const dy = enemy.position.y - projPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const combinedRadii = projectileRadius + enemyRadius;

        if (distance <= combinedRadii) {
          // Hit!
          const damage = projectile.projectile.damage;
          enemy.health.current -= damage;

          result.enemiesHit++;
          result.totalDamageDealt += damage;

          // Handle pierce
          if (
            projectile.projectile.pierceRemaining !== undefined &&
            projectile.projectile.pierceRemaining > 0
          ) {
            projectile.projectile.pierceRemaining--;
            if (projectile.projectile.pierceRemaining <= 0) {
              projectile.projectile.consumed = true;
              break; // Stop checking more enemies
            }
            // Continue to next enemy (pierce through)
          } else {
            projectile.projectile.consumed = true;
            break; // Stop checking more enemies
          }
        }
      }
    } else if (projectile.projectile.faction === "enemy") {
      // Enemy projectile - check against player
      if (playerEntity && !playerEntity.invincibility) {
        const dx = playerEntity.position!.x - projPos.x;
        const dy = playerEntity.position!.y - projPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const combinedRadii = projectileRadius + playerRadius;

        if (distance <= combinedRadii) {
          // Hit!
          const damage = projectile.projectile.damage;
          playerEntity.health!.current -= damage;

          result.playerHit = true;
          result.playerDamageTaken += damage;

          projectile.projectile.consumed = true;
        }
      }
    }
  }

  return result;
}
