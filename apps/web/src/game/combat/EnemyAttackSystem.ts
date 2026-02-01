import { Container } from "pixi.js";
import type { GameWorld, Entity } from "../ecs/World";
import { spawnProjectile } from "./ProjectileSystem";

/**
 * Configuration for enemy ranged attacks
 */
export interface EnemyAttackConfig {
  /** Cooldown between attacks (ms) */
  cooldown: number;
  /** Range at which enemies can attack */
  range: number;
  /** Projectile speed */
  projectileSpeed: number;
  /** Projectile lifetime (ms) */
  projectileLifetime: number;
  /** Damage per projectile */
  projectileDamage: number;
  /** Visual config */
  visual: {
    color: number;
    radius: number;
  };
}

// Track cooldowns per enemy (using entity as key via WeakMap)
const enemyCooldowns = new WeakMap<Entity, number>();

/**
 * EnemyAttackSystem - Handles enemy ranged attacks
 *
 * Enemies fire projectiles at the player when in range.
 * Each enemy has independent cooldown tracking.
 *
 * @param world - ECS world
 * @param container - PixiJS container for projectile sprites
 * @param deltaMs - Time since last update
 * @param config - Attack configuration
 */
export function enemyAttackSystem(
  world: GameWorld,
  container: Container,
  deltaMs: number,
  config: EnemyAttackConfig
): void {
  // Find player
  let playerPosition: { x: number; y: number } | null = null;
  for (const player of world.with("playerControlled", "position")) {
    playerPosition = { x: player.position.x, y: player.position.y };
    break;
  }

  // No player - no attacks
  if (!playerPosition) {
    return;
  }

  // Process each enemy
  for (const enemy of world.with("enemy", "position")) {
    // Get or initialize cooldown
    let cooldown = enemyCooldowns.get(enemy) ?? 0;

    // Reduce cooldown
    cooldown = Math.max(0, cooldown - deltaMs);

    // Can attack?
    if (cooldown > 0) {
      enemyCooldowns.set(enemy, cooldown);
      continue;
    }

    // Check range
    const dx = playerPosition.x - enemy.position.x;
    const dy = playerPosition.y - enemy.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > config.range) {
      enemyCooldowns.set(enemy, cooldown);
      continue;
    }

    // Fire!
    const direction = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };

    spawnProjectile(
      world,
      container,
      "enemy",
      { x: enemy.position.x, y: enemy.position.y },
      direction,
      config.projectileDamage,
      config.projectileSpeed,
      config.projectileLifetime,
      config.visual
    );

    // Set cooldown
    enemyCooldowns.set(enemy, config.cooldown);
  }
}
