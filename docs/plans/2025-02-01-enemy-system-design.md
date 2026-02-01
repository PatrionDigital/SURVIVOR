# Enemy System Design

Date: 2025-02-01
Task: 2.3.1 - Implement Enemy Base Class

## Overview

Enemy system using Yuka game AI library for steering behaviors (flocking, seek, vision) integrated with our miniplex ECS for rendering and collision detection.

## Architecture

### Yuka Integration

Yuka handles AI movement. Our ECS handles rendering and game state.

```
┌─────────────────┐     ┌──────────────────┐
│  Yuka           │     │  Our ECS         │
│  EntityManager  │────▶│  GameWorld       │
│  - Vehicles     │     │  - Entities      │
│  - Behaviors    │     │  - Components    │
│  - Vision       │     │  - Systems       │
└─────────────────┘     └──────────────────┘
        │                        │
        │    position sync       │
        └────────────────────────┘
```

**Update flow:**
1. `enemyAISystem()` calls Yuka's `entityManager.update(delta)`
2. Yuka calculates steering forces (flocking + seek)
3. Sync `vehicle.position` → ECS entity `position`
4. `renderSystem()` draws based on ECS position

### ECS Components

```typescript
// New component for enemies
interface EnemyAI {
  vehicle: Vehicle;              // Yuka Vehicle instance
  config: EnemyTypeConfig;       // Reference to type config
  currentBehavior: 'flocking' | 'seeking';
}

// Existing components reused
interface Position { x: number; y: number; }
interface Velocity { vx: number; vy: number; }
interface Health { current: number; max: number; }
interface Sprite { graphics: Graphics; }
```

### Entity Type

```typescript
export type Entity = {
  position?: Position;
  velocity?: Velocity;
  health?: Health;
  invincibility?: Invincibility;
  sprite?: Sprite;
  playerControlled?: boolean;
  enemy?: EnemyAI;               // NEW
};
```

## Enemy Type Configuration

### JSON Schema

Enemy types defined in JSON files for easy extensibility:

```
apps/web/public/data/enemies/
  basic.json
  swarm.json
  tank.json
  zones/
    forest/
      treant.json
```

### Config Structure

```json
{
  "id": "swarm",
  "name": "Swarmer",

  "visual": {
    "color": "0xff4444",
    "radius": 12
  },

  "combat": {
    "damage": 5,
    "health": 20,
    "xpValue": 5
  },

  "movement": {
    "maxSpeed": 120,
    "maxForce": 80,
    "mass": 0.5
  },

  "flocking": {
    "alignment": 1.0,
    "cohesion": 2.0,
    "separation": 0.8
  },

  "vision": {
    "range": 200,
    "fieldOfView": 360
  },

  "behavior": {
    "seekWeight": 1.5
  }
}
```

### TypeScript Interface

```typescript
interface EnemyTypeConfig {
  id: string;
  name: string;

  visual: {
    color: number;
    radius: number;
  };

  combat: {
    damage: number;
    health: number;
    xpValue: number;
  };

  movement: {
    maxSpeed: number;
    maxForce: number;
    mass: number;
  };

  flocking: {
    alignment: number;
    cohesion: number;
    separation: number;
  };

  vision: {
    range: number;
    fieldOfView: number;
  };

  behavior: {
    seekWeight: number;
  };
}
```

### Registry

```typescript
class EnemyTypeRegistry {
  private configs: Map<string, EnemyTypeConfig> = new Map();

  async load(id: string): Promise<EnemyTypeConfig>;
  async loadZone(zoneName: string): Promise<void>;
  get(id: string): EnemyTypeConfig | undefined;
  getAll(): EnemyTypeConfig[];
}
```

## AI Behavior

### Default State: Flocking

All enemies start with flocking behaviors:
- **AlignmentBehavior**: Match velocity of nearby enemies
- **CohesionBehavior**: Move toward center of nearby enemies
- **SeparationBehavior**: Maintain spacing from all neighbors

Weights from config determine grouping tightness.

### Player Detection: Seek

