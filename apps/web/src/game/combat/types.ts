import type { Graphics } from "pixi.js";

/**
 * Faction determines which entities a projectile can damage
 */
export type Faction = "player" | "enemy";

/**
 * Projectile component - shared between player and enemy projectiles
 *
 * Uses faction-based collision filtering:
 * - Player projectiles damage enemies
 * - Enemy projectiles damage player
 */
export interface Projectile {
  /** Which side fired this projectile */
  faction: Faction;
  /** Damage dealt on hit */
  damage: number;
  /** Time remaining before despawn (ms) */
  lifetime: number;
  /** Max lifetime for percentage calculations */
  maxLifetime: number;
  /** Has this projectile already hit something? */
  consumed: boolean;
  /** Optional: pierce count (how many enemies it can hit) */
  pierceRemaining?: number;
}

/**
 * Weapon configuration - defines how a weapon fires
 */
export interface WeaponConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Base damage per projectile */
  damage: number;
  /** Cooldown between shots (ms) */
  cooldown: number;
  /** Projectile speed (pixels/second) */
  projectileSpeed: number;
  /** Projectile lifetime (ms) */
  projectileLifetime: number;
  /** Maximum targeting range in pixels (limits auto-aim distance) */
  range: number;
  /** Visual configuration */
  visual: {
    color: number;
    radius: number;
  };
  /** Number of projectiles per shot */
  projectilesPerShot: number;
  /** Spread angle in degrees (for multi-projectile weapons) */
  spreadAngle: number;
  /** Pierce count (0 = no pierce) */
  pierce: number;
}

/**
 * Enemy attack configuration - simpler than player weapons
 */
export interface EnemyAttackConfig {
  /** Damage dealt */
  damage: number;
  /** Cooldown between attacks (ms) */
  cooldown: number;
  /** Attack range (0 = contact only) */
  range: number;
  /** Projectile speed (if ranged) */
  projectileSpeed?: number;
  /** Projectile lifetime (if ranged) */
  projectileLifetime?: number;
  /** Visual configuration (if ranged) */
  visual?: {
    color: number;
    radius: number;
  };
}

/**
 * Create a projectile graphics object
 * Shared renderer for all projectile types
 */
export function createProjectileGraphics(_color: number, _radius: number): Graphics {
  // This will be implemented with actual PixiJS
  // For now, return type signature for TDD
  throw new Error("Not implemented - use mock in tests");
}
