# 02 - Technology Stack

## Frontend (Game Client)

| Category         | Technology             | Version           |
| ---------------- | ---------------------- | ----------------- |
| Framework        | React                  | 18+               |
| Build Tool       | Vite                   | 5+                |
| Language         | TypeScript             | 5+ (strict mode)  |
| Styling          | Tailwind CSS           | 3+                |
| State Management | Zustand                | 4+                |
| Game Rendering   | PixiJS                 | v8 (WebGL/WebGPU) |
| Web3             | wagmi                  | v2                |
| Ethereum Utils   | viem                   | 2+                |
| Farcaster        | @farcaster/miniapp-sdk | latest            |

### Frontend Package Selection Rationale

**PixiJS v8** - Chosen for:

- WebGL/WebGPU support for high-performance 2D rendering
- Lightweight bundle size
- Excellent mobile performance
- Large ecosystem and documentation

**Zustand** - Chosen for:

- Minimal boilerplate
- TypeScript-native
- No provider wrappers needed
- Simple API for game state

**wagmi v2 + viem** - Chosen for:

- Type-safe contract interactions
- Modern hooks-based API
- Active maintenance
- Built-in Farcaster wallet support

## Backend (API Server)

| Category          | Technology     | Version |
| ----------------- | -------------- | ------- |
| Runtime           | Node.js        | 20+ LTS |
| Framework         | Fastify        | 4+      |
| Language          | TypeScript     | 5+      |
| Database          | PostgreSQL     | 16      |
| Database Platform | Supabase       | -       |
| Cache             | Redis          | 7+      |
| Cache Platform    | Upstash        | -       |
| Queue             | BullMQ         | 5+      |
| Validation        | Zod            | 3+      |
| Auth              | Farcaster SIWF | -       |

### Backend Package Selection Rationale

**Fastify** - Chosen for:

- High performance (benchmarks show 2x faster than Express)
- Built-in schema validation
- TypeScript support
- Plugin architecture

**Supabase** - Chosen for:

- PostgreSQL with realtime subscriptions
- Built-in auth (optional)
- Easy setup and scaling
- Row-level security

**Upstash** - Chosen for:

- Serverless Redis
- Pay-per-request pricing
- Global edge deployment
- BullMQ compatible

## Smart Contracts

| Category   | Technology             | Version |
| ---------- | ---------------------- | ------- |
| Language   | Solidity               | ^0.8.24 |
| Framework  | Foundry                | latest  |
| Standards  | OpenZeppelin Contracts | v5.x    |
| Testing    | Foundry test suite     | -       |
| Deployment | forge script + CREATE2 | -       |

### Contract Development Tools

```bash
# Foundry toolchain
forge    # Build and test contracts
cast     # Interact with contracts
anvil    # Local testnet
chisel   # Solidity REPL
```

### OpenZeppelin Imports

```solidity
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
```

## Infrastructure

| Service          | Provider            | Purpose                      |
| ---------------- | ------------------- | ---------------------------- |
| Frontend Hosting | Vercel              | Static site + edge functions |
| Backend Hosting  | Railway             | Node.js API server           |
| Database         | Supabase            | PostgreSQL + realtime        |
| Cache/Queue      | Upstash             | Redis + BullMQ               |
| Monitoring       | Sentry              | Error tracking               |
| Analytics        | Farcaster Analytics | Mini App metrics             |
| RPC              | Alchemy / QuickNode | Base L2 access               |

## Development Tools

| Tool           | Purpose                       |
| -------------- | ----------------------------- |
| pnpm           | Package management (monorepo) |
| Turborepo      | Monorepo build orchestration  |
| ESLint         | Code linting                  |
| Prettier       | Code formatting               |
| TypeScript     | Type checking                 |
| Vitest         | Frontend/backend unit tests   |
| Playwright     | E2E testing                   |
| GitHub Actions | CI/CD                         |

## Version Pinning

All major dependencies should be pinned to specific versions in `package.json`:

```json
{
  "dependencies": {
    "react": "18.2.0",
    "pixi.js": "8.0.0",
    "wagmi": "2.5.0",
    "viem": "2.7.0",
    "zustand": "4.5.0",
    "@farcaster/miniapp-sdk": "^0.1.0"
  }
}
```

## Browser Support

| Browser        | Minimum Version |
| -------------- | --------------- |
| Chrome         | 90+             |
| Firefox        | 90+             |
| Safari         | 15+             |
| Edge           | 90+             |
| Mobile Safari  | iOS 15+         |
| Chrome Android | 90+             |

WebGL 2.0 required for game rendering.
