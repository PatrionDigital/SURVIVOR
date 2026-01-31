import type { GameWorld } from "../World";

/**
 * Camera position for rendering offset
 */
export interface CameraPosition {
  x: number;
  y: number;
}

/**
 * Render System
 *
 * Synchronizes sprite graphics positions with entity positions,
 * applying camera offset to convert world coordinates to screen coordinates.
 *
 * The camera position represents the center of the viewport in world space.
 * Entities are rendered relative to the camera, with the camera position
 * appearing at the center of the screen.
 *
 * @param world - The game world
 * @param camera - Camera position in world coordinates
 * @param screenWidth - Screen width in pixels
 * @param screenHeight - Screen height in pixels
 */
export function renderSystem(
  world: GameWorld,
  camera: CameraPosition,
  screenWidth: number,
  screenHeight: number
): void {
  // Calculate offset to center camera on screen
  // Screen center minus camera position gives the world-to-screen offset
  const offsetX = screenWidth / 2 - camera.x;
  const offsetY = screenHeight / 2 - camera.y;

  // Sync sprite position for all entities with position and sprite
  for (const entity of world.with("position", "sprite")) {
    // World position + camera offset = screen position
    entity.sprite.graphics.x = entity.position.x + offsetX;
    entity.sprite.graphics.y = entity.position.y + offsetY;
  }
}
