import type { GameWorld } from "../World";

/**
 * Render System
 *
 * Synchronizes sprite graphics positions with entity positions.
 * Queries all entities that have both position and sprite components,
 * then updates the sprite.graphics.x/y to match position.x/y.
 *
 * @param world - The game world
 */
export function renderSystem(world: GameWorld): void {
  // Sync sprite position for all entities with position and sprite
  for (const entity of world.with("position", "sprite")) {
    entity.sprite.graphics.x = entity.position.x;
    entity.sprite.graphics.y = entity.position.y;
  }
}
