# 05 - Frontend Specifications

## Game Engine Architecture

```mermaid
┌─────────────────────────────────────────────────────────────────┐
│                      GAME ENGINE (PixiJS)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Scene     │    │   Entity    │    │  Systems    │        │
│  │  Manager    │◄──►│   Manager   │◄──►│   Manager   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ GameScene   │    │   Player    │    │  Movement   │        │
│  │ MenuScene   │    │   Enemy     │    │  Combat     │        │
│  │ ResultScene │    │  Projectile │    │  Collision  │        │
│  │ ShopScene   │    │   Pickup    │    │  Spawning   │        │
│  └─────────────┘    │   Effect    │    │  Leveling   │        │
│                     └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Game Loop

```typescript
// Game loop runs at 60 FPS
// Each frame:
// 1. Process input (touch/keyboard)
// 2. Update systems (movement, combat, collision)
// 3. Spawn enemies based on difficulty curve
// 4. Update UI (health, XP, timer)
// 5. Render frame

class GameEngine {
  private app: Application;
  private lastTime: number = 0;
  private gameState: GameState;

  update(currentTime: number): void {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.gameState.paused || this.gameState.gameOver) return;

    // 1. Process input
    this.inputSystem.update();

    // 2. Update player movement
    this.movementSystem.update(deltaTime);

    // 3. Update combat (weapons fire automatically)
    this.combatSystem.update(deltaTime);

    // 4. Update projectiles
    this.projectileSystem.update(deltaTime);

    // 5. Check collisions
    this.collisionSystem.update();

    // 6. Spawn enemies
    this.spawningSystem.update(deltaTime);

    // 7. Update pickups
    this.pickupSystem.update();

    // 8. Check level up
    this.levelingSystem.update();

    // 9. Update difficulty
    this.gameState.time += deltaTime;
    this.gameState.difficulty = 1 + this.gameState.time / 60;
  }
}
```

## Game State

```typescript
interface GameState {
  player: PlayerState;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  time: number; // Seconds survived
  difficulty: number; // Linear scaling factor
  paused: boolean;
  gameOver: boolean;
}

interface PlayerState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  xp: number;
  level: number;
  weapons: Weapon[];
  passives: Passive[];
  stats: PlayerStats;
}

interface PlayerStats {
  damage: number; // Base damage multiplier
  damageReduction: number; // Damage reduction %
  areaOfEffect: number; // AoE multiplier
  attackSpeed: number; // Attack speed multiplier
  xpGain: number; // XP gain multiplier
  moveSpeed: number; // Movement speed multiplier
  pickupRange: number; // Pickup magnet range
}

interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  xpValue: number;
}

interface Projectile {
  id: string;
  weaponId: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage: number;
  piercing: number;
  lifetime: number;
}

interface Pickup {
  id: string;
  type: "xp" | "health" | "coin";
  x: number;
  y: number;
  value: number;
}
```

## Input Handling

```typescript
// Mobile: Touch/drag for movement
// Desktop: WASD or Arrow keys
// Movement is relative to screen center (virtual joystick behavior)

interface InputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  isTouching: boolean;
  touchStartX: number;
  touchStartY: number;
}

class InputSystem {
  private state: InputState = {
    moveX: 0,
    moveY: 0,
    isTouching: false,
    touchStartX: 0,
    touchStartY: 0,
  };

  private readonly DEAD_ZONE = 20; // pixels
  private readonly MAX_DISTANCE = 100; // pixels

  constructor(canvas: HTMLCanvasElement) {
    // Touch events
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);

    // Keyboard events
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.state.isTouching = true;
    this.state.touchStartX = e.clientX;
    this.state.touchStartY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.state.isTouching) return;

    const dx = e.clientX - this.state.touchStartX;
    const dy = e.clientY - this.state.touchStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.DEAD_ZONE) {
      this.state.moveX = 0;
      this.state.moveY = 0;
      return;
    }

    const normalizedDistance = Math.min(distance, this.MAX_DISTANCE) / this.MAX_DISTANCE;
    const angle = Math.atan2(dy, dx);

    this.state.moveX = Math.cos(angle) * normalizedDistance;
    this.state.moveY = Math.sin(angle) * normalizedDistance;
  };

  private onPointerUp = () => {
    this.state.isTouching = false;
    this.state.moveX = 0;
    this.state.moveY = 0;
  };

  get movement(): { x: number; y: number } {
    return { x: this.state.moveX, y: this.state.moveY };
  }
}
```

## Component Structure

```bash
src/
├── components/
│   ├── game/
│   │   ├── GameCanvas.tsx          # PixiJS container
│   │   ├── HUD.tsx                 # Health, XP, timer overlay
│   │   ├── LevelUpModal.tsx        # Weapon/passive selection
│   │   ├── PauseMenu.tsx
│   │   ├── GameOverScreen.tsx
│   │   └── VirtualJoystick.tsx     # Mobile touch controls
│   │
│   ├── meta/
│   │   ├── GearPanel.tsx           # Gear staking UI
│   │   ├── GearSlot.tsx            # Individual slot
│   │   ├── MaintenanceBar.tsx      # Maintenance pool status
│   │   ├── UpgradeShop.tsx         # Global upgrades
│   │   ├── LeaderboardEntry.tsx
│   │   └── PlayerProfile.tsx
│   │
│   ├── wallet/
│   │   ├── ConnectButton.tsx       # Farcaster wallet connect
│   │   ├── TokenBalance.tsx
│   │   ├── TransactionStatus.tsx
│   │   └── WalletModal.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── ProgressBar.tsx
│       ├── Tooltip.tsx
│       ├── Card.tsx
│       └── Spinner.tsx
```

## State Management (Zustand)

### Game Store

```typescript
// stores/gameStore.ts
import { create } from "zustand";

