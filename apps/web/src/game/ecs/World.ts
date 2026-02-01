import { World } from "miniplex";
import type { Position, Velocity, Health, Invincibility, Sprite, EnemyAI } from "./components";
import type { Projectile } from "../combat/types";

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
};

/**
 * Extended World type with helper methods
 */
export interface GameWorld extends World<Entity> {
  /**
   * Add a component to an existing entity
   */
  addComponent<K extends keyof Entity>(
    entity: Entity,
    component: K,
    value: NonNullable<Entity[K]>
  ): void;

  /**
   * Remove a component from an entity
   */
  removeComponent<K extends keyof Entity>(entity: Entity, component: K): void;
}

/**
 * Create a new game world with helper methods
 */
export function createGameWorld(): GameWorld {
  const world = new World<Entity>() as GameWorld;

  // Add helper method to add components
  world.addComponent = <K extends keyof Entity>(
    entity: Entity,
    component: K,
    value: NonNullable<Entity[K]>
  ) => {
    (entity as Record<string, unknown>)[component] = value;
  };

  // Add helper method to remove components
  world.removeComponent = <K extends keyof Entity>(entity: Entity, component: K) => {
    delete (entity as Record<string, unknown>)[component];
  };

  return world;
}
