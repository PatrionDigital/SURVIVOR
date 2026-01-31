# Camera & Viewport Design (Task 2.2.2)

## Overview

Implement a camera system that follows the player through an infinite arena. This replaces the screen-bounded movement from Task 2.2.1 with free movement in world space, using camera offset for rendering.

## Decisions Made

- **Arena type:** Truly infinite (no world boundaries)
- **Camera follow:** Smooth lerp with adjustable factor (0 = instant follow)
- **Camera architecture:** Standalone Camera class (not ECS entity)
- **Coordinate system:** World space positions, camera offset converts to screen space

## Camera Class

```typescript
// apps/web/src/game/Camera.ts

interface CameraOptions {
  lerpFactor?: number; // 0 = instant, 0.1 = smooth, default 0.1
}

class Camera {
  x: number = 0;
  y: number = 0;
  private lerpFactor: number;

  constructor(options?: CameraOptions);

  // Frame-rate independent smooth follow
  update(targetX: number, targetY: number, deltaMs: number): void;

  // Get viewport bounds for enemy spawning/culling
  getViewport(screenWidth: number, screenHeight: number): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };

  setLerpFactor(factor: number): void;
}
```

### Lerp Formula

Uses frame-rate independent smoothing:
```typescript
const t = 1 - Math.pow(1 - this.lerpFactor, deltaMs / 16.67);
this.x += (targetX - this.x) * t;
```

When `lerpFactor = 0`, camera snaps instantly to target.

## System Changes

### RenderSystem

Updated to accept camera position and screen dimensions:

```typescript
export function renderSystem(
  world: GameWorld,
  camera: { x: number; y: number },
  screenWidth: number,
  screenHeight: number
): void {
  const offsetX = screenWidth / 2 - camera.x;
  const offsetY = screenHeight / 2 - camera.y;

  for (const entity of world.with("position", "sprite")) {
    entity.sprite.graphics.x = entity.position.x + offsetX;
    entity.sprite.graphics.y = entity.position.y + offsetY;
  }
}
```

### MovementSystem

Simplified - removes boundary clamping since arena is infinite:

```typescript
export function movementSystem(
  world: GameWorld,
  deltaMs: number,
  input: InputState
): void {
  // Update player velocity from input
  // Apply velocity to position
  // NO boundary clamping
}
```

## GameScene Integration

```typescript
class GameScene extends Scene {
  private camera: Camera | null = null;

  protected onEnter(): void {
    // ... existing setup
    this.camera = new Camera({ lerpFactor: 0.1 });
  }

  protected onUpdate(deltaMs: number): void {
    movementSystem(this.world, deltaMs, input);

    // Update camera to follow player
    this.camera.update(
      this.playerEntity.position.x,
      this.playerEntity.position.y,
      deltaMs
    );

    invincibilitySystem(this.world, deltaMs);
    renderSystem(this.world, this.camera, this.width, this.height);
  }

  getCamera(): Camera | null {
    return this.camera;
  }
}
```

## Testing Strategy (TDD)

### Camera.test.ts
- Instant follow when lerpFactor = 0
- Smooth interpolation when lerpFactor > 0
- Frame-rate independent smoothing
- getViewport() returns correct bounds
- setLerpFactor() clamps between 0 and 1

### RenderSystem.test.ts (updates)
- Entity at camera position renders at screen center
- Entity offset from camera renders at correct screen position
- Camera offset applied to all entities

### MovementSystem.test.ts (updates)
- Remove boundary clamping tests
- Keep velocity and input handling tests

### GameScene.test.ts (updates)
- Camera created on enter
- Camera follows player
- Camera accessible via getCamera()

## File Structure

```
apps/web/src/game/
├── Camera.ts           # NEW - Camera class
├── Camera.test.ts      # NEW - Camera tests
├── ecs/
│   └── systems/
│       ├── MovementSystem.ts      # MODIFIED - remove bounds
│       └── RenderSystem.ts        # MODIFIED - add camera offset
└── scenes/
    └── GameScene.ts    # MODIFIED - integrate camera
```

## Dependencies

- Task 2.2.1 (Player Entity) - Complete