When player enters vision range:
1. Yuka's Vision component detects player
2. Remove flocking behaviors
3. Add SeekBehavior targeting player position

When player leaves vision range:
1. Remove SeekBehavior
2. Restore flocking behaviors

### Behavior Switching

```typescript
function onPlayerDetected(enemy: Entity, playerPos: Vector3): void {
  const { vehicle } = enemy.enemy!;

  // Remove flocking
  vehicle.steering.remove(enemy.enemy!.flockingBehaviors);

  // Add seek
  const seek = new SeekBehavior(playerPos);
  seek.weight = enemy.enemy!.config.behavior.seekWeight;
  vehicle.steering.add(seek);

  enemy.enemy!.currentBehavior = 'seeking';
}

function onPlayerLost(enemy: Entity): void {
  const { vehicle } = enemy.enemy!;

  // Remove seek
  vehicle.steering.clear();

  // Restore flocking
  vehicle.steering.add(enemy.enemy!.flockingBehaviors);

  enemy.enemy!.currentBehavior = 'flocking';
}
```

## Collision Detection

### Player-Enemy (Circle-Circle)

Simple distance check for contact damage:

```typescript
function collisionSystem(world: GameWorld): CollisionEvent[] {
  const player = world.with("playerControlled", "position").first;
  if (!player || player.invincibility) return [];

  const events: CollisionEvent[] = [];

  for (const enemy of world.with("enemy", "position")) {
    const dx = player.position!.x - enemy.position!.x;
    const dy = player.position!.y - enemy.position!.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const minDist = PLAYER_RADIUS + enemy.enemy!.config.visual.radius;

    if (dist < minDist) {
      events.push({
        type: 'enemy-player',
        enemy,
        player,
        damage: enemy.enemy!.config.combat.damage,
      });
    }
  }

  return events;
}
```

### Enemy-Enemy (Yuka Separation)

Handled automatically by Yuka's SeparationBehavior:
- All enemies are in the same EntityManager
- Separation applies to all neighbors regardless of type
- Weight in config controls spacing strength

## Systems

### EnemyAISystem

```typescript
function enemyAISystem(
  world: GameWorld,
  yukaManager: EntityManager,
  playerPos: { x: number; y: number },
  deltaMs: number
): void {
  const deltaSec = deltaMs / 1000;

  // Update player position for seek targets
  updatePlayerTarget(yukaManager, playerPos);

  // Run Yuka AI calculations
  yukaManager.update(deltaSec);

  // Sync positions back to ECS
  for (const entity of world.with("enemy", "position")) {
    const vehicle = entity.enemy!.vehicle;
    entity.position!.x = vehicle.position.x;
    entity.position!.y = vehicle.position.y;
  }
}
```

### CollisionSystem

```typescript
function collisionSystem(world: GameWorld): void {
  const player = world.with("playerControlled", "position", "health").first;
  if (!player || player.invincibility) return;

  for (const enemy of world.with("enemy", "position")) {
    if (checkOverlap(player, enemy)) {
      // Apply damage
      player.health!.current -= enemy.enemy!.config.combat.damage;

      // Trigger invincibility
      world.addComponent(player, "invincibility", {
        remaining: 1000,
        duration: 1000,
      });

      break; // Only one hit per frame during i-frames
    }
  }
}
```

### EnemyDeathSystem

```typescript
function enemyDeathSystem(
  world: GameWorld,
  yukaManager: EntityManager,
  gameContainer: Container
): XPDrop[] {
  const drops: XPDrop[] = [];

  for (const enemy of world.with("enemy", "position", "health")) {
    if (enemy.health!.current <= 0) {
      // Create XP drop at enemy position
      drops.push({
        x: enemy.position!.x,
        y: enemy.position!.y,
        value: enemy.enemy!.config.combat.xpValue,
      });

      // Remove from Yuka
      yukaManager.remove(enemy.enemy!.vehicle);

      // Destroy sprite
      enemy.sprite?.graphics.destroy();

      // Remove from ECS
      world.remove(enemy);
    }
  }

  return drops;
}
```

## Enemy Factory

