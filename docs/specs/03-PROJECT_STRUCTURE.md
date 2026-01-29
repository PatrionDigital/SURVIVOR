# 03 - Project Structure

## Monorepo Layout

```bash
farcaster-survivors/
├── README.md
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition
├── turbo.json                      # Turborepo config
├── .env.example
├── .gitignore
├── .nvmrc                          # Node version (20)
│
├── apps/
│   ├── web/                        # React game client
│   │   ├── src/
│   │   │   ├── components/         # UI components
│   │   │   │   ├── game/           # Game-specific components
│   │   │   │   ├── meta/           # Meta-progression components
│   │   │   │   ├── wallet/         # Web3 components
│   │   │   │   └── ui/             # Generic UI components
│   │   │   ├── game/               # PixiJS game engine
│   │   │   │   ├── engine/         # Core engine classes
│   │   │   │   ├── entities/       # Player, enemies, projectiles
│   │   │   │   ├── systems/        # Movement, combat, collision
│   │   │   │   ├── scenes/         # Game, menu, results scenes
│   │   │   │   └── assets/         # Asset loaders
│   │   │   ├── hooks/              # React hooks
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── lib/                # Utilities
│   │   │   ├── types/              # TypeScript types
│   │   │   ├── constants/          # Game constants
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   ├── assets/             # Game sprites, audio
│   │   │   │   ├── sprites/
│   │   │   │   ├── audio/
│   │   │   │   └── fonts/
│   │   │   └── .well-known/        # Farcaster manifest
│   │   │       └── farcaster.json
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                        # Fastify backend
│       ├── src/
│       │   ├── routes/             # API routes
│       │   │   ├── auth.ts
│       │   │   ├── game.ts
│       │   │   ├── rewards.ts
│       │   │   ├── player.ts
│       │   │   └── farcaster.ts
│       │   ├── services/           # Business logic
│       │   │   ├── rewardCalculator.ts
│       │   │   ├── rewardSigner.ts
│       │   │   ├── sessionManager.ts
│       │   │   ├── leaderboard.ts
│       │   │   └── antiFraud.ts
│       │   ├── db/                 # Database queries
│       │   │   ├── players.ts
│       │   │   ├── sessions.ts
│       │   │   ├── rewards.ts
│       │   │   └── leaderboard.ts
│       │   ├── middleware/         # Auth, validation
│       │   │   ├── auth.ts
│       │   │   ├── rateLimit.ts
│       │   │   └── validation.ts
│       │   ├── jobs/               # Background jobs
│       │   │   ├── decayMaintenance.ts
│       │   │   ├── updateLeaderboard.ts
│       │   │   └── sendNotifications.ts
│       │   ├── lib/                # Utilities
│       │   │   ├── supabase.ts
│       │   │   ├── redis.ts
│       │   │   └── farcaster.ts
│       │   └── index.ts
│       ├── tests/
│       │   ├── services/
│       │   ├── routes/
│       │   └── db/
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── contracts/                  # Solidity smart contracts
│   │   ├── src/
│   │   │   ├── tokens/
│   │   │   │   ├── VSCToken.sol
│   │   │   │   └── GearToken.sol
│   │   │   ├── bonding/
│   │   │   │   └── BondingCurve.sol
│   │   │   ├── staking/
│   │   │   │   ├── GearStaking.sol
│   │   │   │   └── MaintenancePool.sol
│   │   │   ├── rewards/
│   │   │   │   └── RewardDistributor.sol
│   │   │   ├── nfts/
│   │   │   │   ├── GlobalUpgradeNFT.sol
│   │   │   │   └── EarlyAdopterNFT.sol
│   │   │   └── governance/
│   │   │       └── FutarchyMarket.sol
│   │   ├── test/
│   │   │   ├── VSCToken.t.sol
│   │   │   ├── GearToken.t.sol
│   │   │   ├── BondingCurve.t.sol
│   │   │   ├── GearStaking.t.sol
│   │   │   ├── MaintenancePool.t.sol
│   │   │   ├── RewardDistributor.t.sol
│   │   │   ├── GlobalUpgradeNFT.t.sol
│   │   │   ├── EarlyAdopterNFT.t.sol
│   │   │   ├── integration/
│   │   │   │   └── FullFlow.t.sol
│   │   │   └── invariants/
│   │   │       └── EconomicInvariants.t.sol
│   │   ├── script/
│   │   │   ├── Deploy.s.sol
│   │   │   ├── DeployTestnet.s.sol
│   │   │   └── ConfigurePermissions.s.sol
│   │   ├── foundry.toml
│   │   ├── remappings.txt
│   │   └── package.json
│   │
│   ├── sdk/                        # Shared TypeScript SDK
│   │   ├── src/
│   │   │   ├── contracts/          # Contract ABIs + typed clients
│   │   │   │   ├── abis/
│   │   │   │   │   ├── VSCToken.json
│   │   │   │   │   ├── GearToken.json
│   │   │   │   │   ├── BondingCurve.json
│   │   │   │   │   ├── GearStaking.json
│   │   │   │   │   └── ...
│   │   │   │   ├── addresses.ts
│   │   │   │   └── clients.ts
│   │   │   ├── types/              # Shared types
│   │   │   │   ├── game.ts
│   │   │   │   ├── tokens.ts
│   │   │   │   ├── player.ts
│   │   │   │   └── api.ts
│   │   │   └── utils/              # Shared utilities
│   │   │       ├── formatting.ts
│   │   │       ├── calculations.ts
│   │   │       └── constants.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                     # Shared configs
│       ├── eslint/
│       │   └── index.js
│       ├── typescript/
│       │   └── base.json
│       └── tailwind/
│           └── preset.js
│
└── docs/                           # Documentation
    ├── specs/                      # Technical specifications
    │   ├── 01-PROJECT_OVERVIEW.md
    │   ├── 02-TECH_STACK.md
    │   ├── 03-PROJECT_STRUCTURE.md
    │   ├── 04-SMART_CONTRACTS.md
    │   ├── 05-FRONTEND.md
    │   ├── 06-BACKEND.md
    │   ├── 07-TESTING.md
    │   ├── 08-DEPLOYMENT.md
    │   ├── 09-SECURITY.md
    │   └── 10-CODE_QUALITY.md
    ├── GDD.md                      # Game Design Document
    ├── WHITEPAPER.md               # Tokenomics Whitepaper
    ├── API.md                      # API documentation
    └── TASK_BREAKDOWN.md           # Implementation tasks
```

