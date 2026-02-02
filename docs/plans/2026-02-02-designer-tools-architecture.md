# Designer Tools Architecture

Task 2.8.1 design document for in-browser game design tools.

## Overview

Designer tools for creating and editing enemy types, wave configurations, and balancing game content. Local-only for development, with file export for sharing.

## Decisions Summary

| Decision | Choice                                                          |
| -------- | --------------------------------------------------------------- |
| Use case | Balance iteration + content creation + future community modding |
| Access   | Separate Vite entry point (local-only, excluded from prod)      |
| Preview  | Isolated sandbox with game engine subset                        |
| Storage  | localStorage auto-save + JSON file import/export                |

## Architecture

### Entry Point & Build Setup

Separate Vite entry point at `apps/web/designer.html` with its own React root.

```
apps/web/
├── index.html          # Game entry
├── designer.html       # Designer entry
├── src/
│   ├── main.tsx        # Game React root
│   ├── designer/       # Designer-specific code
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── EnemyDesigner.tsx
│   │   │   └── WaveDesigner.tsx
│   │   ├── components/
│   │   │   ├── PreviewCanvas.tsx
│   │   │   ├── PropertyPanel.tsx
│   │   │   ├── YukaDebugPanel.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── ConfigList.tsx
│   │   └── stores/
│   │       └── designerStore.ts
│   └── game/           # Shared game engine (existing)
```

### Vite Configuration

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    input: {
      main: 'index.html',
      // Only include designer in dev builds
      ...(mode === 'development' && {
        designer: 'designer.html'
      })
    },
  },
}
```

### Development Access

- Game: `http://localhost:5173/`
- Designer: `http://localhost:5173/designer.html`

## Preview Canvas

Isolated sandbox using subset of game engine systems.

### Included Systems

- PixiJS Application
- Yuka EntityManager
- EnemyFactory
- EnemyAISystem
- RenderSystem

### Excluded Systems

- Player entity
- Weapons/projectiles
- Pickups
- Leveling
- Collision damage

### Preview Controls

| Feature        | Description                                          |
| -------------- | ---------------------------------------------------- |
| Target marker  | Draggable point that enemies seek (simulates player) |
| Spawn controls | Add/remove enemies, adjust count                     |
| Time controls  | Play/pause, speed (0.5x, 1x, 2x, 4x)                 |
| Reset button   | Clear all entities                                   |
| Stats overlay  | Enemy count, FPS, behavior states                    |

### Wave Designer Additions

- Timeline scrubber (jump to any point in 20-minute run)
- Fast-forward simulation
- Event markers showing boss/horde triggers

## Enemy Designer

### Layout (3-panel)

