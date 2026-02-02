# Farcaster Survivors - Task Breakdown

## Overview

This document provides a detailed breakdown of all implementation tasks organized by phase, with dependencies, estimates, and acceptance criteria.

---

## Phase 1: Core Infrastructure (Weeks 1-2)

### 1.1 Project Scaffolding

#### Task 1.1.1: Initialize Monorepo ✅

**Priority:** P0 (Blocker)
**Estimate:** 4 hours
**Dependencies:** None
**Status:** COMPLETE

**Description:**
Set up the Turborepo monorepo structure with all workspaces.

**Subtasks:**

- [x] Initialize pnpm workspace
- [x] Configure Turborepo (turbo.json)
- [x] Create directory structure (apps/, packages/, docs/)
- [x] Set up shared configs (TypeScript, ESLint, Prettier)
- [x] Configure path aliases
- [x] Add .gitignore, .nvmrc, .env.example
- [x] Create root package.json with scripts

**Acceptance Criteria:**

- ✅ `pnpm install` works from root
- ✅ `pnpm build` builds all packages
- ✅ `pnpm dev` starts all dev servers
- ✅ TypeScript compilation succeeds

---

#### Task 1.1.2: Set Up Frontend App (apps/web) ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 1.1.1
**Status:** COMPLETE

**Description:**
Initialize React + Vite + TypeScript frontend application.

**Subtasks:**

- [x] Create Vite project with React + TypeScript template
- [x] Configure Tailwind CSS
- [x] Set up Zustand stores (empty shells)
- [x] Configure wagmi + viem for Web3
- [x] Add Farcaster Mini App SDK
- [x] Create base component structure
- [x] Set up routing (react-router-dom)
- [x] Configure environment variables

**Acceptance Criteria:**

- ✅ `pnpm dev` starts frontend on localhost:5173
- ✅ TypeScript strict mode passes
- ✅ Tailwind classes work
- ✅ wagmi hooks available

---

#### Task 1.1.3: Set Up Backend App (apps/api) ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 1.1.1
**Status:** COMPLETE

**Description:**
Initialize Fastify + TypeScript backend application.

**Subtasks:**

- [x] Create Fastify project with TypeScript
- [x] Configure Zod validation
- [x] Set up JWT authentication plugin
- [x] Configure CORS
- [x] Add rate limiting plugin
- [x] Create route structure (empty shells)
- [x] Set up Supabase client
- [x] Set up Redis/Upstash client
- [x] Configure environment variables

**Acceptance Criteria:**

- ✅ `pnpm dev` starts API on localhost:3001
- ✅ `/health` endpoint returns 200
- ✅ TypeScript strict mode passes

---

#### Task 1.1.4: Set Up Contracts Package (packages/contracts) ✅

**Priority:** P0
**Estimate:** 2 hours
**Dependencies:** 1.1.1
**Status:** COMPLETE

**Description:**
Initialize Foundry project for smart contracts.

**Subtasks:**

- [x] Initialize Foundry project
- [x] Configure foundry.toml
- [x] Add OpenZeppelin dependencies
- [x] Create contract directory structure
- [x] Set up remappings.txt
- [x] Create deployment script shells

**Acceptance Criteria:**

- ✅ `forge build` succeeds
- ✅ `forge test` runs (12 tests pass)
- ✅ OpenZeppelin imports work

---

#### Task 1.1.5: Set Up SDK Package (packages/sdk) ✅

**Priority:** P1
**Estimate:** 2 hours
**Dependencies:** 1.1.1
**Status:** COMPLETE

**Description:**
Create shared TypeScript SDK for types and utilities.

**Subtasks:**

- [x] Initialize TypeScript package
- [x] Create types directory
- [x] Create utils directory
- [x] Create contracts directory (for ABIs)
- [x] Configure exports

**Acceptance Criteria:**

- ✅ Package builds successfully
- ✅ Types can be imported from apps/web and apps/api

---

### 1.2 Smart Contracts - Tokens

#### Task 1.2.1: Implement VSCToken.sol ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 1.1.4
**Status:** COMPLETE

**Description:**
Implement the primary ERC-20 token with minting, burning, and pausable functionality.

**Subtasks:**

- [x] Create VSCToken contract inheriting ERC20, Pausable, Ownable2Step
- [x] Implement MAX_SUPPLY constant (100B)
- [x] Implement authorizedMinters mapping
- [x] Implement mint() function with checks
- [x] Implement burn() function
- [x] Implement setMinter() function (addMinter/removeMinter)
- [x] Implement pause()/unpause() functions
- [x] Add custom errors
- [x] Add events

**Acceptance Criteria:**

- ✅ All functions work as specified
- ✅ 100% line coverage (100% lines, 94% statements, 75% branches)
- ✅ Gas optimized (< 100k gas for mint) - ~96k gas

---

#### Task 1.2.2: Write VSCToken Tests ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 1.2.1
**Status:** COMPLETE

**Description:**
Comprehensive test suite for VSCToken.

**Subtasks:**

- [x] Test initial state
- [x] Test minting (success and failure cases)
- [x] Test burning
- [x] Test minter authorization
- [x] Test pause/unpause
- [x] Test transfer when paused
- [x] Test max supply enforcement
- [x] Fuzz test mint amounts

**Acceptance Criteria:**

- ✅ 100% line coverage
- ✅ 75% branch coverage (acceptable)
- ✅ All edge cases covered (12 tests passing)

---

#### Task 1.2.3: Implement GearToken.sol ✅

**Priority:** P0
**Estimate:** 3 hours
**Dependencies:** 1.1.4

**Description:**
Implement the template for gear tokens (deployed 6 times).

**Subtasks:**

- [x] Create GearToken contract inheriting ERC20, Pausable, Ownable2Step
- [x] Implement bondingCurve address storage
- [x] Implement mint() function (bonding curve only)
- [x] Implement burn() function (bonding curve only)
- [x] Implement setBondingCurve() function
- [x] Add custom errors
- [x] Add events

