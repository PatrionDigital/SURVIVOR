import type { GameWorld } from "../World";
import type { InputState } from "../../InputSystem";

/**
 * Player movement speed in pixels per second
 */
export const PLAYER_SPEED = 200;

/**
 * Movement System
 *
 * Processes all entities with position and velocity components.
 * For player entities, updates velocity based on input.
 *
 * In an infinite arena, there are no boundary constraints -
 * entities can move freely in any direction.
 *
 * @param world - The game world
 * @param deltaMs - Time since last frame in milliseconds
 * @param input - Current input state
 */
export function movementSystem(world: GameWorld, deltaMs: number, input: InputState): void {
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

  // No boundary clamping - infinite arena
}
