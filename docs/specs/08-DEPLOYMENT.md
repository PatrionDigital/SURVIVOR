# 08 - Deployment Procedures

## Overview

This document covers deployment procedures for smart contracts, frontend, and backend services across testnet and mainnet environments.

## Environment Overview

| Environment | Chain        | Purpose     |
| ----------- | ------------ | ----------- |
| Local       | Anvil        | Development |
| Testnet     | Base Sepolia | Testing, QA |
| Mainnet     | Base         | Production  |

## Smart Contract Deployment

### Deployment Order

Contracts must be deployed in this exact order due to dependencies:

```text
1. VSCToken
2. GearToken (×6 instances)
3. BondingCurve (VSC-ETH)
4. BondingCurve (Gear-VSC) (×6 instances)
5. GearStaking
6. MaintenancePool
7. RewardDistributor
8. GlobalUpgradeNFT
9. EarlyAdopterNFT
10. Configure permissions
11. Mint initial allocations
```

### Deployment Script

```solidity
// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {VSCToken} from "../src/tokens/VSCToken.sol";
import {GearToken} from "../src/tokens/GearToken.sol";
import {BondingCurve} from "../src/bonding/BondingCurve.sol";
import {GearStaking} from "../src/staking/GearStaking.sol";
import {MaintenancePool} from "../src/staking/MaintenancePool.sol";
import {RewardDistributor} from "../src/rewards/RewardDistributor.sol";
import {GlobalUpgradeNFT} from "../src/nfts/GlobalUpgradeNFT.sol";
import {EarlyAdopterNFT} from "../src/nfts/EarlyAdopterNFT.sol";

contract Deploy is Script {
    // Deployment addresses (set after deployment)
    VSCToken public vscToken;
    GearToken[6] public gearTokens;
    BondingCurve public vscCurve;
    BondingCurve[6] public gearCurves;
    GearStaking public gearStaking;
    MaintenancePool public maintenancePool;
    RewardDistributor public rewardDistributor;
    GlobalUpgradeNFT public globalUpgradeNFT;
    EarlyAdopterNFT public earlyAdopterNFT;

    // Configuration
    address public treasury;
    address public rewardSigner;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        treasury = vm.envAddress("TREASURY_ADDRESS");
        rewardSigner = vm.envAddress("REWARD_SIGNER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VSCToken
        vscToken = new VSCToken();

        // 2. Deploy GearTokens
        string[6] memory names = ["Weapon Core", "Armor Plate", "Power Belt", "Combat Gloves", "Amulet", "Swift Boots"];
        string[6] memory symbols = ["WEAPON", "ARMOR", "POWER", "GLOVES", "AMULET", "BOOTS"];

        for (uint256 i = 0; i < 6; i++) {
            gearTokens[i] = new GearToken(names[i], symbols[i]);
        }

        // 3. Deploy VSC-ETH BondingCurve
        vscCurve = new BondingCurve(
            address(vscToken),
            address(0), // ETH as base
            treasury
        );

        // 4. Deploy Gear-VSC BondingCurves
        for (uint256 i = 0; i < 6; i++) {
            gearCurves[i] = new BondingCurve(
                address(gearTokens[i]),
                address(vscToken),
                treasury
            );

            // Set bonding curve as minter for gear token
            gearTokens[i].setBondingCurve(address(gearCurves[i]));
        }

        // 5. Deploy GearStaking
        address[6] memory gearTokenAddresses;
        for (uint256 i = 0; i < 6; i++) {
            gearTokenAddresses[i] = address(gearTokens[i]);
        }
        gearStaking = new GearStaking(gearTokenAddresses, treasury);

        // 6. Deploy MaintenancePool
        maintenancePool = new MaintenancePool(
            address(vscToken),
            address(gearStaking)
        );

        // 7. Deploy RewardDistributor
        rewardDistributor = new RewardDistributor(
            address(vscToken),
            rewardSigner
        );

        // 8. Deploy GlobalUpgradeNFT
        globalUpgradeNFT = new GlobalUpgradeNFT(address(vscToken));

        // 9. Deploy EarlyAdopterNFT
        earlyAdopterNFT = new EarlyAdopterNFT(rewardSigner);

        // 10. Configure permissions
        vscToken.setMinter(address(vscCurve), true);
        vscToken.setMinter(address(rewardDistributor), true);

        vm.stopBroadcast();

        // Log deployed addresses
        _logAddresses();
    }

    function _logAddresses() internal view {
        console.log("=== Deployed Addresses ===");
        console.log("VSCToken:", address(vscToken));
        console.log("VSC BondingCurve:", address(vscCurve));
        for (uint256 i = 0; i < 6; i++) {
            console.log("GearToken", i, ":", address(gearTokens[i]));
            console.log("GearCurve", i, ":", address(gearCurves[i]));
        }
        console.log("GearStaking:", address(gearStaking));
        console.log("MaintenancePool:", address(maintenancePool));
        console.log("RewardDistributor:", address(rewardDistributor));
        console.log("GlobalUpgradeNFT:", address(globalUpgradeNFT));
        console.log("EarlyAdopterNFT:", address(earlyAdopterNFT));
    }
}
```