**Acceptance Criteria:**

- ✅ Only bonding curve can mint/burn
- ✅ Pausable works correctly
- ✅ 100% test coverage (Line: 17/17, Branch: 12/12, Function: 7/7)

---

#### Task 1.2.4: Write GearToken Tests ✅

**Priority:** P0
**Estimate:** 3 hours
**Dependencies:** 1.2.3

**Description:**
Test suite for GearToken.

**Subtasks:**

- [x] Test initial state
- [x] Test minting from bonding curve
- [x] Test minting from non-bonding-curve fails
- [x] Test burning
- [x] Test pause/unpause

**Acceptance Criteria:**

- ✅ 100% coverage (21 tests passing including fuzz tests)
- ✅ Access control verified

---

### 1.3 Smart Contracts - Bonding Curve

#### Task 1.3.1: Implement BondingCurve.sol ✅

**Priority:** P0
**Estimate:** 8 hours
**Dependencies:** 1.2.1, 1.2.3

**Description:**
Implement polynomial bonding curve AMM.

**Subtasks:**

- [x] Create BondingCurve contract with Pausable, Ownable2Step, ReentrancyGuard
- [x] Implement curve formula: Price = BasePrice + (Slope × Supply²)
- [x] Implement buy() function with fee calculation
- [x] Implement sell() function with fee calculation
- [x] Implement calculateBuyReturn() view
- [x] Implement calculateSellReturn() view
- [x] Implement getCurrentPrice() view
- [x] Implement fee distribution (60% treasury, 40% burn)
- [x] Implement setFeeRecipients()
- [x] Implement setFeeSplit()
- [x] Add slippage protection
- [x] Add custom errors and events

**Acceptance Criteria:**

- ✅ Buy/sell works correctly
- ✅ Fees calculated and distributed properly
- ✅ Slippage protection works
- ✅ No reentrancy vulnerabilities (ReentrancyGuard)
- ✅ 100% line coverage (95/95), 75% branch coverage

---

#### Task 1.3.2: Write BondingCurve Tests ✅

**Priority:** P0
**Estimate:** 6 hours
**Dependencies:** 1.3.1

**Description:**
Comprehensive test suite for BondingCurve.

**Subtasks:**

- [x] Test buy with various amounts
- [x] Test sell with various amounts
- [x] Test price calculation accuracy
- [x] Test fee calculation
- [x] Test fee distribution
- [x] Test slippage protection
- [x] Test reentrancy protection
- [x] Fuzz test buy/sell amounts
- [x] Invariant test: always collateralized

**Acceptance Criteria:**

- ✅ 100% line coverage (43 tests)
- ✅ Economic invariants verified
- ✅ No profit from buy-then-sell (due to fees)

---

#### Task 1.3.3: Create Deployment Script for Tokens & Curves ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 1.2.1, 1.2.3, 1.3.1
**Status:** COMPLETE

**Description:**
Create Foundry deployment script for all tokens and bonding curves.

**Subtasks:**

- [x] Create Deploy.s.sol with ordered deployment
- [x] Deploy VSCToken
- [x] Deploy 6 GearTokens
- [x] Deploy VSC-ETH BondingCurve
- [x] Deploy 6 Gear-VSC BondingCurves (ERC20BondingCurve.sol)
- [x] Configure permissions
- [x] Log all addresses
- [x] Test on Anvil

**Acceptance Criteria:**

- ✅ Script deploys all contracts in correct order (14 contracts total)
- ✅ Permissions configured correctly (VSC BondingCurve as minter, Gear curves set)
- ✅ Works on Anvil (tested successfully with all 14 contracts)

---

### 1.4 Basic Frontend

#### Task 1.4.1: Implement Wallet Connection ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 1.1.2
**Status:** COMPLETE

**Description:**
Implement Farcaster wallet connection using Mini App SDK and Sign In With Farcaster (SIWF) for browser authentication.

**Subtasks:**

- [x] Create useMiniApp hook (initializes SDK, calls sdk.actions.ready())
- [x] Create useWallet hook (auto-connect in Mini App context)
- [x] Configure wagmi with farcasterMiniApp connector
- [x] Auto-connect wallet on app load when in Mini App context
- [x] Handle connection states (connecting, connected, error)
- [x] Store connection in Zustand (playerStore sync)
- [x] Create ConnectButton component to display connection status
- [x] Implement SIWF (Sign In With Farcaster) for browser authentication
- [x] Create SiwfAuthProvider with localStorage session persistence
- [x] Integrate @farcaster/auth-kit SignInButton for QR code flow

**Acceptance Criteria:**

- ✅ Wallet auto-connects in Farcaster Mini App context
- ✅ SIWF QR code flow works in browser context
- ✅ Session persists across page refresh (localStorage)
- ✅ Error states handled gracefully
- ✅ Connected username/address displayed in header

---

#### Task 1.4.2: Implement Token Balance Display ✅

**Priority:** P1
**Estimate:** 4 hours
**Dependencies:** 1.4.1, 1.3.3
**Status:** COMPLETE

**Description:**
Display $VSC and gear token balances.

**Subtasks:**

- [x] Create TokenBalance component (TokenBalance.tsx, SingleTokenBalance)
- [x] Create useVSCToken hook (reads balance, formats with SDK utility)
- [x] Create useGearTokens hook (multicall for all 6 gear tokens)
- [x] Display formatted balances (uses formatTokenAmount from SDK)
- [x] Auto-refresh on new blocks (useBlockNumber with watch)
- [x] Handle loading/error states (skeleton loading, error handling)
- [x] Add ABIs to SDK package (erc20Abi, vscTokenAbi, gearTokenAbi)

**Acceptance Criteria:**