```
┌─────────────────────────────────────────────────────────────┐
│  Enemy Designer                               [Save] [Load] │
├───────────┬─────────────────────────────┬───────────────────┤
│           │                             │                   │
│  Config   │      Preview Canvas         │   Yuka Debug      │
│  List     │                             │   Panel           │
│           │   ┌─────┐     ┌─────┐       │                   │
│  • basic  │   │enemy│ ──▶ │  ◎  │       │  [Alignment] 0.2  │
│  • fast   │   │enemy│     │target│      │  [Cohesion]  0.0  │
│  • tank   │   └─────┘     └─────┘       │  [Separation] 15  │
│           │                             │  [Seek]      1.0  │
│  [+ New]  │   ▶ Play  ⏸ Pause  🔄 Reset │  [maxForce]  150  │
│           │   Speed: [1x ▼]  Count: [5] │  [maxSpeed]  100  │
├───────────┴─────────────────────────────┴───────────────────┤
│                     Property Panel                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Visual      │ │ Combat      │ │ Movement    │           │
│  │ color  [■]  │ │ damage [10] │ │ speed [100] │           │
│  │ radius [15] │ │ health [100]│ │ force [150] │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Yuka Debug Panel

Real-time sliders that directly modify Yuka Vehicle behaviors in preview:

| Control         | Description             | Range    |
| --------------- | ----------------------- | -------- |
| Alignment       | Match neighbor velocity | 0 - 5    |
| Cohesion        | Group together          | 0 - 5    |
| Separation      | Push apart              | 0 - 20   |
| Seek Weight     | Chase target            | 0 - 5    |
| Max Force       | Steering strength       | 10 - 300 |
| Max Speed       | Movement cap            | 10 - 500 |
| Bounding Radius | Collision size          | 5 - 100  |
| Neighborhood    | Detection range         | 50 - 500 |

Changes apply instantly. "Apply to Config" copies values back to property panel.

## Wave Designer

### Layout (Timeline-focused)

```
┌─────────────────────────────────────────────────────────────┐
│  Wave Designer                                [Save] [Load] │
├───────────┬─────────────────────────────────────────────────┤
│           │  Timeline (20 minutes)                          │
│  Phases   │  0m      5m      10m     15m     20m            │
│           │  ├───────┼───────┼───────┼───────┤              │
│  • Early  │  │ Early │  Mid Game     │ Late Game    │       │
│  • Mid    │  ├───────┴───────┴───────┴───────┘              │
│  • Late   │  │  🔴        🔴    👹         🔴   👹           │
│           │  │  horde    horde  boss      horde boss        │
│  [+ Add]  │  └──────────────────────────────────────────────│
│           │      ▲ current time: 3:24                       │
├───────────┼─────────────────────────────────────────────────┤
│  Events   │              Preview Canvas                     │
│           │                                                 │
│  • horde-1│        (shows current wave state)               │
│  • boss-1 │                                                 │
│  • horde-2│   ◀◀  ◀  ▶  ▶▶   Speed: [4x ▼]                 │
│           │   [Jump to event ▼]                             │
│  [+ Add]  │                                                 │
└───────────┴─────────────────────────────────────────────────┘
```

### Timeline Features

| Feature       | Description                          |
| ------------- | ------------------------------------ |
| Phase bars    | Drag edges to adjust start/end times |
| Event markers | Click to edit, drag to move in time  |
| Playhead      | Shows current simulation time        |
| Scrubbing     | Click anywhere on timeline to jump   |
| Zoom          | Scroll to zoom in/out on timeline    |

### Phase Editor

- Enemy types (multi-select from available enemies)
- Spawn rate multiplier (slider)
- Max enemies (number input)
- Health/damage/speed multipliers (sliders)

### Event Editor (modal)

- Event type dropdown (boss_spawn, horde, etc.)
- Trigger time (editable, or drag on timeline)
- Event-specific fields (count, duration, enemy type)

## Storage & Data Flow

### State Management (Zustand)

```typescript
// src/designer/stores/designerStore.ts
interface DesignerStore {
  // Enemy configs
  enemies: Map<string, EnemyTypeConfig>;
  selectedEnemyId: string | null;

  // Wave configs
  waves: Map<string, WaveConfig>;
  selectedWaveId: string | null;

  // Preview state
  previewTimeScale: number;
  previewPaused: boolean;

  // Actions
  updateEnemy: (id: string, config: Partial<EnemyTypeConfig>) => void;
  updateWave: (id: string, config: Partial<WaveConfig>) => void;
}
```

### localStorage Auto-save

- Keys: `designer:enemies`, `designer:waves`
- Auto-save on every change (debounced 500ms)
- Load on app startup
- Clear button to reset to defaults

### Import/Export

| Action         | Behavior                                           |
| -------------- | -------------------------------------------------- |
| Import Enemy   | File picker → parse JSON → validate → add to store |
| Export Enemy   | Serialize config → download as `{id}.json`         |
| Import Wave    | Same flow, validates against `WaveConfig` type     |
| Export Wave    | Downloads as `{id}-wave.json`                      |
| Load from game | Fetch from `public/data/enemies/*.json`            |

### Validation

Uses existing `validateEnemyTypeConfig()` and wave config validation. Shows inline errors if JSON is malformed or missing fields.

## Implementation Order

1. **Task 2.8.1** (this doc) - Architecture design ✓
2. **Task 2.8.2** - Enemy Designer
   - Vite multi-entry setup
   - PreviewCanvas component
   - YukaDebugPanel component
   - PropertyPanel for enemy config
   - localStorage persistence
   - Import/export
3. **Task 2.8.3** - Wave Designer
   - Timeline component
   - Phase/event editors
   - Wave preview simulation
   - Import/export

## Future Extensibility

This architecture supports future tools:

- **Upgrade Path Designer** - Similar property panel approach
- **Weapon Designer** - Preview with projectile simulation
- **Map Editor** - Would add tile/terrain layer to preview canvas
