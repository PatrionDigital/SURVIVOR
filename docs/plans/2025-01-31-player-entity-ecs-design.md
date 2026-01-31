# Player Entity ECS Design (Task 2.2.1)

## Overview

Implement Player entity using an Entity-Component-System (ECS) architecture with miniplex library. This replaces the current direct Graphics manipulation in GameScene with a proper ECS pattern that will scale to enemies, projectiles, and pickups.

## Decisions Made

- **Arena type:** Screen-bounded (infinite arena + camera deferred to Task 2.2.2)
- **Architecture:** ECS using miniplex library (~5KB, excellent TypeScript support)
- **Component scope:** Core + i-frames (Stats and Collider deferred to post-enemy integration)
- **Pause handling:** Keep as React overlay (no change)
- **Position persistence:** Preserve existing pattern (save to Zustand on navigation)

## File Structure

```
apps/web/src/game/ecs/
├── World.ts              # miniplex World wrapper and entity type
├── components.ts         # Component interface definitions
├── systems/
│   ├── MovementSystem.ts
│   ├── RenderSystem.ts
│   └── InvincibilitySystem.ts
├── systems.test.ts       # Unit tests for systems
└── index.ts              # Public exports
```

## Components

```typescript
// Position - where the entity is
interface Position { x: number; y: number; }

// Velocity - how fast it's moving
interface Velocity { vx: number; vy: number; }

// Health - can take damage, can die
interface Health {
  current: number;
  max: number;
}

// Invincibility - temporary damage immunity (i-frames)
interface Invincibility {
  remaining: number;  // ms remaining
  duration: number;   // total duration when triggered
}

// Sprite - visual representation
interface Sprite {
  graphics: Graphics;  // PixiJS Graphics instance
}

// PlayerControlled - tag marking this entity as the player
interface PlayerControlled { }

// Entity type (miniplex style)
type Entity = {
  position?: Position;
  velocity?: Velocity;
  health?: Health;
  invincibility?: Invincibility;
  sprite?: Sprite;
  playerControlled?: PlayerControlled;
}
```

## Systems

### MovementSystem
- Queries entities with position + velocity
- For player: reads input, sets velocity based on PLAYER_SPEED
- For all: applies velocity to position using delta time
- Clamps player to screen bounds (PADDING from edges)

### RenderSystem
- Queries entities with position + sprite
- Syncs sprite.graphics.x/y with position.x/y

### InvincibilitySystem
- Queries entities with invincibility + sprite
- Decrements remaining timer by deltaMs
- Flashes sprite alpha (0.5/1.0 toggle every 100ms)
- Removes invincibility component when timer expires

## GameScene Integration

GameScene changes:
- Creates miniplex World on `onEnter()`
- Creates player entity with all components
- Runs systems in `onUpdate()`: movement → invincibility → render
- Destroys world and sprites on `onExit()`
- Exposes `damagePlayer(amount)` for collision system (future)
- Preserves `getPlayerPosition()` / `setPlayerPosition()` for navigation persistence

## Testing Strategy (TDD)

Write tests first, then implementation:

1. **Component tests** - Entity creation with components
2. **MovementSystem tests** - Velocity application, input handling, bounds clamping
3. **InvincibilitySystem tests** - Timer decrement, flash effect, component removal
4. **RenderSystem tests** - Position sync to sprite
5. **GameScene integration tests** - Entity lifecycle, damage, position persistence

## Deferred Work

- **Stats component** - Deferred to post-enemy integration (also needed for gear staking)
- **Collider component** - Deferred to post-enemy integration
- **Infinite arena + Camera** - Task 2.2.2

## Dependencies

- Task 2.1.2 (Input System) - Complete
- Task 2.1.3 (Scene Manager) - Complete
- miniplex library - To be installed