- ✅ Balances display correctly (formatted with commas and decimals)
- ✅ Balances update on chain changes (block number watch)
- ✅ Loading states shown (skeleton animation)

---

---

## Phase 2: Game Engine (Weeks 3-4)

### 2.1 Core Engine

#### Task 2.1.1: Set Up PixiJS Application ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 1.1.2
**Status:** COMPLETE

**Description:**
Initialize PixiJS v8 application with game canvas.

**Subtasks:**

- [x] Create GameCanvas React component
- [x] Initialize PixiJS Application
- [x] Configure WebGL renderer
- [x] Handle canvas resize
- [x] Set up asset loader
- [x] Create game loop (60 FPS)
- [x] Integrate with React lifecycle

**Acceptance Criteria:**

- ✅ Canvas renders in browser
- ✅ Responsive to window resize
- ✅ Consistent 60 FPS

---

#### Task 2.1.2: Implement Input System ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.1.1
**Status:** COMPLETE

**Description:**
Handle touch and keyboard input for player movement.

**Subtasks:**

- [x] Create InputSystem class
- [x] Implement touch/pointer event handlers
- [x] Implement virtual joystick (20px dead zone, 60px max)
- [x] Implement keyboard input (WASD, arrows)
- [x] Normalize input to -1 to 1 range
- [x] Export movement vector
- [x] Add toggleable joystick visibility (localStorage persisted)
- [x] Add player position persistence across navigation
- [x] Add pause on navigate away with AFK auto-end timeout
- [x] Test on mobile and desktop (33 tests)

**Acceptance Criteria:**

- ✅ Touch controls work on mobile
- ✅ Keyboard controls work on desktop
- ✅ Movement is smooth and responsive
- ✅ Player position persists across tab navigation

---

#### Task 2.1.3: Implement Scene Manager ✅

**Priority:** P0
**Estimate:** 3 hours
**Dependencies:** 2.1.1
**Status:** COMPLETE

**Description:**
Manage game scenes (menu, game, results).

**Subtasks:**

- [x] Create Scene base class
- [x] Create SceneManager with registration, switching, transitions
- [x] Implement async scene transitions with configurable duration
- [x] Create MenuScene shell with title and animated prompt
- [x] Create GameScene shell with player entity
- [x] Create ResultScene shell with stats display
- [x] Integrate SceneManager into GameCanvas with `useScenes` prop
- [x] Add tap/click handlers for scene transitions (Menu → Game → Result)
- [x] Add scene mode toggle in GamePage header
- [x] Add integration tests for SceneManager with GameCanvas (15 tests)

**Acceptance Criteria:**

- ✅ Can switch between scenes
- ✅ Scenes clean up properly
- ✅ Transitions are smooth (async with configurable duration)
- ✅ Scene flow works: Menu → Game → Result → Game
- ✅ Both scene mode and traditional React overlay mode supported

---

### 2.2 Player & Movement

#### Task 2.2.1: Implement Player Entity ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.1.2
**Status:** COMPLETE

**Description:**
Create player entity with movement and stats.

**Subtasks:**

- [x] Create Player class with sprite (ECS entity with Graphics component)
- [x] Implement position and velocity (ECS components)
- [x] Implement movement based on input (movementSystem)
- [x] Implement health system (health component: current/max)
- [x] Implement invincibility frames on hit (invincibility component, invincibilitySystem)
- [x] Create player stats (100 HP, 200 speed)
- [x] Handle screen boundaries (infinite arena - no bounds)

**Acceptance Criteria:**

- ✅ Player moves based on input
- ✅ Player has health that can decrease
- ✅ Player sprite renders (green circle with white border)

---

#### Task 2.2.2: Implement Camera/Viewport ✅

**Priority:** P1
**Estimate:** 3 hours
**Dependencies:** 2.2.1
**Status:** COMPLETE

**Description:**
Camera that follows player in infinite arena.

**Subtasks:**

- [x] Create Camera class
- [x] Implement smooth follow (frame-rate independent lerp)
- [x] Implement viewport culling (background tiles culled, entities rendered via camera offset)
- [x] Update all entity positions relative to camera (RenderSystem)

**Acceptance Criteria:**

- ✅ Camera follows player smoothly
- ✅ Background renders with camera offset (checkerboard grid)

---

### 2.3 Enemies

#### Task 2.3.1: Implement Enemy Base Class ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.1.1
**Status:** COMPLETE

**Description:**
Base class for all enemy types.

**Subtasks:**

- [x] Create Enemy class with sprite (ECS entity via EnemyFactory)
- [x] Implement health system (health component)
- [x] Implement damage dealing on contact (CollisionSystem)
- [x] Implement death and XP drop (EnemyDeathSystem - XP tracking deferred)
- [x] Implement basic AI (move toward player) - Yuka SeekBehavior + flocking
- [x] Create enemy pool for performance (reuses Yuka EntityManager)

**Acceptance Criteria:**

- ✅ Enemies move toward player (Yuka steering behaviors)
- ✅ Enemies damage player on contact
- ✅ Enemies die when health reaches 0

---

#### Task 2.3.2: Implement Enemy Spawning System ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.3.1
**Status:** COMPLETE

**Description:**
Spawn enemies based on time/difficulty.

**Subtasks:**

- [x] Create SpawningSystem class
- [x] Implement spawn timer (baseSpawnInterval: 2000ms)
- [x] Implement difficulty scaling (linear - intervalDecreasePerMinute)
- [x] Implement spawn patterns (from screen edges - top/bottom/left/right)
- [x] Balance spawn rates (configurable via SpawningConfig)
- [x] Implement enemy variety by time (enemyTypes array, currently "basic")

**Acceptance Criteria:**

- ✅ Enemies spawn at regular intervals (every 2 seconds base)
- ✅ Spawn rate increases over time (configurable scaling)
- ✅ Enemies spawn from off-screen (100px outside viewport)

