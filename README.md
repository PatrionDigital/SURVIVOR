# Farcaster Survivors

A crypto-native bullet heaven game built as a Farcaster Mini App on Base L2.

## Overview

Players control a character with auto-attacking weapons, survive waves of enemies, and progress through gear-based meta-progression tied to on-chain tokens.

## Tech Stack

- **Frontend:** React 18 + Vite + PixiJS v8 + TypeScript
- **Backend:** Fastify + PostgreSQL (Supabase) + Redis (Upstash)
- **Contracts:** Solidity ^0.8.24 + Foundry
- **Web3:** wagmi v2 + viem
- **Chain:** Base L2

## Getting Started

```bash
# Install dependencies
pnpm install

# Run frontend dev server
pnpm --filter web dev

# Run backend dev server
pnpm --filter api dev

# Run contract tests
cd packages/contracts && forge test
```

## Documentation

- [Game Design Document](docs/GDD.md)
- [Tokenomics Whitepaper](docs/WHITEPAPER.md)
- [Technical Specifications](docs/specs/)
- [Task Breakdown](docs/TASK_BREAKDOWN.md)

## Project Structure

```
apps/
  web/                    # React game client
  api/                    # Fastify backend
packages/
  contracts/              # Solidity smart contracts
  sdk/                    # Shared TypeScript SDK
  config/                 # Shared configs
docs/                     # Documentation
```

## License

[MIT](LICENSE)
