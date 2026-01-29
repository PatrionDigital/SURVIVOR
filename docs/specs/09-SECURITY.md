# 09 - Security Requirements

## Overview

Security is paramount for a crypto-native game handling real value. This document outlines security requirements across all system layers.

## Smart Contract Security

### Mandatory Patterns

All contracts MUST implement:

| Pattern         | Purpose                 | Implementation                   |
| --------------- | ----------------------- | -------------------------------- |
| Pausable        | Emergency stop          | OpenZeppelin `Pausable`          |
| Ownable2Step    | Safe ownership transfer | OpenZeppelin `Ownable2Step`      |
| ReentrancyGuard | Prevent reentrancy      | OpenZeppelin `ReentrancyGuard`   |
| Custom Errors   | Gas-efficient reverts   | Custom error definitions         |
| CEI Pattern     | Safe state changes      | Check-Effects-Interactions order |

### Code Requirements

```solidity
// REQUIRED: Use exact pragma
pragma solidity ^0.8.24;

// REQUIRED: Import from OpenZeppelin
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// REQUIRED: Custom errors (not require strings)
error NotAuthorized();
error InsufficientBalance();
error ZeroAddress();

// REQUIRED: Check-Effects-Interactions pattern
function withdraw(uint256 amount) external nonReentrant {
    // CHECK
    if (balances[msg.sender] < amount) revert InsufficientBalance();

    // EFFECT
    balances[msg.sender] -= amount;

    // INTERACTION
    (bool success,) = msg.sender.call{value: amount}("");
    require(success);
}
```

### Forbidden Patterns

| Pattern                   | Risk                      | Alternative                   |
| ------------------------- | ------------------------- | ----------------------------- |
| `tx.origin` for auth      | Phishing attacks          | Use `msg.sender`              |
| Unbounded loops           | DoS via gas               | Pagination or limits          |
| Assembly without need     | Bugs, auditing difficulty | Solidity native               |
| Delegatecall to untrusted | Arbitrary code execution  | Whitelist targets             |
| Hardcoded addresses       | Inflexibility             | Use `immutable` or `constant` |
| Floating pragma           | Version inconsistency     | Exact version `^0.8.24`       |

### Access Control

```solidity
// Multi-tier access control
contract SecureContract is Ownable2Step, Pausable {
    mapping(address => bool) public operators;

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) {
            revert NotAuthorized();
        }
        _;
    }

    // Owner can add/remove operators
    function setOperator(address op, bool authorized) external onlyOwner {
        operators[op] = authorized;
    }

    // Operators can perform daily operations
    function operatorAction() external onlyOperator whenNotPaused {
        // ...
    }

    // Only owner can pause/unpause
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

### Signature Verification

```solidity
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract RewardDistributor {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public authorizedSigner;
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    function claim(
        uint256 amount,
        uint8 rewardType,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external {
        // Check expiry
        if (block.timestamp > expiry) revert ClaimExpired();

        // Check nonce
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed();

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            amount,
            rewardType,
            nonce,
            expiry
        ));

        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);

        if (signer != authorizedSigner) revert InvalidSignature();

        // Mark nonce as used
        usedNonces[msg.sender][nonce] = true;

        // Mint rewards
        token.mint(msg.sender, amount);
    }
}
```

---

## Backend Security

### Mandatory Requirements

| Requirement              | Implementation                         |
| ------------------------ | -------------------------------------- |
| Rate limiting            | `@fastify/rate-limit` on all endpoints |
| Input validation         | Zod schemas for all inputs             |
| SQL injection prevention | Parameterized queries only             |
| JWT security             | Short expiry, rotation, secure storage |
| CORS                     | Restrict to known origins              |
| Request signing          | HMAC for sensitive operations          |

### Rate Limiting Configuration

```typescript
// middleware/rateLimit.ts
import rateLimit from "@fastify/rate-limit";

export const rateLimitConfig = {
  global: true,
  max: 100,
  timeWindow: "1 minute",
  redis: redisClient,
  keyGenerator: (request) => {
    return request.user?.playerId ?? request.ip;
  },
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: "Rate limit exceeded. Please try again later.",
  }),
};