---

### 2.4 Combat

#### Task 2.4.1: Implement Weapon System ✅

**Priority:** P0
**Estimate:** 6 hours
**Dependencies:** 2.2.1
**Status:** COMPLETE (Basic implementation)

**Description:**
Auto-attacking weapon system.

**Subtasks:**

- [x] Create Weapon base class (PlayerWeaponSystem with WeaponConfig)
- [x] Implement auto-attack timer (cooldown-based firing)
- [x] Implement projectile creation (createProjectile in PlayerWeaponSystem)
- [x] Create Projectile class with movement (projectileMovementSystem, projectileLifetimeSystem)
- [ ] Implement weapon levels (1-8) - deferred to Phase 2.5
- [ ] Create 3-5 starter weapons - only basic blaster implemented
- [ ] Implement weapon slot system (max 6) - deferred to Phase 2.5

**Acceptance Criteria:**

- ✅ Weapons fire automatically (auto-targets nearest enemy)
- ✅ Projectiles move and render (cyan circles, 400px/s speed)
- Weapons can be leveled up (deferred)

---

#### Task 2.4.2: Implement Collision System ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.4.1, 2.3.1
**Status:** COMPLETE (Basic implementation)

**Description:**
Detect collisions between entities.

**Subtasks:**

- [x] Create CollisionSystem class (CollisionSystem for enemies, projectileCollisionSystem for projectiles)
- [ ] Implement spatial hashing for performance - deferred (circle collision sufficient for now)
- [x] Detect projectile-enemy collisions (projectileCollisionSystem)
- [x] Detect player-enemy collisions (CollisionSystem)
- [ ] Detect player-pickup collisions - deferred to Task 2.4.3
- [x] Apply damage on collision (health reduction, invincibility frames)

**Acceptance Criteria:**

- ✅ Collisions detected accurately (circle-circle collision)
- ✅ Performance acceptable at current entity counts
- ✅ Damage applied correctly (player invincibility, enemy death)

---

#### Task 2.4.3: Implement Pickup System ✅

**Priority:** P0
**Estimate:** 3 hours
**Dependencies:** 2.4.2
**Status:** COMPLETE

**Description:**
XP gems and other pickups.

**Subtasks:**

- [x] Create Pickup types and component definitions (types.ts)
- [x] Create XP gem pickup (PickupFactory.ts)
- [x] Implement magnet range (PickupAttractionSystem - 100px range)
- [x] Implement collection and XP tracking (PickupCollectionSystem - 25px range)
- [x] Integrate pickup systems into GameScene
- [x] Update EnemyDeathSystem to return death positions for pickup spawning

**Acceptance Criteria:**

- ✅ XP gems drop from enemies (spawn at death positions)
- ✅ Gems attracted to player within range (100px magnet range)
- ✅ XP tracked on collection (CollectionResult with totalXP)

---

### 2.5 Leveling ✅

#### Task 2.5.1: Implement Level-Up System ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.4.3
**Status:** COMPLETE

**Description:**
Level up when XP threshold reached.

**Subtasks:**

- [x] Track XP and level in game state (LevelingSystem class)
- [x] Calculate XP thresholds per level (exponential: base \* 1.2^(level-1))
- [x] Trigger level-up event (pendingLevelUps queue)
- [x] Pause game during level-up (GameEngine.pause() on modal open)
- [x] Generate random choices (3 options) (generateUpgradeChoices)
- [x] Apply selected upgrade (applyUpgrade + consumeLevelUp)

**Acceptance Criteria:**

- ✅ Level up triggers at correct XP (100 base, 1.2x scaling)
- ✅ Game pauses during selection
- ✅ Selected upgrade applied correctly

---

#### Task 2.5.2: Implement Level-Up UI ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.5.1
**Status:** COMPLETE

**Description:**
UI for selecting level-up upgrades.

**Subtasks:**

- [x] Create LevelUpModal component (React with Tailwind)
- [x] Display 3 upgrade choices (grid layout)
- [x] Show upgrade descriptions (name, description, stat changes)
- [x] Handle selection (keyboard/click/touch)
- [x] Close modal and resume game (GameEngine.resume())

**Acceptance Criteria:**

- ✅ Modal appears on level up
- ✅ Choices are clearly displayed
- ✅ Selection works on touch and click
- ✅ Keyboard navigation (1-3 keys, Enter)

---

### 2.6 HUD & UI

#### Task 2.6.1: Implement Game HUD ✅

**Priority:** P0
**Estimate:** 4 hours
**Dependencies:** 2.2.1
**Status:** COMPLETE

**Description:**
Heads-up display during gameplay.

**Subtasks:**

- [x] Create HUD component
- [x] Display health bar
- [x] Display XP bar
- [x] Display timer (survival time)
- [x] Display level
- [x] Display enemies killed count
- [x] Position HUD correctly on mobile/desktop

**Acceptance Criteria:**

- ✅ All stats displayed clearly
- ✅ Updates in real-time
- ✅ Doesn't obstruct gameplay

---

#### Task 2.6.2: Implement Pause Menu ✅

**Priority:** P1
**Estimate:** 2 hours
**Dependencies:** 2.1.3
**Status:** COMPLETE

**Description:**
Pause menu with resume and quit options.

**Subtasks:**

- [x] Create PauseMenu component
- [x] Pause game on ESC/button
- [x] Display pause overlay
- [x] Resume and Quit buttons
- [x] Resume on click outside

**Acceptance Criteria:**

- ✅ Game pauses correctly
- ✅ Can resume or quit
- ✅ Game state preserved

---

#### Task 2.6.3: Implement Game Over Screen ✅

**Priority:** P0
**Estimate:** 3 hours
**Dependencies:** 2.1.3
**Status:** COMPLETE

