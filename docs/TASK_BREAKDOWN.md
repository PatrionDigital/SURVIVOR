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
- [ ] Set up routing (if needed)
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

#### Task 1.2.3: Implement GearToken.sol

**Priority:** P0  
**Estimate:** 3 hours  
**Dependencies:** 1.1.4

**Description:**
Implement the template for gear tokens (deployed 6 times).

**Subtasks:**

- [ ] Create GearToken contract inheriting ERC20, Pausable, Ownable2Step
- [ ] Implement bondingCurve address storage
- [ ] Implement mint() function (bonding curve only)
- [ ] Implement burn() function (bonding curve only)
- [ ] Implement setBondingCurve() function
- [ ] Add custom errors
- [ ] Add events

**Acceptance Criteria:**

- Only bonding curve can mint/burn
- Pausable works correctly
- 100% test coverage

---

#### Task 1.2.4: Write GearToken Tests

**Priority:** P0  
**Estimate:** 3 hours  
**Dependencies:** 1.2.3

**Description:**
Test suite for GearToken.

**Subtasks:**

- [ ] Test initial state
- [ ] Test minting from bonding curve
- [ ] Test minting from non-bonding-curve fails
- [ ] Test burning
- [ ] Test pause/unpause

**Acceptance Criteria:**

- 100% coverage
- Access control verified

---

### 1.3 Smart Contracts - Bonding Curve

#### Task 1.3.1: Implement BondingCurve.sol

**Priority:** P0  
**Estimate:** 8 hours  
**Dependencies:** 1.2.1, 1.2.3

**Description:**
Implement polynomial bonding curve AMM.

**Subtasks:**

- [ ] Create BondingCurve contract with Pausable, Ownable2Step, ReentrancyGuard
- [ ] Implement curve formula: Price = BasePrice + (Slope × Supply²)
- [ ] Implement buy() function with fee calculation
- [ ] Implement sell() function with fee calculation
- [ ] Implement calculateBuyReturn() view
- [ ] Implement calculateSellReturn() view
- [ ] Implement getCurrentPrice() view
- [ ] Implement fee distribution (60% treasury, 40% burn)
- [ ] Implement setFeeRecipients()
- [ ] Implement setFeeSplit()
- [ ] Add slippage protection
- [ ] Add custom errors and events

**Acceptance Criteria:**

- Buy/sell works correctly
- Fees calculated and distributed properly
- Slippage protection works
- No reentrancy vulnerabilities
- 100% test coverage

---

#### Task 1.3.2: Write BondingCurve Tests

**Priority:** P0  
**Estimate:** 6 hours  
**Dependencies:** 1.3.1

**Description:**
Comprehensive test suite for BondingCurve.

**Subtasks:**

- [ ] Test buy with various amounts
- [ ] Test sell with various amounts
- [ ] Test price calculation accuracy
- [ ] Test fee calculation
- [ ] Test fee distribution
- [ ] Test slippage protection
- [ ] Test reentrancy protection
- [ ] Fuzz test buy/sell amounts
- [ ] Invariant test: always collateralized

**Acceptance Criteria:**

- 100% coverage
- Economic invariants verified
- No profit from buy-then-sell (due to fees)

---

#### Task 1.3.3: Create Deployment Script for Tokens & Curves

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 1.2.1, 1.2.3, 1.3.1

**Description:**
Create Foundry deployment script for all tokens and bonding curves.

**Subtasks:**

- [ ] Create Deploy.s.sol with ordered deployment
- [ ] Deploy VSCToken
- [ ] Deploy 6 GearTokens
- [ ] Deploy VSC-ETH BondingCurve
- [ ] Deploy 6 Gear-VSC BondingCurves
- [ ] Configure permissions
- [ ] Log all addresses
- [ ] Test on Anvil

**Acceptance Criteria:**

- Script deploys all contracts in correct order
- Permissions configured correctly
- Works on Anvil and Base Sepolia

---

### 1.4 Basic Frontend

#### Task 1.4.1: Implement Wallet Connection

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 1.1.2

**Description:**
Implement Farcaster wallet connection using Mini App SDK.

**Subtasks:**

- [ ] Create ConnectButton component
- [ ] Implement initMiniApp() function
- [ ] Implement connectWallet() with SIWF
- [ ] Create useWallet hook
- [ ] Handle connection states (connecting, connected, error)
- [ ] Store connection in Zustand
- [ ] Display connected address

**Acceptance Criteria:**

- Users can connect wallet via Farcaster
- Connection persists across page refresh
- Error states handled gracefully

---

#### Task 1.4.2: Implement Token Balance Display

**Priority:** P1  
**Estimate:** 4 hours  
**Dependencies:** 1.4.1, 1.3.3

**Description:**
Display $VSC and gear token balances.

**Subtasks:**