// Stricter limits for sensitive endpoints
export const sensitiveRateLimits = {
  "/api/rewards/claim": { max: 10, timeWindow: "1 minute" },
  "/api/game/session/start": { max: 5, timeWindow: "1 minute" },
  "/api/auth/verify": { max: 10, timeWindow: "5 minutes" },
};
```

### Input Validation

```typescript
// Always validate with Zod
import { z } from 'zod';

const sessionEndSchema = z.object({
  sessionId: z.string().uuid(),
  survivalTime: z.number().int().min(0).max(7200), // Max 2 hours
  enemiesKilled: z.number().int().min(0).max(100000),
  xpCollected: z.number().int().min(0).max(10000000),
  levelReached: z.number().int().min(1).max(100),
  weaponsUsed: z.array(z.string()).max(6),
  passivesUsed: z.array(z.string()).max(6),
});

fastify.post('/session/end', {
  schema: { body: sessionEndSchema },
  handler: async (request, reply) => {
    // Body is validated and typed
    const { sessionId, survivalTime, ... } = request.body;
  },
});
```

### SQL Injection Prevention

```typescript
// ALWAYS use parameterized queries

// ✅ CORRECT: Parameterized query
const player = await db.query("SELECT * FROM players WHERE address = $1", [address]);

// ❌ WRONG: String interpolation
const player = await db.query(`SELECT * FROM players WHERE address = '${address}'`);

// ✅ CORRECT: Using query builder
const player = await db.selectFrom("players").where("address", "=", address).executeTakeFirst();
```

### JWT Security

```typescript
// Short-lived tokens with refresh
const tokenConfig = {
  accessToken: {
    expiresIn: "15m",
    algorithm: "HS256",
  },
  refreshToken: {
    expiresIn: "7d",
    algorithm: "HS256",
  },
};

// Verify and decode
fastify.decorate("authenticate", async (request, reply) => {
  try {
    const decoded = await request.jwtVerify();

    // Check if token is blacklisted (on logout)
    const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
    if (isBlacklisted) {
      throw new Error("Token revoked");
    }

    request.user = decoded;
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
  }
});
```

### Frontend Forbidden Practices

| Practice                       | Risk               | Alternative                             |
| ------------------------------ | ------------------ | --------------------------------------- |
| Storing private keys in code   | Key exposure       | Environment variables + secrets manager |
| Logging sensitive data         | Data leak          | Sanitize logs                           |
| `eval()` or dynamic code       | Code injection     | Static code paths                       |
| Trusting client data           | Data manipulation  | Server-side validation                  |
| Storing passwords in plaintext | Account compromise | bcrypt/argon2 hashing                   |

---

## Frontend Security

### Frontend Mandatory Requirements

| Requirement            | Implementation                 |
| ---------------------- | ------------------------------ |
| Input sanitization     | Sanitize all user inputs       |
| Transaction validation | Validate params before signing |
| Transaction preview    | Show clear previews            |
| Error handling         | Graceful wallet error handling |
| HTTPS only             | Force HTTPS in production      |

### Transaction Safety

```typescript
// Always validate and preview transactions
async function stakeGear(slot: number, amount: bigint) {
  // 1. Validate inputs
  if (slot < 0 || slot > 5) {
    throw new Error("Invalid slot");
  }
  if (amount <= 0n) {
    throw new Error("Amount must be positive");
  }

  // 2. Check balance
  const balance = await getGearBalance(slot);
  if (balance < amount) {
    throw new Error("Insufficient balance");
  }

  // 3. Estimate gas
  const gasEstimate = await estimateGas({
    address: GEAR_STAKING_ADDRESS,
    abi: gearStakingAbi,
    functionName: "stake",
    args: [slot, amount],
  });

  // 4. Show confirmation dialog
  const confirmed = await showConfirmDialog({
    action: "Stake Gear",
    amount: formatUnits(amount, 18),
    token: GEAR_NAMES[slot],
    estimatedGas: formatEther(gasEstimate * gasPrice),
  });

  if (!confirmed) return;

  // 5. Execute transaction
  const hash = await writeContract({
    address: GEAR_STAKING_ADDRESS,
    abi: gearStakingAbi,
    functionName: "stake",
    args: [slot, amount],
  });

  // 6. Wait for confirmation
  await waitForTransaction({ hash });
}
```

### Content Security Policy

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    {
      name: "csp",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader(
            "Content-Security-Policy",
            [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // Required for Vite
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.base.org wss://*.farcaster.xyz",
              "frame-ancestors 'self' https://*.farcaster.xyz",
            ].join("; ")
          );
          next();
        });
      },
    },
  ],
});
```