```typescript
function createEnemy(
  world: GameWorld,
  yukaManager: EntityManager,
  gameContainer: Container,
  config: EnemyTypeConfig,
  spawnPos: { x: number; y: number }
): Entity {
  // Create Yuka Vehicle
  const vehicle = new Vehicle();
  vehicle.position.set(spawnPos.x, spawnPos.y, 0);
  vehicle.maxSpeed = config.movement.maxSpeed;
  vehicle.maxForce = config.movement.maxForce;
  vehicle.mass = config.movement.mass;

  // Add flocking behaviors
  const alignment = new AlignmentBehavior();
  alignment.weight = config.flocking.alignment;

  const cohesion = new CohesionBehavior();
  cohesion.weight = config.flocking.cohesion;

  const separation = new SeparationBehavior();
  separation.weight = config.flocking.separation;

  vehicle.steering.add(alignment);
  vehicle.steering.add(cohesion);
  vehicle.steering.add(separation);

  // Add to Yuka manager
  yukaManager.add(vehicle);

  // Create sprite
  const graphics = new Graphics();
  graphics.circle(0, 0, config.visual.radius);
  graphics.fill({ color: config.visual.color });
  gameContainer.addChild(graphics);

  // Create ECS entity
  const entity = world.add({
    position: { x: spawnPos.x, y: spawnPos.y },
    velocity: { vx: 0, vy: 0 },
    health: { current: config.combat.health, max: config.combat.health },
    sprite: { graphics },
    enemy: {
      vehicle,
      config,
      currentBehavior: 'flocking',
    },
  });

  return entity;
}
```

## File Structure

```
apps/web/src/game/
  ecs/
    components.ts          # Add EnemyAI interface
    World.ts               # Add enemy to Entity type
    systems/
      EnemyAISystem.ts     # NEW - Yuka integration
      CollisionSystem.ts   # NEW - Player-enemy collision
      EnemyDeathSystem.ts  # NEW - Death and XP drops
  enemies/
    EnemyTypeRegistry.ts   # NEW - JSON config loader
    EnemyFactory.ts        # NEW - Enemy creation
    types.ts               # NEW - EnemyTypeConfig interface

apps/web/public/data/enemies/
  basic.json               # NEW - Basic enemy config
```

## Testing Strategy

### Unit Tests (Mock Yuka)

**EnemyTypeRegistry.test.ts:**
- Load JSON config correctly
- Validate required fields
- Handle missing/malformed files
- Cache loaded configs

**EnemyFactory.test.ts:**
- Create enemy with correct components
- Sprite created with config visual properties
- Health initialized from config

**CollisionSystem.test.ts:**
- Detect player-enemy overlap
- No collision when player has invincibility
- Correct damage applied
- Handle edge cases (zero radius, exact overlap)

### Integration Tests (Real Yuka)

**EnemyAISystem.integration.test.ts:**
- Position syncs from Yuka to ECS
- Enemies move when update called
- Multiple enemies maintain separation

**Behavior.integration.test.ts:**
- Flocking produces natural grouping
- Seek moves enemy toward target
- Behavior switching works correctly

## Implementation Order

1. **Add Yuka dependency** - `pnpm add yuka`
2. **EnemyTypeConfig types** - TypeScript interfaces
3. **EnemyTypeRegistry** - JSON loading with tests
4. **Update Entity type** - Add enemy component
5. **EnemyFactory** - Create enemies with tests
6. **EnemyAISystem** - Yuka integration with tests
7. **CollisionSystem** - Player damage with tests
8. **EnemyDeathSystem** - Cleanup with tests
9. **GameScene integration** - Wire everything together
10. **Create basic.json** - First enemy type

## Dependencies

- **yuka** - Game AI library for steering behaviors
- **miniplex** - ECS (existing)
- **pixi.js** - Rendering (existing)

## Notes

- Yuka uses 3D vectors but we only use x/y (z always 0)
- Player is NOT a Yuka entity - only enemies use Yuka
- XP drops are separate entities (covered in Task 2.5)
- Spawning system is Task 2.3.2 (uses this enemy system)
