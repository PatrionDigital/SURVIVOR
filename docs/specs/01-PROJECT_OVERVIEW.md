# 01 - Project Overview

## Product Description

**Farcaster Survivors** is a crypto-native bullet heaven game built as a Farcaster Mini App on Base L2. Players control a character with auto-attacking weapons, survive waves of enemies, collect XP, and progress through gear-based meta-progression tied to on-chain tokens.

## Core Systems

| System           | Description                                                                            |
| ---------------- | -------------------------------------------------------------------------------------- |
| Game Engine      | Browser-based 2D survival game with auto-attack mechanics                              |
| Token Economy    | $VSC primary token + 6 gear tokens ($WEAPON, $ARMOR, $POWER, $GLOVES, $AMULET, $BOOTS) |
| Bonding Curves   | Self-deployed polynomial AMM for all token trading                                     |
| Meta-Progression | Gear staking system with maintenance mechanics                                         |
| Governance       | Futarchy-based parameter governance (activated 6 months post-launch)                   |
| Social           | Farcaster Mini App integration with notifications and social graph                     |

## Target Platforms

- **Primary:** Farcaster Mini Apps (Warpcast, Base app, Supercast)
- **Blockchain:** Base L2 (mainnet) with Base Sepolia for testnet
- **Supported Devices:** Mobile-first responsive design, desktop support

## Session Structure

- **Mode:** Survival Mode with linear difficulty scaling
- **Duration:** 10-30 minutes depending on player skill
- **Controls:** Movement only (auto-attack always active)
- **End Condition:** Death ends run, rewards calculated

## Key Features

### Gameplay

- Auto-attack combat system
- 6 weapon slots + 6 passive item slots
- Weapon evolution system
- Level-up choices during runs
- Never-ending survival with linear scaling

### Meta-Progression

- 6 gear slots with token staking
- Maintenance pool with weekly decay
- Global upgrade NFTs (ERC-1155)
- Early Adopter NFTs (ERC-721, transferable)

### Economy

- Self-deployed bonding curves (no DEX dependency)
- 60/40 treasury/burn fee split
- Gameplay-driven emissions
- Futarchy governance for parameters

### Social

- Farcaster Mini App SDK integration
- In-app notifications
- Cast sharing for achievements
- Leaderboards (daily, weekly, all-time)

## Version History

| Version | Changes                                                                        |
| ------- | ------------------------------------------------------------------------------ |
| v1.0    | Initial design with Farcaster Frames v2                                        |
| v2.0    | Migrated to Mini Apps SDK, 100B supply, self-deployed curves, hybrid rarity    |
| v2.1    | Added pausable contracts, testnet soft-launch, transferable Early Adopter NFTs |
| v2.2    | Single binary futarchy model, TWAP settlement, dynamic multi-sig via Hats      |