### Forbidden Practices

| Practice                    | Risk                | Alternative                  |
| --------------------------- | ------------------- | ---------------------------- |
| Storing private keys        | Key theft           | Never store keys, use wallet |
| Exposing sensitive env vars | Credential leak     | Only VITE\_ prefixed vars    |
| Inline scripts without CSP  | XSS attacks         | Proper CSP headers           |
| Trusting URL parameters     | Parameter injection | Validate all URL params      |
| Direct DOM manipulation     | XSS attacks         | Use React's safe APIs        |

---

## Wallet Security

### Best Practices

```typescript
// Never request more than needed
const REQUIRED_PERMISSIONS = ["eth_accounts", "eth_chainId"];

// Always verify chain before transactions
async function ensureCorrectChain() {
  const chainId = await getChainId();
  const expectedChain = import.meta.env.VITE_CHAIN_ID;

  if (chainId !== parseInt(expectedChain)) {
    await switchChain({ chainId: parseInt(expectedChain) });
  }
}

// Disconnect on logout
async function logout() {
  await disconnect();
  clearLocalStorage();
  navigateTo("/");
}
```

### Transaction Safety Checklist

Before any transaction:

1. ✅ Validate all input parameters
2. ✅ Check user has sufficient balance
3. ✅ Verify correct chain/network
4. ✅ Estimate gas and show to user
5. ✅ Show clear confirmation dialog
6. ✅ Handle wallet errors gracefully
7. ✅ Wait for transaction confirmation
8. ✅ Update UI after confirmation

---

## API Security

### Request Signing

```typescript
// For sensitive operations, require request signing
import { createHmac } from "crypto";

function signRequest(body: object, timestamp: number, secret: string): string {
  const payload = JSON.stringify(body) + timestamp.toString();
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// Middleware to verify signed requests
async function verifySignature(request, reply) {
  const signature = request.headers["x-signature"];
  const timestamp = parseInt(request.headers["x-timestamp"]);

  // Check timestamp is within 5 minutes
  if (Math.abs(Date.now() - timestamp) > 300000) {
    return reply.status(401).send({ error: "Request expired" });
  }

  const expectedSignature = signRequest(request.body, timestamp, process.env.API_SECRET);

  if (signature !== expectedSignature) {
    return reply.status(401).send({ error: "Invalid signature" });
  }
}
```

### CORS Configuration

```typescript
// Only allow known origins
const corsConfig = {
  origin: [
    "https://farcastersurvivors.game",
    "https://www.farcastersurvivors.game",
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:5173"] : []),
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Signature", "X-Timestamp"],
  credentials: true,
};
```

---

## Incident Response

### Emergency Procedures

1. **Contract Exploit Detected**
   - Immediately pause affected contracts
   - Assess scope of damage
   - Notify community via Farcaster
   - Develop and test fix
   - Deploy fix (upgrade or migrate)
   - Unpause after verification

2. **API Compromise Detected**
   - Rotate all secrets immediately
   - Revoke all JWT tokens
   - Review access logs
   - Patch vulnerability
   - Force re-authentication

3. **Frontend Compromise Detected**
   - Roll back to previous deployment
   - Clear CDN cache
   - Notify users to clear browser cache
   - Investigate source of compromise

### Contact Points

- **Security Issues:** [security@farcastersurvivors.game](mailto:security@farcastersurvivors.game)
- **Emergency Multisig:** [Multisig address]
- **Discord:** [Security channel]

---

## Audit Recommendations

### Pre-Launch

- [ ] Internal security review
- [ ] Automated vulnerability scanning
- [ ] Manual code review
- [ ] Fuzzing and invariant testing

### Post-Launch (When Budget Allows)

- [ ] Professional smart contract audit
- [ ] Penetration testing
- [ ] Bug bounty program