### Initial Allocation Script

```solidity
// script/MintInitialAllocation.s.sol
contract MintInitialAllocation is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address vscToken = vm.envAddress("VSC_TOKEN_ADDRESS");
        address vestingContract = vm.envAddress("VESTING_CONTRACT_ADDRESS");
        address treasuryMultisig = vm.envAddress("TREASURY_MULTISIG_ADDRESS");
        address bondingCurve = vm.envAddress("BONDING_CURVE_ADDRESS");
        address merkleDistributor = vm.envAddress("MERKLE_DISTRIBUTOR_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        VSCToken token = VSCToken(vscToken);

        // Team & Advisors: 24B to vesting
        token.mint(vestingContract, 24_000_000_000 * 1e18);

        // Treasury: 24B to multisig
        token.mint(treasuryMultisig, 24_000_000_000 * 1e18);

        // Liquidity: 6B to bonding curve
        token.mint(bondingCurve, 6_000_000_000 * 1e18);

        // Airdrop: 4B to merkle distributor
        token.mint(merkleDistributor, 4_000_000_000 * 1e18);

        vm.stopBroadcast();
    }
}
```

### Deployment Commands

```bash
# Local (Anvil)
anvil &
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Testnet (Base Sepolia)
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# Mainnet (Base)
forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  --slow  # Wait for confirmations
```

### Contract Verification

```bash
# Verify on BaseScan
forge verify-contract \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor()") \
  $CONTRACT_ADDRESS \
  src/tokens/VSCToken.sol:VSCToken \
  --etherscan-api-key $BASESCAN_API_KEY
```

---

## Frontend Deployment

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/.well-known/(.*)",
      "headers": [{ "key": "Access-Control-Allow-Origin", "value": "*" }]
    }
  ]
}
```

### Environment Variables (Vercel)

```env
VITE_CHAIN_ID=8453
VITE_VSC_TOKEN_ADDRESS=0x...
VITE_GEAR_STAKING_ADDRESS=0x...
VITE_BONDING_CURVE_ADDRESS=0x...
VITE_MAINTENANCE_POOL_ADDRESS=0x...
VITE_REWARD_DISTRIBUTOR_ADDRESS=0x...
VITE_GLOBAL_UPGRADE_NFT_ADDRESS=0x...
VITE_EARLY_ADOPTER_NFT_ADDRESS=0x...
VITE_API_URL=https://api.farcastersurvivors.game
VITE_FARCASTER_CLIENT_ID=...
```

### Deployment Steps

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

---

## Backend Deployment

### Railway Configuration

```yaml
# railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS", "buildCommand": "pnpm --filter api build" },
  "deploy":
    {
      "startCommand": "pnpm --filter api start",
      "healthcheckPath": "/health",
      "healthcheckTimeout": 30,
    },
}
```

### Environment Variables (Railway)

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
JWT_SECRET=...

# Blockchain
REWARD_SIGNER_PRIVATE_KEY=0x...
RPC_URL=https://mainnet.base.org

# Farcaster
FARCASTER_APP_FID=...
FARCASTER_APP_MNEMONIC=...

# Monitoring
SENTRY_DSN=https://...
```

