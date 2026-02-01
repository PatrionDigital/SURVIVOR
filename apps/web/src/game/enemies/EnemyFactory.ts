import { Container, Graphics } from "pixi.js";
import {
  Vehicle,
  EntityManager,
  AlignmentBehavior,
  CohesionBehavior,
  SeparationBehavior,
  SeekBehavior,
  Vector3,
} from "yuka";
import type { GameWorld, Entity } from "../ecs/World";
import type { EnemyTypeConfig } from "./types";

/**
 * Create an enemy entity with all required components
 *
 * @param world - ECS world to add entity to
 * @param yukaManager - Yuka EntityManager for AI
 * @param container - PixiJS container for sprite
 * @param config - Enemy type configuration
 * @param position - Spawn position
 * @returns The created entity
 */
export function createEnemy(
  world: GameWorld,
  yukaManager: EntityManager,
  container: Container,
  config: EnemyTypeConfig,
  position: { x: number; y: number }
): Entity {
  // Create Yuka Vehicle for AI
  const vehicle = new Vehicle();
  vehicle.position.set(position.x, position.y, 0);
  vehicle.maxSpeed = config.movement.maxSpeed;
  vehicle.maxForce = config.movement.maxForce;
  vehicle.mass = config.movement.mass;

  // Add flocking behaviors with weights from config
  const alignment = new AlignmentBehavior();
  alignment.weight = config.flocking.alignment;
  vehicle.steering.add(alignment);

  const cohesion = new CohesionBehavior();
  cohesion.weight = config.flocking.cohesion;
  vehicle.steering.add(cohesion);

  const separation = new SeparationBehavior();
  separation.weight = config.flocking.separation;
  vehicle.steering.add(separation);

  // Add seek behavior for chasing player (starts inactive)
  const seek = new SeekBehavior(new Vector3(0, 0, 0));
  seek.weight = config.behavior.seekWeight;
  seek.active = false; // Will be activated when player is in range
  vehicle.steering.add(seek);

  // Add vehicle to Yuka manager
  yukaManager.add(vehicle);

  // Create sprite graphics
  const graphics = new Graphics();
  graphics.circle(0, 0, config.visual.radius);
  graphics.fill({ color: config.visual.color });

  container.addChild(graphics);

  // Create ECS entity with all components
  const entity = world.add({
    position: { x: position.x, y: position.y },
    velocity: { vx: 0, vy: 0 },
    health: { current: config.combat.health, max: config.combat.health },
    sprite: { graphics },
    enemy: {
      vehicle,
      config,
      currentBehavior: "flocking",
    },
  });

  return entity;
}

/**
 * Destroy an enemy entity and clean up all resources
 *
 * @param world - ECS world to remove entity from
 * @param yukaManager - Yuka EntityManager to remove vehicle from
 * @param entity - The entity to destroy
 */
export function destroyEnemy(world: GameWorld, yukaManager: EntityManager, entity: Entity): void {
  // Remove vehicle from Yuka manager
  if (entity.enemy?.vehicle) {
    yukaManager.remove(entity.enemy.vehicle);
  }

  // Destroy sprite graphics
  if (entity.sprite?.graphics) {
    entity.sprite.graphics.destroy();
  }

  // Remove entity from ECS world
  world.remove(entity);
}
