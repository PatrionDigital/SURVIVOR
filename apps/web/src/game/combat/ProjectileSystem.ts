import { Container, Graphics } from "pixi.js";
import type { GameWorld, Entity } from "../ecs/World";
import type { Faction } from "./types";

/**
 * Spawn a projectile entity
 *
 * Shared spawner for both player and enemy projectiles.
 * The faction determines what the projectile can hit.
 *
 * @param world - ECS world
 * @param container - PixiJS container for sprites
 * @param faction - Which side owns this projectile
 * @param position - Starting position
 * @param direction - Direction vector (will be normalized)
 * @param damage - Damage on hit
 * @param speed - Projectile speed (pixels/second)
 * @param lifetime - Time before despawn (ms)
 * @param visual - Visual configuration
 * @param pierce - Optional pierce count
 * @returns The created entity
 */
export function spawnProjectile(
  world: GameWorld,
  container: Container,
  faction: Faction,
  position: { x: number; y: number },
  direction: { x: number; y: number },
  damage: number,
  speed: number,
  lifetime: number,
  visual: { color: number; radius: number },
  pierce: number = 0
): Entity {
  // Normalize direction
  const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  const normalizedDir =
    magnitude > 0 ? { x: direction.x / magnitude, y: direction.y / magnitude } : { x: 1, y: 0 };

  // Calculate velocity
  const vx = normalizedDir.x * speed;
  const vy = normalizedDir.y * speed;

  // Create graphics
  const graphics = new Graphics();
  graphics.circle(0, 0, visual.radius);
  graphics.fill({ color: visual.color });

  container.addChild(graphics);

  // Create entity
  const entity = world.add({
    position: { x: position.x, y: position.y },
    velocity: { vx, vy },
    sprite: { graphics },
    projectile: {
      faction,
      damage,
      lifetime,
      maxLifetime: lifetime,
      consumed: false,
      pierceRemaining: pierce > 0 ? pierce : undefined,
    },
  });

  return entity;
}

/**
 * Update projectile positions based on velocity
 *
 * This is separate from the main movement system to allow
 * different physics handling (no bounds, no collision response).
 */
export function projectileMovementSystem(world: GameWorld, deltaMs: number): void {
  const deltaSeconds = deltaMs / 1000;

  for (const entity of world.with("projectile", "position", "velocity")) {
    entity.position.x += entity.velocity.vx * deltaSeconds;
    entity.position.y += entity.velocity.vy * deltaSeconds;
  }
}

/**
 * Update projectile lifetimes and remove expired/consumed projectiles
 */
export function projectileLifetimeSystem(world: GameWorld, deltaMs: number): void {
  const toRemove: Entity[] = [];

  for (const entity of world.with("projectile")) {
    // Decrement lifetime
    entity.projectile.lifetime -= deltaMs;

    // Mark for removal if expired or consumed
    if (entity.projectile.lifetime <= 0 || entity.projectile.consumed) {
      toRemove.push(entity);
    }
  }

  // Remove expired projectiles
  for (const entity of toRemove) {
    // Destroy sprite
    if (entity.sprite?.graphics) {
      entity.sprite.graphics.destroy();
    }

    // Remove from world
    world.remove(entity);
  }
}
