# Phase 6: Testnet-First Deployment Design

## Goal

Deploy the full Farcaster Survivors stack to Base Sepolia testnet with automated CI/CD, environment configuration, and post-deployment verification.

## Architecture

Three independent deployment layers, each deployed in order:

| Layer           | Target          | Platform                 | Config         |
| --------------- | --------------- | ------------------------ | -------------- |
| Smart Contracts | Base Sepolia    | Foundry (`forge script`) | `.env.testnet` |
| Backend API     | Railway staging | Railway (Nixpacks)       | `railway.json` |
| Frontend        | Vercel preview  | Vercel (Vite)            | `vercel.json`  |

## What Already Exists

- `Deploy.s.sol` — VSCToken + 6 GearTokens + 6 BondingCurves + initial allocations
- `DeployStaking.s.sol`, `DeployRewards.s.sol`, `DeployNFTs.s.sol` — stub scripts (TODOs, contracts not yet implemented)
- `.github/workflows/ci.yml` — lint, typecheck, test, build, artifact upload
- `docker-compose.yml` — local Postgres, Redis, Anvil
- `.env.example` — all env vars documented
- 3 DB migrations in `apps/api/src/db/migrations/`

## What We Need

### 1. Deployment Configs

- `vercel.json` — build command, output dir, rewrites, security headers
- `railway.json` — build/start commands, health check
- `.env.testnet` — template with Base Sepolia addresses (committed, no secrets)
- `.env.mainnet` — template with Base Mainnet addresses (committed, no secrets)

### 2. Database Migration

- `004_add_fraud_flags.sql` — fraud_flags table for anti-cheat system (referenced in game routes but missing from schema)

### 3. Deploy Verification Script

- `scripts/verify-deployment.sh` — post-deploy smoke test that checks:
  - Contract deployment (cast call to verify token name/symbol)
  - API health endpoint
  - Frontend accessibility

### 4. CD Workflow

- `.github/workflows/deploy.yml` — triggered on merge to main
  - Deploy frontend to Vercel (using Vercel CLI)
  - Deploy backend to Railway (using Railway CLI)
  - Run verification script

### 5. Testnet Deploy Orchestration

- `scripts/deploy-testnet.sh` — chains all Foundry deploy scripts in order
  - Deploy contracts, log addresses
  - Output env vars for frontend/backend config

### 6. Monitoring

- Enhanced `/health` endpoint with DB + Redis connectivity checks
- Structured logging for production

## Deployment Flow (Testnet)

```
1. Run scripts/deploy-testnet.sh
   → Deploys contracts to Base Sepolia
   → Outputs deployed addresses

2. Update .env with deployed addresses
   → Configure Vercel env vars
   → Configure Railway env vars

3. Push to main (or merge PR)
   → CI runs (lint, test, build)
   → CD deploys frontend + backend

4. Run scripts/verify-deployment.sh
   → Smoke tests all services
```

## Not In Scope (Mainnet — future task)

- Treasury multisig setup
- Security audit
- Mainnet contract deployment
- Production monitoring (Sentry, PagerDuty)
- Staking/Rewards/NFT contract deployment (contracts not implemented)