interface GameStore {
  // Game state
  gameState: GameState | null;
  isPlaying: boolean;
  isPaused: boolean;

  // Level up
  levelUpChoices: (Weapon | Passive)[];
  isLevelingUp: boolean;

  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (results: GameResults) => void;
  selectLevelUp: (choice: Weapon | Passive) => void;

  // Internal
  setGameState: (state: GameState) => void;
  triggerLevelUp: (choices: (Weapon | Passive)[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  isPlaying: false,
  isPaused: false,
  levelUpChoices: [],
  isLevelingUp: false,

  startGame: () => {
    set({
      isPlaying: true,
      isPaused: false,
      gameState: createInitialGameState(),
    });
  },

  pauseGame: () => {
    set({ isPaused: true });
  },

  resumeGame: () => {
    set({ isPaused: false });
  },

  endGame: async (results: GameResults) => {
    set({ isPlaying: false, gameState: null });
    // Trigger reward calculation
    await useSessionStore.getState().endSession(results);
  },

  selectLevelUp: (choice: Weapon | Passive) => {
    const state = get().gameState;
    if (!state) return;

    // Add to player loadout
    if ("damage" in choice) {
      state.player.weapons.push(choice as Weapon);
    } else {
      state.player.passives.push(choice as Passive);
    }

    set({ isLevelingUp: false, levelUpChoices: [] });
  },

  setGameState: (state) => set({ gameState: state }),

  triggerLevelUp: (choices) => {
    set({ isLevelingUp: true, levelUpChoices: choices });
  },
}));
```

### Player Store

```typescript
// stores/playerStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlayerStore {
  // On-chain data
  address: `0x${string}` | null;
  fid: number | null;
  vscBalance: bigint;
  gearBalances: Record<GearType, bigint>;
  stakedGear: Record<GearSlot, bigint>;
  maintenancePool: bigint;
  maintenanceThreshold: bigint;
  globalUpgrades: Record<UpgradeType, number>;
  hasEarlyAdopterNFT: boolean;

  // Computed
  totalGearPower: number;
  isMaintenanceActive: boolean;

  // Actions
  setAddress: (address: `0x${string}` | null) => void;
  setFid: (fid: number | null) => void;
  refreshBalances: () => Promise<void>;
  stakeGear: (slot: GearSlot, amount: bigint) => Promise<void>;
  unstakeGear: (slot: GearSlot, amount: bigint) => Promise<void>;
  depositMaintenance: (amount: bigint) => Promise<void>;
  mintUpgrade: (type: UpgradeType) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      address: null,
      fid: null,
      vscBalance: 0n,
      gearBalances: {
        weapon: 0n,
        armor: 0n,
        power: 0n,
        gloves: 0n,
        amulet: 0n,
        boots: 0n,
      },
      stakedGear: {
        weapon: 0n,
        armor: 0n,
        power: 0n,
        gloves: 0n,
        amulet: 0n,
        boots: 0n,
      },
      maintenancePool: 0n,
      maintenanceThreshold: 0n,
      globalUpgrades: {},
      hasEarlyAdopterNFT: false,
      totalGearPower: 0,
      isMaintenanceActive: false,

      setAddress: (address) => set({ address }),
      setFid: (fid) => set({ fid }),

      refreshBalances: async () => {
        const { address } = get();
        if (!address) return;

        // Fetch all balances from contracts
        const [vscBalance, gearBalances, stakedGear, maintenancePool, totalPower] =
          await Promise.all([
            getVSCBalance(address),
            getAllGearBalances(address),
            getAllStakedAmounts(address),
            getMaintenancePool(address),
            getTotalGearPower(address),
          ]);

        set({
          vscBalance,
          gearBalances,
          stakedGear,
          maintenancePool,
          totalGearPower: totalPower,
          isMaintenanceActive: maintenancePool >= get().maintenanceThreshold,
        });
      },

      stakeGear: async (slot, amount) => {
        // Implementation with wagmi writeContract
      },

      unstakeGear: async (slot, amount) => {
        // Implementation with wagmi writeContract
      },

      depositMaintenance: async (amount) => {
        // Implementation with wagmi writeContract
      },

      mintUpgrade: async (type) => {
        // Implementation with wagmi writeContract
      },
    }),
    {
      name: "player-storage",
      partialize: (state) => ({ address: state.address, fid: state.fid }),
    }
  )
);
```

### Session Store

```typescript
// stores/sessionStore.ts
import { create } from "zustand";

