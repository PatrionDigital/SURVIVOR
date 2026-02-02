import { World } from "miniplex";
import type { Position, Velocity, Health, Invincibility, Sprite, EnemyAI } from "./components";
import type { Projectile } from "../combat/types";
import type { Pickup } from "../pickups/types";

/**
 * Entity type for the game ECS
 *
 * All components are optional - entities have only the components they need.
 * Use tag components (boolean) for marking entity types.
 */
export type Entity = {
  position?: Position;
  velocity?: Velocity;
  health?: Health;
  invincibility?: Invincibility;
  sprite?: Sprite;
  playerControlled?: boolean;
  enemy?: EnemyAI;
  projectile?: Projectile;
  pickup?: Pickup;
};

/**
 * GameWorld type alias
 *
 * Uses miniplex's native World class which provides:
 * - addComponent(entity, component, value): Add component and reindex entity
 * - removeComponent(entity, component): Remove component and reindex entity
 * - with(...components): Query entities with specific components
 * - without(...components): Query entities without specific components
 */
export type GameWorld = World<Entity>;

/**
 * Create a new game world
 *
 * Uses miniplex's native World class directly - no custom methods needed.
 * Miniplex 2.0 provides addComponent/removeComponent with proper reindexing.
 */
export function createGameWorld(): GameWorld {
  return new World<Entity>();
}
