# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Farcaster Survivors is a crypto-native bullet heaven game built as a Farcaster Mini App on Base L2. Players control a character with auto-attacking weapons, survive waves of enemies, and progress through gear-based meta-progression tied to on-chain tokens.

**Status:** Pre-implementation. Only specification documents exist in `docs/`. Implementation follows the task breakdown in `docs/TASK_BREAKDOWN.md`.

## Mandatory Workflow (ALWAYS FOLLOW)

**Before writing any code:**
1. Never work on `main` branch - create a feature branch first (`git checkout -b feature/...`)
2. Check Context7 MCP for up-to-date library documentation
3. For smart contracts, always check OpenZeppelin docs for latest patterns and security practices

**Development process:**
4. Use Test-Driven Development - write tests BEFORE implementation code
5. Run all local tests before committing - all must pass
6. Fix all linter errors before committing - zero tolerance

**Committing and versioning:**
7. Bump version using semantic versioning (`npm version patch|minor|major`) on every update
8. Commit only when tests pass and linter is clean

**Pull requests and deployment:**
9. Never merge a PR until all GitHub CI actions pass
10. For Vercel deployments, preview builds for the branch must pass checks before merging

## Tech Stack

| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Frontend  | React 18 + Vite + PixiJS v8 + TypeScript      |
| Backend   | Fastify + PostgreSQL (Supabase) + Redis       |
| Contracts | Solidity ^0.8.24 + Foundry                    |
| Web3      | wagmi v2 + viem                               |
| Chain     | Base L2 (mainnet) / Base Sepolia (testnet)    |

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm --filter web dev          # Frontend dev server
pnpm --filter api dev          # Backend dev server

# Building
pnpm build                     # Build all packages
pnpm --filter web build        # Build frontend only
pnpm --filter api build        # Build backend only

# Testing
pnpm test                      # Run all tests
pnpm --filter web test         # Frontend unit tests
pnpm --filter api test         # Backend unit tests
pnpm --filter web test:e2e     # Playwright E2E tests

# Contracts (from packages/contracts/)
forge test                     # Run contract tests
forge test -vvv                # Verbose output
forge test --match-path test/VSCToken.t.sol  # Single test file
forge coverage                 # Coverage report
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast

# Linting and type checking
pnpm lint
pnpm typecheck
```

## Monorepo Structure

```
apps/
  web/                    # React game client (PixiJS)
  api/                    # Fastify backend
packages/
  contracts/              # Solidity smart contracts (Foundry)
  sdk/                    # Shared TypeScript types and contract ABIs
  config/                 # Shared ESLint, TypeScript, Tailwind configs
docs/
  specs/                  # Technical specifications (01-10)
  GDD.md                  # Game Design Document
  WHITEPAPER.md           # Tokenomics Whitepaper
  TASK_BREAKDOWN.md       # Implementation tasks
```

## Architecture

### Frontend (apps/web/)
- **Game Engine:** PixiJS v8 with ECS-like architecture (Entity Manager, Systems Manager, Scene Manager)
- **State:** Zustand stores (`gameStore`, `playerStore`, `sessionStore`)
- **Web3:** wagmi v2 hooks for contract interactions
- **Components:** `components/game/` (gameplay), `components/meta/` (staking/upgrades), `components/wallet/` (Web3)

### Backend (apps/api/)
- **Routes:** `/api/auth`, `/api/game`, `/api/rewards`, `/api/player`, `/api/farcaster`
- **Services:** `rewardCalculator`, `rewardSigner`, `antiFraud`, `sessionManager`
- **Jobs:** BullMQ workers for leaderboard updates, maintenance decay monitoring
- **Database:** PostgreSQL with tables for `players`, `game_sessions`, `session_heartbeats`, `daily_rewards`, `achievements`

### Smart Contracts (packages/contracts/)
- **Tokens:** `VSCToken` (ERC-20, 100B max), `GearToken` (ERC-20, 6 instances for gear types)
- **Trading:** `BondingCurve` (polynomial AMM for VSC<->ETH and GEAR<->VSC)
- **Staking:** `GearStaking` (stake gear tokens for stat bonuses), `MaintenancePool` (weekly decay mechanics)
- **Rewards:** `RewardDistributor` (backend-signed claims)
- **NFTs:** `GlobalUpgradeNFT` (ERC-1155), `EarlyAdopterNFT` (ERC-721)

## Naming Conventions

| Type                | Convention        | Example             |
| ------------------- | ----------------- | ------------------- |
| TypeScript files    | camelCase.ts      | `gameEngine.ts`     |
| React components    | PascalCase.tsx    | `GearSlot.tsx`      |
| Solidity contracts  | PascalCase.sol    | `BondingCurve.sol`  |
| Test files          | *.test.ts/*.t.sol | `rewards.test.ts`   |
| Directories         | kebab-case        | `game-engine/`      |
| React hooks         | useCamelCase      | `useGearStaking`    |
| Database tables     | snake_case        | `player_sessions`   |
| API routes          | kebab-case        | `/api/game-session` |

## Smart Contract Requirements

1. ALL contracts implement `Pausable` from OpenZeppelin
2. Use Solidity `^0.8.24` exactly (no floating pragma)
3. Use custom errors instead of require strings
4. Use `Ownable2Step` for admin functions
5. Follow Check-Effects-Interactions pattern
6. Code organization: Constants, Immutables, State, Events, Errors, Modifiers, Constructor, External, Public, Internal, Private, View/Pure

## Token Economics Reference

| Token   | Purpose             | Supply                  |
| ------- | ------------------- | ----------------------- |
| $VSC    | Primary currency    | 100B max                |
| $WEAPON | Gear - damage       | Uncapped (bonding curve)|
| $ARMOR  | Gear - defense      | Uncapped (bonding curve)|
| $POWER  | Gear - AoE          | Uncapped (bonding curve)|
| $GLOVES | Gear - attack speed | Uncapped (bonding curve)|
| $AMULET | Gear - XP gain      | Uncapped (bonding curve)|
| $BOOTS  | Gear - move speed   | Uncapped (bonding curve)|

Fee structure: Buy 2% (60% treasury / 40% burn), Sell 3% (60% treasury / 40% burn), Stake 5% (treasury)

## Key Specifications

For detailed specifications, refer to:
- **Gameplay mechanics:** `docs/GDD.md`
- **Token economics:** `docs/WHITEPAPER.md`
- **Contract interfaces:** `docs/specs/04-SMART_CONTRACTS.md`
- **Frontend architecture:** `docs/specs/05-FRONTEND.md`
- **Backend API/DB schema:** `docs/specs/06-BACKEND.md`
- **Testing requirements:** `docs/specs/07-TESTING.md`

## Versioning

Use semantic versioning with `npm version` and bump version on every commit.

## Repository

https://github.com/PatrionDigital/SURVIVOR.git