## Naming Conventions

| Type                     | Convention            | Example               |
| ------------------------ | --------------------- | --------------------- |
| Files (TypeScript)       | camelCase.ts          | `gameEngine.ts`       |
| Files (React Components) | PascalCase.tsx        | `GearSlot.tsx`        |
| Files (Solidity)         | PascalCase.sol        | `BondingCurve.sol`    |
| Files (Tests)            | \_.test.ts / \_.t.sol | `rewards.test.ts`     |
| Directories              | kebab-case            | `game-engine/`        |
| Variables                | camelCase             | `playerHealth`        |
| Constants                | SCREAMING_SNAKE       | `MAX_WEAPONS`         |
| Functions                | camelCase             | `calculateDamage()`   |
| React Components         | PascalCase            | `WeaponSelector`      |
| React Hooks              | useCamelCase          | `useGearStaking`      |
| Types/Interfaces         | PascalCase            | `PlayerStats`         |
| Enums                    | PascalCase            | `GearSlot`            |
| Solidity Contracts       | PascalCase            | `GearStaking`         |
| Solidity Events          | PascalCase            | `TokensStaked`        |
| Solidity Errors          | PascalCase            | `InsufficientBalance` |
| Database Tables          | snake_case            | `player_sessions`     |
| Database Columns         | snake_case            | `created_at`          |
| API Routes               | kebab-case            | `/api/game-session`   |
| Environment Variables    | SCREAMING_SNAKE       | `DATABASE_URL`        |

## Workspace Configuration

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Root package.json

```json
{
  "name": "farcaster-survivors",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.12.0"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## Import Aliases

### Frontend (vite.config.ts)

```typescript
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@game": path.resolve(__dirname, "./src/game"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@types": path.resolve(__dirname, "./src/types"),
    },
  },
});
```

### Backend (tsconfig.json paths)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@routes/*": ["./src/routes/*"],
      "@services/*": ["./src/services/*"],
      "@db/*": ["./src/db/*"],
      "@middleware/*": ["./src/middleware/*"],
      "@lib/*": ["./src/lib/*"]
    }
  }
}
```