### Database Migrations

```bash
# Run migrations
pnpm --filter api migrate

# Seed initial data (if needed)
pnpm --filter api seed
```

---

## Testnet vs Mainnet

### Critical Differences

| Aspect            | Testnet               | Mainnet           |
| ----------------- | --------------------- | ----------------- |
| Chain             | Base Sepolia (84532)  | Base (8453)       |
| Tokens            | Test tokens, no value | Real tokens       |
| Progress          | Resets before mainnet | Permanent         |
| Early Adopter NFT | NOT distributed       | Distributed       |
| Airdrop           | Test claim only       | Real distribution |
| RPC               | Public endpoints      | Private/paid RPC  |

### Testnet Reset Policy

**CRITICAL:** All testnet progress is reset before mainnet launch.

- Test $VSC and gear tokens have no value
- Staking positions are cleared
- Achievements are reset
- Leaderboards are cleared
- Early Adopter NFTs are NOT distributed on testnet

This must be clearly communicated to users.

---

## Mainnet Deployment Checklist

### Pre-Deployment Checklist

- [ ] All contracts pass 100% test coverage
- [ ] Invariant tests pass
- [ ] Manual testing on testnet complete
- [ ] Security review complete
- [ ] Treasury multisig configured
- [ ] Reward signer key secured
- [ ] RPC provider configured (Alchemy/QuickNode)
- [ ] Monitoring configured (Sentry)

### Contract Deployment Checklist

- [ ] Deploy all contracts in order
- [ ] Verify all contracts on BaseScan
- [ ] Configure all permissions
- [ ] Mint initial allocations
- [ ] Seed bonding curves with liquidity
- [ ] Test all contract functions

### Frontend Deployment Checklist

- [ ] Update environment variables
- [ ] Deploy to Vercel
- [ ] Verify Farcaster manifest
- [ ] Test wallet connection
- [ ] Test all contract interactions

### Backend Deployment Checklist

- [ ] Run database migrations
- [ ] Deploy to Railway
- [ ] Verify health check
- [ ] Test all API endpoints
- [ ] Configure rate limiting

### Post-Deployment Checklist

- [ ] Monitor contract events
- [ ] Monitor API health
- [ ] Monitor error rates
- [ ] Enable airdrop claims
- [ ] Announce launch

---

## Rollback Procedures

### Smart Contracts

Contracts are immutable. In case of issues:

1. **Pause affected contracts** using `pause()` function
2. **Assess the issue** and determine fix
3. **Options:**
   - Minor fix: Deploy updated contract and migrate state
   - Critical bug: Pause indefinitely, deploy new system
   - Economic issue: Adjust parameters via governance

### Frontend

```bash
# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Backend

```bash
# Railway automatic rollbacks
# Or manually redeploy previous commit
git revert HEAD
git push
```

---

## Monitoring

### Contract Monitoring

- **Events:** Monitor all contract events via The Graph or custom indexer
- **Balances:** Track treasury, bonding curve reserves
- **Transactions:** Alert on large transactions or unusual patterns

### API Monitoring

- **Health checks:** `/health` endpoint every 30s
- **Error rates:** Alert if >1% error rate
- **Latency:** Alert if P95 >500ms
- **Database:** Monitor connection pool, query times

### Application Monitoring

- **Sentry:** Error tracking and performance
- **Custom metrics:** Active sessions, rewards claimed, trades executed
- **Alerts:** PagerDuty/Slack integration for critical issues
