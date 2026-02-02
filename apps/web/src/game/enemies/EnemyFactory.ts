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
 * Stat modifiers for enemy creation (from wave system)
 */
export interface EnemyStatModifiers {
  /** Health multiplier (1.0 = normal) */
  healthMultiplier?: number;
  /** Damage multiplier (1.0 = normal) */
  damageMultiplier?: number;
  /** Speed multiplier (1.0 = normal) */
  speedMultiplier?: number;
}

/**
 * Create an enemy entity with all required components
 *
 * @param world - ECS world to add entity to
 * @param yukaManager - Yuka EntityManager for AI
 * @param container - PixiJS container for sprite
 * @param config - Enemy type configuration
 * @param position - Spawn position
 * @param modifiers - Optional stat modifiers from wave system
 * @returns The created entity
 */
export function createEnemy(
  world: GameWorld,
  yukaManager: EntityManager,
  container: Container,
  config: EnemyTypeConfig,
  position: { x: number; y: number },
  modifiers?: EnemyStatModifiers
): Entity {
  // Apply stat modifiers
  const healthMult = modifiers?.healthMultiplier ?? 1;
  const speedMult = modifiers?.speedMultiplier ?? 1;
  const damageMult = modifiers?.damageMultiplier ?? 1;

  const effectiveHealth = Math.round(config.combat.health * healthMult);
  const effectiveSpeed = config.movement.maxSpeed * speedMult;
  const effectiveDamage = Math.round(config.combat.damage * damageMult);

  // Create Yuka Vehicle for AI
  const vehicle = new Vehicle();
  vehicle.position.set(position.x, position.y, 0);
  vehicle.maxSpeed = effectiveSpeed;
  vehicle.maxForce = config.movement.maxForce;
  vehicle.mass = config.movement.mass;
  // Set neighborhood radius for flocking behaviors to find nearby vehicles
  vehicle.neighborhoodRadius = 150;
  vehicle.updateNeighborhood = true;

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

  // Add seek behavior for chasing player (active by default for survivor gameplay)
  const seek = new SeekBehavior(new Vector3(0, 0, 0));
  seek.weight = config.behavior.seekWeight;
  seek.active = true; // Always chase the player
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
    health: { current: effectiveHealth, max: effectiveHealth },
    sprite: { graphics },
    enemy: {
      vehicle,
      config,
      currentBehavior: "seeking",
      effectiveDamage, // Store modified damage for collision system
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
