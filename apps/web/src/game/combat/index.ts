// Combat system exports
export type {
  Faction,
  Projectile,
  WeaponConfig,
  EnemyAttackConfig as EnemyAttackTypeConfig,
} from "./types";

export {
  spawnProjectile,
  projectileMovementSystem,
  projectileLifetimeSystem,
} from "./ProjectileSystem";

export {
  projectileCollisionSystem,
  type ProjectileCollisionResult,
} from "./ProjectileCollisionSystem";

export { PlayerWeaponSystem } from "./PlayerWeaponSystem";

export { enemyAttackSystem, type EnemyAttackConfig } from "./EnemyAttackSystem";
