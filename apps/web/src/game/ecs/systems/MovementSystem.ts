import type { GameWorld } from "../World";
import type { InputState } from "../../InputSystem";

/**
 * Player movement speed in pixels per second
 */
export const PLAYER_SPEED = 200;

/**
 * Padding from screen edges for player clamping
 */
export const BOUNDARY_PADDING = 20;

/**
 * Bounds for clamping player position
 */
export interface Bounds {
  width: number;
  height: number;
}

/**
 * Movement System
 *
 * Processes all entities with position and velocity components.
 * For player entities, updates velocity based on input.
 * Clamps player position to screen boundaries.
 *
 * @param world - The game world
 * @param deltaMs - Time since last frame in milliseconds
 * @param input - Current input state
 * @param bounds - Screen bounds for clamping
 */
export function movementSystem(
  world: GameWorld,
  deltaMs: number,
  input: InputState,
  bounds: Bounds
): void {
  const deltaSeconds = deltaMs / 1000;

  // Step 1: Update player velocity from input
  for (const entity of world.with("playerControlled", "velocity")) {
    entity.velocity.vx = input.movement.x * PLAYER_SPEED;
    entity.velocity.vy = input.movement.y * PLAYER_SPEED;
  }

  // Step 2: Apply velocity to all moving entities
  for (const entity of world.with("position", "velocity")) {
    entity.position.x += entity.velocity.vx * deltaSeconds;
    entity.position.y += entity.velocity.vy * deltaSeconds;
  }

  // Step 3: Clamp player to screen bounds
  for (const entity of world.with("playerControlled", "position")) {
    entity.position.x = Math.max(
      BOUNDARY_PADDING,
      Math.min(bounds.width - BOUNDARY_PADDING, entity.position.x)
    );
    entity.position.y = Math.max(
      BOUNDARY_PADDING,
      Math.min(bounds.height - BOUNDARY_PADDING, entity.position.y)
    );
  }
}