interface SessionStore {
  // Current session
  sessionId: string | null;
  startTime: number | null;
  rewardsEarned: bigint;

  // History
  recentSessions: SessionResult[];
  dailyRewardsClaimed: bigint;

  // Actions
  startSession: () => Promise<void>;
  endSession: (results: GameResults) => Promise<void>;
  claimRewards: () => Promise<void>;
  sendHeartbeat: (data: HeartbeatData) => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: null,
  startTime: null,
  rewardsEarned: 0n,
  recentSessions: [],
  dailyRewardsClaimed: 0n,

  startSession: async () => {
    const response = await fetch("/api/game/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const { sessionId } = await response.json();
    set({ sessionId, startTime: Date.now(), rewardsEarned: 0n });
  },

  endSession: async (results) => {
    const { sessionId } = get();
    if (!sessionId) return;

    const response = await fetch("/api/game/session/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...results }),
    });

    const { rewards, signature, nonce, expiry } = await response.json();

    set((state) => ({
      sessionId: null,
      startTime: null,
      rewardsEarned: BigInt(rewards),
      recentSessions: [
        { ...results, rewards: BigInt(rewards), signature, nonce, expiry },
        ...state.recentSessions.slice(0, 9),
      ],
    }));
  },

  claimRewards: async () => {
    // Call RewardDistributor.claim() with signature
  },

  sendHeartbeat: async (data) => {
    const { sessionId } = get();
    if (!sessionId) return;

    await fetch("/api/game/session/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...data }),
    });
  },
}));
```

## Web3 Integration

### Contract Clients

```typescript
// lib/contracts.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

const chain = import.meta.env.VITE_CHAIN_ID === "8453" ? base : baseSepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(),
});

// Contract addresses
export const ADDRESSES = {
  vscToken: import.meta.env.VITE_VSC_TOKEN_ADDRESS as `0x${string}`,
  gearStaking: import.meta.env.VITE_GEAR_STAKING_ADDRESS as `0x${string}`,
  bondingCurve: import.meta.env.VITE_BONDING_CURVE_ADDRESS as `0x${string}`,
  maintenancePool: import.meta.env.VITE_MAINTENANCE_POOL_ADDRESS as `0x${string}`,
  rewardDistributor: import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS as `0x${string}`,
  globalUpgradeNFT: import.meta.env.VITE_GLOBAL_UPGRADE_NFT_ADDRESS as `0x${string}`,
  earlyAdopterNFT: import.meta.env.VITE_EARLY_ADOPTER_NFT_ADDRESS as `0x${string}`,
};
```

### Custom Hooks

```typescript
// hooks/useVSCToken.ts
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ADDRESSES } from "@/lib/contracts";
import { vscTokenAbi } from "@/sdk/contracts/abis";