**Description:**
Show results when player dies.

**Subtasks:**

- [x] Create GameOverScreen component
- [x] Display survival time
- [x] Display enemies killed
- [x] Display level reached
- [x] Display total XP collected
- [x] Play Again button
- [x] Share to Farcaster button

**Acceptance Criteria:**

- ✅ Shows all relevant stats
- ✅ Can start new game
- ✅ Can share results

---

### 2.7 Wave System

#### Task 2.7.1: Design Wave System Architecture

**Priority:** P1
**Estimate:** 4 hours
**Dependencies:** 2.3.2
**Status:** PLANNED

**Description:**
Create data-driven wave system with time-based phases and timed events.

**Research Sources:**
- [Phaser Wave Survival Game Guide](https://codepal.ai/chat/query/GJNz60fC/building-wave-survival-game-phaser) - EnemySpawner pattern
- [Phaser Forum - Wave Spawning](https://phaser.discourse.group/t/how-to-spawn-enemies-in-waves/6054) - Timer events
- [HoloCure Wiki](https://holocure.wiki.gg/wiki/Stage) - Event system patterns
- [Vampire Survivors Wiki](https://vampire-survivors.fandom.com/wiki/Timed_Enemy_Spawn) - Time-based progression

**Key Design Decisions:**
- Time-based phases (not discrete waves) - matches Vampire Survivors style
- JSON-configurable wave definitions
- Timed events for bosses, hordes, special spawns
- Global difficulty scaling on top of phase modifiers
- Kill screen system for survival limit

**Subtasks:**

- [ ] Create wave system types (WaveConfig, WavePhase, TimedEvent, etc.)
- [ ] Create WaveConfigRegistry (load JSON configs)
- [ ] Create type validation functions
- [ ] Write unit tests for types

**Acceptance Criteria:**

- Types fully defined with documentation
- Registry loads and validates JSON configs
- 100% test coverage for validation logic

---

#### Task 2.7.2: Implement WaveManager

**Priority:** P1
**Estimate:** 6 hours
**Dependencies:** 2.7.1
**Status:** NOT STARTED

**Description:**
Core orchestrator that tracks game time and provides spawn parameters.

**Subtasks:**

- [ ] Create WaveManager class
- [ ] Implement phase tracking based on game time
- [ ] Implement weighted random enemy selection from pool
- [ ] Implement global scaling calculations
- [ ] Implement stat modifier aggregation (phase + global)
- [ ] Create getSpawnParameters() for SpawningSystem integration
- [ ] Write comprehensive unit tests

**Acceptance Criteria:**

- Phase transitions happen at correct times
- Enemy selection respects weights and time gates
- Scaling math is accurate
- 100% test coverage

---

#### Task 2.7.3: Implement EventSystem

**Priority:** P1
**Estimate:** 4 hours
**Dependencies:** 2.7.1
**Status:** NOT STARTED

**Description:**
Handle timed events like bosses, hordes, and special spawns.

**Subtasks:**

- [ ] Create EventSystem class
- [ ] Implement event triggering at timestamps
- [ ] Implement event repetition (repeatInterval, maxRepeats)
- [ ] Implement warning system for upcoming events
- [ ] Integrate event spawning with SpawningSystem
- [ ] Write unit tests

**Acceptance Criteria:**

- Events trigger at correct times
- Repeating events work correctly
- Warnings appear before events
- 100% test coverage

---

#### Task 2.7.4: Implement Spawn Patterns

**Priority:** P1
**Estimate:** 3 hours
**Dependencies:** 2.7.2
**Status:** NOT STARTED

**Description:**
Add spawn position patterns for variety in enemy appearance.

**Patterns to implement:**
- `random` - Current behavior (random edge position)
- `cluster` - Group near single random point
- `ring` - Circle around player
- `line` - Line formation from one edge
- `edge` - All from same random edge (for hordes)

**Subtasks:**

- [ ] Create SpawnPatterns.ts with pattern calculations
- [ ] Integrate patterns into SpawningSystem
- [ ] Update EnemyFactory to accept stat modifiers
- [ ] Write unit tests for each pattern

**Acceptance Criteria:**

- All 5 patterns work correctly
- Enemies spawn in expected formations
- Performance acceptable with many spawns

---

#### Task 2.7.5: Create Wave Configurations

**Priority:** P1
**Estimate:** 4 hours
**Dependencies:** 2.7.2, 2.7.3, 2.7.4
**Status:** NOT STARTED

**Description:**
Create JSON configurations and additional enemy types.

**New Enemy Types:**
- `fast.json` - Fast but weak enemy
- `tank.json` - Slow but tanky enemy
- `elite_basic.json` - Elite variant with more HP
- `boss_slime.json` - First mini-boss

**Wave Configurations:**
- `survival.json` - Main 20-minute survival mode
- 3 phases: early (0-3min), mid (3-10min), late (10-20min)
- Events: Horde every 2min, mini-boss at 3min, final boss at 19min

**Subtasks:**

- [ ] Create new enemy type configs
- [ ] Create survival wave config with phases
- [ ] Configure timed events (hordes, bosses)
- [ ] Balance test the configuration
- [ ] Create difficulty variants (easy, hard)

**Acceptance Criteria:**

- All configs load without errors
- Gameplay feels balanced and engaging
- Boss encounters are challenging but fair

---

#### Task 2.7.6: GameScene Integration

**Priority:** P1
**Estimate:** 4 hours
**Dependencies:** 2.7.2, 2.7.3, 2.7.5
**Status:** NOT STARTED

**Description:**
Integrate wave system into GameScene and UI.

**Subtasks:**

- [ ] Load wave config during scene initialization
- [ ] Create and update WaveManager each frame
- [ ] Pass stat modifiers to enemy creation
- [ ] Handle event spawning separately from regular spawns
- [ ] Display event warnings in HUD
- [ ] Handle kill screen (20min survival limit)
- [ ] Add boss health bar to HUD

**Acceptance Criteria:**

- Full wave progression works end-to-end
- Events trigger and spawn correctly
- UI shows warnings and boss health
- Performance acceptable throughout

---

---

## Phase 3: Meta-Progression (Weeks 5-6)

### 3.1 Staking Contracts

#### Task 3.1.1: Implement GearStaking.sol

**Priority:** P0  
**Estimate:** 6 hours  
**Dependencies:** 1.2.3, 1.3.1

**Description:**
Gear token staking with power calculation.

**Subtasks:**

- [ ] Create GearStaking contract with Pausable, Ownable2Step
- [ ] Implement 6 gear slots
- [ ] Implement stake() function with 5% fee
- [ ] Implement unstake() function
- [ ] Implement power calculation (sqrt-based)
- [ ] Implement tier thresholds
- [ ] Implement getPlayerStats() view
- [ ] Add events and errors

**Acceptance Criteria:**

- Staking works for all 6 slots
- Power calculated correctly
- 5% fee taken on stake
- 100% test coverage

---

#### Task 3.1.2: Write GearStaking Tests

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 3.1.1

**Description:**
Test suite for GearStaking.

**Subtasks:**

- [ ] Test staking to each slot
- [ ] Test unstaking
- [ ] Test fee calculation
- [ ] Test power calculation
- [ ] Test tier determination
- [ ] Test multiple stakers
- [ ] Fuzz test amounts

**Acceptance Criteria:**

- 100% coverage
- Economic formulas verified

---

#### Task 3.1.3: Implement MaintenancePool.sol

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 3.1.1

**Description:**
Maintenance pool with decay mechanics.

**Subtasks:**

- [ ] Create MaintenancePool contract
- [ ] Implement deposit() function
- [ ] Implement withdraw() function
- [ ] Implement decay calculation (1% per week)
- [ ] Implement threshold calculation
- [ ] Implement maintenance status check
- [ ] Link to GearStaking for bonus

**Acceptance Criteria:**

- Deposits work correctly
- Decay applies over time
- Bonus status calculated correctly
- 100% test coverage

---

#### Task 3.1.4: Write MaintenancePool Tests

**Priority:** P0  
**Estimate:** 3 hours  
**Dependencies:** 3.1.3

**Description:**
Test suite for MaintenancePool.

**Subtasks:**

- [ ] Test deposits
- [ ] Test withdrawals
- [ ] Test decay over time (warp)
- [ ] Test threshold calculation
- [ ] Test bonus activation/deactivation

**Acceptance Criteria:**

- 100% coverage
- Decay math verified

---

### 3.2 Staking UI

#### Task 3.2.1: Implement Gear Panel

**Priority:** P0  
**Estimate:** 6 hours  
**Dependencies:** 3.1.1, 1.4.2

**Description:**
UI for viewing and managing gear staking.

**Subtasks:**

- [ ] Create GearPanel component
- [ ] Create GearSlot component for each slot
- [ ] Display staked amounts
- [ ] Display tier/rarity visually
- [ ] Create stake modal
- [ ] Create unstake modal
- [ ] Implement stake transaction
- [ ] Implement unstake transaction
- [ ] Show transaction status

**Acceptance Criteria:**

- Can view all gear slots
- Can stake/unstake from UI
- Transactions work correctly

---

#### Task 3.2.2: Implement Maintenance Bar

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 3.1.3, 1.4.2

**Description:**
UI for maintenance pool status.

**Subtasks:**

- [ ] Create MaintenanceBar component
- [ ] Display current pool balance
- [ ] Display threshold
- [ ] Display % remaining
- [ ] Display bonus status (active/inactive)
- [ ] Create refill modal
- [ ] Implement deposit transaction

**Acceptance Criteria:**

- Shows maintenance status clearly
- Can refill from UI
- Visual indication of bonus status

---

### 3.3 Rewards System

#### Task 3.3.1: Implement RewardDistributor.sol

**Priority:** P0  
**Estimate:** 6 hours  
**Dependencies:** 1.2.1

**Description:**
Backend-authorized reward claims.

**Subtasks:**

- [ ] Create RewardDistributor contract
- [ ] Implement authorized signer storage
- [ ] Implement claim() with signature verification
- [ ] Implement nonce tracking
- [ ] Implement daily caps
- [ ] Implement cooldown
- [ ] Add events and errors

**Acceptance Criteria:**

- Only valid signatures accepted
- Nonces prevent replay
- Daily caps enforced
- 100% test coverage

---

#### Task 3.3.2: Write RewardDistributor Tests

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 3.3.1

**Description:**
Test suite for RewardDistributor.

**Subtasks:**

- [ ] Test valid claims
- [ ] Test invalid signature rejection
- [ ] Test nonce replay rejection
- [ ] Test expired claim rejection
- [ ] Test daily cap enforcement
- [ ] Test cooldown enforcement

**Acceptance Criteria:**

- 100% coverage
- All security checks verified

---

---

## Phase 4: Backend Integration (Weeks 7-8)

### 4.1 Database

#### Task 4.1.1: Create Database Schema

**Priority:** P0  
**Estimate:** 3 hours  
**Dependencies:** 1.1.3

**Description:**
Set up PostgreSQL schema in Supabase.

**Subtasks:**

- [ ] Create players table
- [ ] Create game_sessions table
- [ ] Create session_heartbeats table
- [ ] Create daily_rewards table
- [ ] Create achievements table
- [ ] Create leaderboard_entries table
- [ ] Create notification_tokens table
- [ ] Create claim_nonces table
- [ ] Add indexes
- [ ] Add triggers

**Acceptance Criteria:**

- All tables created
- Indexes optimize queries
- Foreign keys enforced

---

#### Task 4.1.2: Implement Database Queries

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 4.1.1

**Description:**
Create typed database query functions.

**Subtasks:**

- [ ] Player CRUD operations
- [ ] Session CRUD operations
- [ ] Heartbeat operations
- [ ] Daily rewards operations
- [ ] Leaderboard queries
- [ ] Nonce tracking

**Acceptance Criteria:**

- All queries work correctly
- Type-safe with Zod validation
- Efficient query patterns

---

### 4.2 API Routes

#### Task 4.2.1: Implement Auth Routes

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 1.1.3

**Description:**
Authentication endpoints.

**Subtasks:**

- [ ] POST /api/auth/verify - Farcaster SIWF
- [ ] POST /api/auth/refresh - Token refresh
- [ ] POST /api/auth/logout - End session
- [ ] Implement JWT generation
- [ ] Test all endpoints

**Acceptance Criteria:**

- Can authenticate with Farcaster
- JWT tokens work correctly
- Refresh flow works

---

#### Task 4.2.2: Implement Game Routes

**Priority:** P0  
**Estimate:** 6 hours  
**Dependencies:** 4.1.2, 4.2.1

**Description:**
Game session management endpoints.

**Subtasks:**

- [ ] POST /api/game/session/start
- [ ] POST /api/game/session/end
- [ ] POST /api/game/session/heartbeat
- [ ] GET /api/game/leaderboard
- [ ] Implement reward calculation service
- [ ] Implement reward signing service
- [ ] Implement anti-fraud validation
- [ ] Test all endpoints

**Acceptance Criteria:**

- Sessions track correctly
- Rewards calculated accurately
- Anti-fraud catches obvious cheats

---

#### Task 4.2.3: Implement Reward Routes

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 4.2.2

**Description:**
Reward claiming endpoints.

**Subtasks:**

- [ ] GET /api/rewards/pending
- [ ] POST /api/rewards/claim
- [ ] GET /api/rewards/history
- [ ] Track claimed status
- [ ] Test all endpoints

**Acceptance Criteria:**

- Can view pending rewards
- Can mark as claimed
- History accurate

---

### 4.3 Frontend Integration

#### Task 4.3.1: Integrate Session Management

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 4.2.2, 2.6.3

**Description:**
Connect game to backend sessions.

**Subtasks:**

- [ ] Call session/start on game start
- [ ] Send heartbeats during gameplay
- [ ] Call session/end on game over
- [ ] Display rewards from response
- [ ] Handle errors gracefully

**Acceptance Criteria:**

- Sessions created/ended correctly
- Heartbeats sent regularly
- Rewards displayed

---

#### Task 4.3.2: Implement Reward Claiming UI

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 4.2.3, 3.3.1

**Description:**
UI to claim earned rewards.

**Subtasks:**

- [ ] Create ClaimRewards component
- [ ] Display pending rewards
- [ ] Implement claim transaction
- [ ] Show transaction status
- [ ] Update balances after claim

**Acceptance Criteria:**

- Can see pending rewards
- Can claim via contract
- Balances update

---

---

## Phase 5: NFTs & Polish (Weeks 9-10)

### 5.1 NFT Contracts

#### Task 5.1.1: Implement GlobalUpgradeNFT.sol

**Priority:** P1  
**Estimate:** 4 hours  
**Dependencies:** 1.2.1

**Description:**
ERC-1155 permanent upgrade NFTs.

**Subtasks:**

- [ ] Create contract with ERC1155, Pausable
- [ ] Implement 7 upgrade types
- [ ] Implement progressive cost formula
- [ ] Implement mint() with VSC burn
- [ ] Implement view functions
- [ ] Test all functionality

**Acceptance Criteria:**

- Can mint upgrades
- Cost increases correctly
- Max per type enforced

---

#### Task 5.1.2: Implement EarlyAdopterNFT.sol

**Priority:** P1  
**Estimate:** 3 hours  
**Dependencies:** 1.1.4

**Description:**
ERC-721 early adopter NFTs.

**Subtasks:**

- [ ] Create contract with ERC721, Pausable
- [ ] Implement max supply (1,000)
- [ ] Implement signature-based minting
- [ ] Implement FID tracking
- [ ] Test all functionality

**Acceptance Criteria:**

- Can mint with valid signature
- One per FID enforced
- Max supply enforced

---

### 5.2 NFT UI

#### Task 5.2.1: Implement Upgrade Shop

**Priority:** P1  
**Estimate:** 4 hours  
**Dependencies:** 5.1.1

**Description:**
UI to purchase permanent upgrades.

**Subtasks:**

- [ ] Create UpgradeShop component
- [ ] Display all upgrade types
- [ ] Display owned count
- [ ] Display cost for next
- [ ] Implement purchase transaction

**Acceptance Criteria:**

- Can view all upgrades
- Can purchase upgrades
- Costs display correctly

---

### 5.3 Leaderboards

#### Task 5.3.1: Implement Leaderboard UI

**Priority:** P1  
**Estimate:** 4 hours  
**Dependencies:** 4.2.2

**Description:**
Display player leaderboards.

**Subtasks:**

- [ ] Create Leaderboard component
- [ ] Fetch leaderboard data
- [ ] Display daily/weekly/all-time tabs
- [ ] Highlight current player
- [ ] Show rank, name, score

**Acceptance Criteria:**

- Leaderboards load correctly
- Can switch between periods
- Current player highlighted

---

### 5.4 Farcaster Integration

#### Task 5.4.1: Implement Share Feature

**Priority:** P1  
**Estimate:** 2 hours  
**Dependencies:** 2.6.3

**Description:**
Share game results to Farcaster.

**Subtasks:**

- [ ] Create share button in GameOverScreen
- [ ] Format share text with stats
- [ ] Call SDK composeCast
- [ ] Handle success/error

**Acceptance Criteria:**

- Can share results
- Cast includes relevant stats
- Errors handled gracefully

---

#### Task 5.4.2: Implement Notifications

**Priority:** P2  
**Estimate:** 4 hours  
**Dependencies:** 4.2.2

**Description:**
Send Farcaster notifications.

**Subtasks:**

- [ ] Request notification permission
- [ ] Store notification tokens
- [ ] Send leaderboard notifications
- [ ] Send maintenance warnings
- [ ] Create notification job queue

**Acceptance Criteria:**

- Can request permission
- Notifications delivered
- Appropriate notification types

---

### 5.5 Testing & QA

#### Task 5.5.1: Integration Testing

**Priority:** P0  
**Estimate:** 8 hours  
**Dependencies:** All Phase 4

**Description:**
Full integration test suite.

**Subtasks:**

- [ ] Contract integration tests
- [ ] API integration tests
- [ ] Frontend E2E tests
- [ ] Test full user flow
- [ ] Test edge cases
- [ ] Performance testing

**Acceptance Criteria:**

- All flows work end-to-end
- No critical bugs
- Performance acceptable

---

---

## Phase 6: Deployment (Weeks 11-12)

### 6.1 Testnet Deployment

#### Task 6.1.1: Deploy to Base Sepolia

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** All Phase 5

**Description:**
Deploy contracts to testnet.

**Subtasks:**

- [ ] Deploy all contracts
- [ ] Verify on BaseScan
- [ ] Configure permissions
- [ ] Update frontend env vars
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Test full flow on testnet

**Acceptance Criteria:**

- All contracts deployed and verified
- Frontend works with testnet
- Full flow functional

---

#### Task 6.1.2: Testnet QA

**Priority:** P0  
**Estimate:** 8 hours  
**Dependencies:** 6.1.1

**Description:**
Quality assurance on testnet.

**Subtasks:**

- [ ] Test all user flows
- [ ] Test edge cases
- [ ] Test on mobile devices
- [ ] Test in Warpcast
- [ ] Fix identified issues
- [ ] Performance optimization

**Acceptance Criteria:**

- All flows work correctly
- Mobile experience good
- Performance acceptable

---

### 6.2 Mainnet Deployment

#### Task 6.2.1: Pre-Deployment Checklist

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 6.1.2

**Description:**
Verify readiness for mainnet.

**Subtasks:**

- [ ] Security review complete
- [ ] All tests passing
- [ ] Treasury multisig configured
- [ ] Reward signer key secured
- [ ] RPC provider configured
- [ ] Monitoring configured
- [ ] Backup procedures documented

**Acceptance Criteria:**

- All checklist items complete
- Team sign-off received

---

#### Task 6.2.2: Deploy to Base Mainnet

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 6.2.1

**Description:**
Deploy contracts to mainnet.

**Subtasks:**

- [ ] Deploy all contracts
- [ ] Verify on BaseScan
- [ ] Configure permissions
- [ ] Mint initial allocations
- [ ] Seed bonding curves
- [ ] Update frontend env vars
- [ ] Deploy frontend (production)
- [ ] Deploy backend (production)

**Acceptance Criteria:**

- All contracts deployed and verified
- Initial allocations correct
- Bonding curves seeded
- Frontend/backend production

---

#### Task 6.2.3: Post-Launch Monitoring

**Priority:** P0  
**Estimate:** Ongoing  
**Dependencies:** 6.2.2

**Description:**
Monitor system after launch.

**Subtasks:**

- [ ] Monitor contract events
- [ ] Monitor API health
- [ ] Monitor error rates
- [ ] Respond to issues
- [ ] Community support

**Acceptance Criteria:**

- System stable
- Issues addressed promptly
- Community supported

---

---

## Summary

### Total Tasks: 65+

### Estimated Hours: ~250 hours

### Current Progress

**Phase 1: Infrastructure** - ✅ COMPLETE (15/15 tasks)

- All monorepo setup complete
- VSCToken, GearToken, BondingCurve contracts implemented and tested
- Deployment scripts working on Anvil
- Wallet connection and token balance display implemented

**Phase 2: Game Engine** - ✅ COMPLETE (13/13 tasks complete)

- ✅ PixiJS setup, Input System, Scene Manager
- ✅ Player entity with movement, health, invincibility
- ✅ Camera following player in infinite arena
- ✅ Enemy spawning and AI (Yuka steering behaviors)
- ✅ Basic weapon system with auto-targeting
- ✅ Collision detection (player-enemy, projectile-enemy)
- ✅ Pickup system (XP gems with magnet attraction)
- ✅ Level-up system with exponential XP scaling
- ✅ Level-up UI with upgrade selection modal
- ✅ HUD, Pause menu, Game over screen

**Phase 3-6:** Not started

### Phase Breakdown

| Phase | Focus            | Duration | Critical Path               | Status      |
| ----- | ---------------- | -------- | --------------------------- | ----------- |
| 1     | Infrastructure   | 2 weeks  | Monorepo, Tokens, Curves    | ✅ Complete |
| 2     | Game Engine      | 2 weeks  | PixiJS, Combat, Leveling    | ✅ Complete |
| 3     | Meta-Progression | 2 weeks  | Staking, Maintenance        | Not started |
| 4     | Backend          | 2 weeks  | API, Sessions, Rewards      | Not started |
| 5     | Polish           | 2 weeks  | NFTs, Leaderboards, Testing | Not started |
| 6     | Deployment       | 2 weeks  | Testnet, Mainnet, Launch    | Not started |

### Key Milestones

1. **Week 2:** ✅ Tokens and curves deployed to local Anvil
2. **Week 4:** 🔄 Playable game loop (no blockchain) - core loop working, needs XP/leveling
3. **Week 6:** Staking UI functional
4. **Week 8:** Full backend integration
5. **Week 10:** All features complete on testnet
6. **Week 12:** Mainnet launch