- [ ] Create TokenBalance component
- [ ] Create useVSCToken hook
- [ ] Create useGearTokens hook
- [ ] Display formatted balances
- [ ] Auto-refresh on new blocks
- [ ] Handle loading/error states

**Acceptance Criteria:**

- Balances display correctly
- Balances update on chain changes
- Loading states shown

---

---

## Phase 2: Game Engine (Weeks 3-4)

### 2.1 Core Engine

#### Task 2.1.1: Set Up PixiJS Application

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 1.1.2

**Description:**
Initialize PixiJS v8 application with game canvas.

**Subtasks:**

- [ ] Create GameCanvas React component
- [ ] Initialize PixiJS Application
- [ ] Configure WebGL renderer
- [ ] Handle canvas resize
- [ ] Set up asset loader
- [ ] Create game loop (60 FPS)
- [ ] Integrate with React lifecycle

**Acceptance Criteria:**

- Canvas renders in browser
- Responsive to window resize
- Consistent 60 FPS

---

#### Task 2.1.2: Implement Input System

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.1.1

**Description:**
Handle touch and keyboard input for player movement.

**Subtasks:**

- [ ] Create InputSystem class
- [ ] Implement touch/pointer event handlers
- [ ] Implement virtual joystick (100px dead zone)
- [ ] Implement keyboard input (WASD, arrows)
- [ ] Normalize input to -1 to 1 range
- [ ] Export movement vector
- [ ] Test on mobile and desktop

**Acceptance Criteria:**

- Touch controls work on mobile
- Keyboard controls work on desktop
- Movement is smooth and responsive

---

#### Task 2.1.3: Implement Scene Manager

**Priority:** P0  
**Estimate:** 3 hours  
**Dependencies:** 2.1.1

**Description:**
Manage game scenes (menu, game, results).

**Subtasks:**

- [ ] Create Scene base class
- [ ] Create SceneManager
- [ ] Implement scene transitions
- [ ] Create MenuScene shell
- [ ] Create GameScene shell
- [ ] Create ResultScene shell

**Acceptance Criteria:**

- Can switch between scenes
- Scenes clean up properly
- Transitions are smooth

---

### 2.2 Player & Movement

#### Task 2.2.1: Implement Player Entity

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.1.2

**Description:**
Create player entity with movement and stats.

**Subtasks:**

- [ ] Create Player class with sprite
- [ ] Implement position and velocity
- [ ] Implement movement based on input
- [ ] Implement health system
- [ ] Implement invincibility frames on hit
- [ ] Create player stats (damage, speed, etc.)
- [ ] Handle screen boundaries

**Acceptance Criteria:**

- Player moves based on input
- Player has health that can decrease
- Player sprite renders and animates

---

#### Task 2.2.2: Implement Camera/Viewport

**Priority:** P1  
**Estimate:** 3 hours  
**Dependencies:** 2.2.1

**Description:**
Camera that follows player in infinite arena.

**Subtasks:**

- [ ] Create Camera class
- [ ] Implement smooth follow
- [ ] Implement viewport culling
- [ ] Update all entity positions relative to camera

**Acceptance Criteria:**

- Camera follows player smoothly
- Only visible entities are rendered

---

### 2.3 Enemies

#### Task 2.3.1: Implement Enemy Base Class

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.1.1

**Description:**
Base class for all enemy types.

**Subtasks:**

- [ ] Create Enemy class with sprite
- [ ] Implement health system
- [ ] Implement damage dealing on contact
- [ ] Implement death and XP drop
- [ ] Implement basic AI (move toward player)
- [ ] Create enemy pool for performance

**Acceptance Criteria:**

- Enemies move toward player
- Enemies damage player on contact
- Enemies drop XP on death

---

#### Task 2.3.2: Implement Enemy Spawning System

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.3.1

**Description:**
Spawn enemies based on time/difficulty.

**Subtasks:**

- [ ] Create SpawningSystem class
- [ ] Implement spawn timer
- [ ] Implement difficulty scaling (linear)
- [ ] Implement spawn patterns (from screen edges)
- [ ] Balance spawn rates
- [ ] Implement enemy variety by time

**Acceptance Criteria:**

- Enemies spawn at regular intervals
- Spawn rate increases over time
- Enemies spawn from off-screen

---

### 2.4 Combat

#### Task 2.4.1: Implement Weapon System

**Priority:** P0  
**Estimate:** 6 hours  
**Dependencies:** 2.2.1

**Description:**
Auto-attacking weapon system.

**Subtasks:**

- [ ] Create Weapon base class
- [ ] Implement auto-attack timer
- [ ] Implement projectile creation
- [ ] Create Projectile class with movement
- [ ] Implement weapon levels (1-8)
- [ ] Create 3-5 starter weapons
- [ ] Implement weapon slot system (max 6)

**Acceptance Criteria:**