export function useVSCToken() {
  const { address } = useAccount();

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: ADDRESSES.vscToken,
    abi: vscTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  const { writeContractAsync: approve, isPending: isApproving } = useWriteContract();

  const approveSpender = async (spender: `0x${string}`, amount: bigint) => {
    return approve({
      address: ADDRESSES.vscToken,
      abi: vscTokenAbi,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    balance: balance ?? 0n,
    refetchBalance,
    approveSpender,
    isApproving,
  };
}

// hooks/useGearStaking.ts
export function useGearStaking() {
  const { address } = useAccount();

  // Read staked amounts for all slots
  const { data: stakedAmounts, refetch: refetchStaked } = useReadContracts({
    contracts: GEAR_SLOTS.map((slot) => ({
      address: ADDRESSES.gearStaking,
      abi: gearStakingAbi,
      functionName: "getStakedAmount",
      args: [address, slot],
    })),
    enabled: !!address,
  });

  // Read total power
  const { data: totalPower } = useReadContract({
    address: ADDRESSES.gearStaking,
    abi: gearStakingAbi,
    functionName: "getTotalPower",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  const { writeContractAsync: stakeAsync, isPending: isStaking } = useWriteContract();
  const { writeContractAsync: unstakeAsync, isPending: isUnstaking } = useWriteContract();

  const stake = async (slot: number, amount: bigint) => {
    // 1. Approve gear token
    const gearToken = GEAR_TOKEN_ADDRESSES[slot];
    await approveToken(gearToken, ADDRESSES.gearStaking, amount);

    // 2. Call stake
    return stakeAsync({
      address: ADDRESSES.gearStaking,
      abi: gearStakingAbi,
      functionName: "stake",
      args: [slot, amount],
    });
  };

  const unstake = async (slot: number, amount: bigint) => {
    return unstakeAsync({
      address: ADDRESSES.gearStaking,
      abi: gearStakingAbi,
      functionName: "unstake",
      args: [slot, amount],
    });
  };

  return {
    stakedAmounts: stakedAmounts?.map((r) => r.result ?? 0n) ?? [],
    totalPower: totalPower ?? 0n,
    stake,
    unstake,
    isStaking,
    isUnstaking,
    refetchStaked,
  };
}
```

## Farcaster Mini App Integration

```typescript
// lib/farcaster.ts
import { sdk } from "@farcaster/miniapp-sdk";

// Initialize Mini App SDK
export async function initMiniApp() {
  const context = await sdk.context;

  return {
    user: context.user,
    client: context.client,
    location: context.location,
  };
}

// Request wallet connection
export async function connectWallet() {
  const result = await sdk.actions.signIn({
    siweUri: import.meta.env.VITE_SIWE_URI,
    domain: import.meta.env.VITE_DOMAIN,
  });
  return result;
}

// Share to Farcaster
export async function shareResult(score: number, time: number) {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  await sdk.actions.composeCast({
    text: `🧛 I survived ${timeStr} and scored ${score.toLocaleString()} in Farcaster Survivors!\n\nCan you beat my score?`,
    embeds: [import.meta.env.VITE_GAME_URL],
  });
}

// Request notification permission
export async function requestNotifications() {
  const result = await sdk.actions.requestNotificationPermission();
  return result;
}
```

### Farcaster Manifest

```json
// public/.well-known/farcaster.json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjEyMzQ1LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4Li4uIn0",
    "payload": "eyJkb21haW4iOiJmYXJjYXN0ZXJzdXJ2aXZvcnMuZ2FtZSJ9",
    "signature": "0x..."
  },
  "frame": {
    "version": "1",
    "name": "Farcaster Survivors",
    "iconUrl": "https://farcastersurvivors.game/icon.png",
    "homeUrl": "https://farcastersurvivors.game",
    "imageUrl": "https://farcastersurvivors.game/og.png",
    "buttonTitle": "Play Now",
    "splashImageUrl": "https://farcastersurvivors.game/splash.png",
    "splashBackgroundColor": "#1a1a2e",
    "webhookUrl": "https://api.farcastersurvivors.game/farcaster/webhook"
  }
}
```

## Responsive Design

### Breakpoints

| Name | Width       | Target           |
| ---- | ----------- | ---------------- |
| xs   | 0-639px     | Mobile portrait  |
| sm   | 640-767px   | Mobile landscape |
| md   | 768-1023px  | Tablet           |
| lg   | 1024-1279px | Desktop          |
| xl   | 1280px+     | Large desktop    |

### Mobile-First Approach

```css
/* Base styles for mobile */
.game-canvas {
  width: 100vw;
  height: 100vh;
  touch-action: none;
}

/* Tablet and up */
@media (min-width: 768px) {
  .game-canvas {
    max-width: 800px;
    max-height: 600px;
    margin: auto;
  }
}
```

## Performance Optimization

### Asset Loading

```typescript
// Preload critical assets
const PRELOAD_ASSETS = [
  "sprites/player.png",
  "sprites/enemies.png",
  "sprites/projectiles.png",
  "sprites/pickups.png",
];

async function preloadAssets() {
  await Assets.load(PRELOAD_ASSETS);
}
```

### Object Pooling

```typescript
// Pool frequently created/destroyed objects
class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, initialSize: number = 100) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T {
    return this.available.pop() ?? this.factory();
  }

  release(obj: T): void {
    this.available.push(obj);
  }
}

// Use for projectiles, enemies, pickups
const projectilePool = new ObjectPool(() => new Projectile(), 500);
const enemyPool = new ObjectPool(() => new Enemy(), 200);
```

### Render Optimization

- Use sprite batching for same-texture sprites
- Cull off-screen entities
- Use spatial hashing for collision detection
- Limit particle effects on low-end devices
