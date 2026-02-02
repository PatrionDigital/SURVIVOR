import { Container } from "pixi.js";
import type { GameWorld } from "../ecs/World";
import type { WeaponConfig } from "./types";
import { spawnProjectile } from "./ProjectileSystem";

/**
 * PlayerWeaponSystem - Handles player auto-attacking weapons
 *
 * Features:
 * - Auto-aim at nearest enemy
 * - Configurable cooldown
 * - Multi-projectile spread shots
 * - Upgradeable through config changes
 */
export class PlayerWeaponSystem {
  private world: GameWorld;
  private container: Container;
  private config: WeaponConfig;
  private cooldownRemaining: number = 0;

  constructor(world: GameWorld, container: Container, config: WeaponConfig) {
    this.world = world;
    this.container = container;
    this.config = config;
  }

  /**
   * Update weapon system (fire if ready and target available)
   * @param deltaMs - Time since last update
   * @param playerPosition - Current player position
   */
  update(deltaMs: number, playerPosition: { x: number; y: number }): void {
    // Reduce cooldown
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaMs);

    // Can we fire?
    if (this.cooldownRemaining > 0) {
      return;
    }

    // Find target
    const target = this.findNearestEnemy(playerPosition);
    if (!target) {
      return;
    }

    // Fire!
    this.fire(playerPosition, target);
    this.cooldownRemaining = this.config.cooldown;
  }

  /**
   * Find nearest enemy position within weapon range
   */
  findNearestEnemy(playerPosition: { x: number; y: number }): { x: number; y: number } | null {
    let nearestEnemy: { x: number; y: number } | null = null;
    let nearestDistance = Infinity;

    for (const enemy of this.world.with("enemy", "position")) {
      const dx = enemy.position.x - playerPosition.x;
      const dy = enemy.position.y - playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only consider enemies within weapon range
      if (distance <= this.config.range && distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = { x: enemy.position.x, y: enemy.position.y };
      }
    }

    return nearestEnemy;
  }

  /**
   * Fire projectile(s) at target
   */
  private fire(origin: { x: number; y: number }, target: { x: number; y: number }): void {
    // Calculate direction to target
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return; // Target is at same position
    }

    // Normalize direction
    const baseDir = { x: dx / distance, y: dy / distance };

    // Single projectile or spread?
    if (this.config.projectilesPerShot === 1) {
      // Single projectile
      spawnProjectile(
        this.world,
        this.container,
        "player",
        origin,
        baseDir,
        this.config.damage,
        this.config.projectileSpeed,
        this.config.projectileLifetime,
        this.config.visual,
        this.config.pierce
      );
    } else {
      // Spread shot
      const count = this.config.projectilesPerShot;
      const spreadRad = (this.config.spreadAngle * Math.PI) / 180;
      const angleStep = count > 1 ? spreadRad / (count - 1) : 0;
      const startAngle = -spreadRad / 2;

      // Get base angle
      const baseAngle = Math.atan2(baseDir.y, baseDir.x);

      for (let i = 0; i < count; i++) {
        const angle = baseAngle + startAngle + angleStep * i;
        const dir = {
          x: Math.cos(angle),
          y: Math.sin(angle),
        };

        spawnProjectile(
          this.world,
          this.container,
          "player",
          origin,
          dir,
          this.config.damage,
          this.config.projectileSpeed,
          this.config.projectileLifetime,
          this.config.visual,
          this.config.pierce
        );
      }
    }
  }

  /**
   * Get current cooldown remaining
   */
  getCooldownRemaining(): number {
    return this.cooldownRemaining;
  }

  /**
   * Get current weapon config
   */
  getWeaponConfig(): WeaponConfig {
    return this.config;
  }

  /**
   * Set new weapon config (for upgrades)
   */
  setWeaponConfig(config: WeaponConfig): void {
    this.config = config;
  }
}