- Weapons fire automatically
- Projectiles move and render
- Weapons can be leveled up

---

#### Task 2.4.2: Implement Collision System

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.4.1, 2.3.1

**Description:**
Detect collisions between entities.

**Subtasks:**

- [ ] Create CollisionSystem class
- [ ] Implement spatial hashing for performance
- [ ] Detect projectile-enemy collisions
- [ ] Detect player-enemy collisions
- [ ] Detect player-pickup collisions
- [ ] Apply damage on collision

**Acceptance Criteria:**

- Collisions detected accurately
- Performance stays at 60 FPS with 200+ entities
- Damage applied correctly

---

#### Task 2.4.3: Implement Pickup System

**Priority:** P0  
**Estimate:** 3 hours  
**Dependencies:** 2.4.2

**Description:**
XP gems and other pickups.

**Subtasks:**

- [ ] Create Pickup base class
- [ ] Create XP gem pickup
- [ ] Implement magnet range (attract to player)
- [ ] Implement collection and XP addition
- [ ] Create pickup pool for performance

**Acceptance Criteria:**

- XP gems drop from enemies
- Gems attracted to player within range
- XP added to player on collection

---

### 2.5 Leveling

#### Task 2.5.1: Implement Level-Up System

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.4.3

**Description:**
Level up when XP threshold reached.

**Subtasks:**

- [ ] Track XP and level in game state
- [ ] Calculate XP thresholds per level
- [ ] Trigger level-up event
- [ ] Pause game during level-up
- [ ] Generate random choices (3 options)
- [ ] Apply selected upgrade

**Acceptance Criteria:**

- Level up triggers at correct XP
- Game pauses during selection
- Selected upgrade applied correctly

---

#### Task 2.5.2: Implement Level-Up UI

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.5.1

**Description:**
UI for selecting level-up upgrades.

**Subtasks:**

- [ ] Create LevelUpModal component
- [ ] Display 3 upgrade choices
- [ ] Show upgrade descriptions
- [ ] Handle selection
- [ ] Close modal and resume game

**Acceptance Criteria:**

- Modal appears on level up
- Choices are clearly displayed
- Selection works on touch and click

---

### 2.6 HUD & UI

#### Task 2.6.1: Implement Game HUD

**Priority:** P0  
**Estimate:** 4 hours  
**Dependencies:** 2.2.1

**Description:**
Heads-up display during gameplay.

**Subtasks:**

- [ ] Create HUD component
- [ ] Display health bar
- [ ] Display XP bar
- [ ] Display timer (survival time)
- [ ] Display level
- [ ] Display weapon icons
- [ ] Position HUD correctly on mobile/desktop

**Acceptance Criteria:**

- All stats displayed clearly
- Updates in real-time
- Doesn't obstruct gameplay

---

#### Task 2.6.2: Implement Pause Menu

**Priority:** P1  
**Estimate:** 2 hours  
**Dependencies:** 2.1.3

**Description:**
Pause menu with resume and quit options.

**Subtasks:**

- [ ] Create PauseMenu component
- [ ] Pause game on ESC/button
- [ ] Display pause overlay
- [ ] Resume and Quit buttons
- [ ] Resume on click outside

**Acceptance Criteria:**

- Game pauses correctly
- Can resume or quit
- Game state preserved

---

#### Task 2.6.3: Implement Game Over Screen

**Priority:** P0  
**Estimate:** 3 hours  
**Dependencies:** 2.1.3

**Description:**
Show results when player dies.

**Subtasks:**

- [ ] Create GameOverScreen component
- [ ] Display survival time
- [ ] Display enemies killed
- [ ] Display level reached
- [ ] Display rewards earned
- [ ] Play Again button
- [ ] Share to Farcaster button

**Acceptance Criteria:**

- Shows all relevant stats
- Can start new game
- Can share results

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

### Phase Breakdown

| Phase | Focus            | Duration | Critical Path               |
| ----- | ---------------- | -------- | --------------------------- |
| 1     | Infrastructure   | 2 weeks  | Monorepo, Tokens, Curves    |
| 2     | Game Engine      | 2 weeks  | PixiJS, Combat, Leveling    |
| 3     | Meta-Progression | 2 weeks  | Staking, Maintenance        |
| 4     | Backend          | 2 weeks  | API, Sessions, Rewards      |
| 5     | Polish           | 2 weeks  | NFTs, Leaderboards, Testing |
| 6     | Deployment       | 2 weeks  | Testnet, Mainnet, Launch    |

### Key Milestones

1. **Week 2:** Tokens and curves deployed to local Anvil
2. **Week 4:** Playable game loop (no blockchain)
3. **Week 6:** Staking UI functional
4. **Week 8:** Full backend integration
5. **Week 10:** All features complete on testnet
6. **Week 12:** Mainnet launch
