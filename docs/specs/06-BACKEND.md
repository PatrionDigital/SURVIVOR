# 06 - Backend Specifications

## API Architecture

```mermaid
┌─────────────────────────────────────────────────────────────────┐
│                         API ROUTES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /api/auth                                                      │
│    POST /verify          - Verify Farcaster SIWF               │
│    POST /refresh         - Refresh session                     │
│    POST /logout          - End session                         │
│                                                                 │
│  /api/game                                                      │
│    POST /session/start   - Start game session                  │
│    POST /session/end     - End session, calculate rewards      │
│    POST /session/heartbeat - Keep session alive                │
│    GET  /leaderboard     - Get leaderboards                    │
│                                                                 │
│  /api/rewards                                                   │
│    POST /claim           - Generate signed claim               │
│    GET  /pending         - Get unclaimed rewards               │
│    GET  /history         - Get reward history                  │
│                                                                 │
│  /api/player                                                    │
│    GET  /profile         - Get player profile                  │
│    GET  /stats           - Get gameplay stats                  │
│    GET  /achievements    - Get achievements                    │
│                                                                 │
│  /api/farcaster                                                 │
│    POST /webhook         - Farcaster webhook handler           │
│    POST /notification    - Send notification (internal)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(42) UNIQUE NOT NULL,
  fid INTEGER UNIQUE,
  username VARCHAR(255),
  display_name VARCHAR(255),
  pfp_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  survival_time INTEGER,          -- seconds
  enemies_killed INTEGER DEFAULT 0,
  xp_collected INTEGER DEFAULT 0,
  level_reached INTEGER DEFAULT 1,
  weapons_used JSONB,             -- array of weapon IDs
  passives_used JSONB,            -- array of passive IDs
  rewards_earned NUMERIC(78, 0),  -- $VSC amount (wei)
  rewards_claimed BOOLEAN DEFAULT FALSE,
  claim_signature TEXT,
  claim_nonce INTEGER,
  claim_expiry TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session heartbeats (for anti-fraud)
CREATE TABLE session_heartbeats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  player_x FLOAT,
  player_y FLOAT,
  player_health INTEGER,
  enemies_alive INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily rewards tracking
CREATE TABLE daily_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gameplay_rewards NUMERIC(78, 0) DEFAULT 0,
  login_bonus NUMERIC(78, 0) DEFAULT 0,
  social_rewards NUMERIC(78, 0) DEFAULT 0,
  total_claimed NUMERIC(78, 0) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, date)
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT FALSE,
  claim_signature TEXT,
  claim_nonce INTEGER,
  UNIQUE(player_id, achievement_type)
);

-- Leaderboard snapshots
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL,     -- daily, weekly, alltime
  period_start DATE NOT NULL,
  survival_time INTEGER,
  enemies_killed INTEGER,
  total_xp INTEGER,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, period, period_start)
);

-- Notification tokens (for Farcaster notifications)
CREATE TABLE notification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  fid INTEGER NOT NULL,
  token TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id)
);

-- Claim nonces (prevent replay attacks)
CREATE TABLE claim_nonces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  nonce INTEGER NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, nonce)
);

-- Indexes for performance
CREATE INDEX idx_sessions_player ON game_sessions(player_id);
CREATE INDEX idx_sessions_status ON game_sessions(status);
CREATE INDEX idx_sessions_started ON game_sessions(started_at);
CREATE INDEX idx_heartbeats_session ON session_heartbeats(session_id);
CREATE INDEX idx_daily_rewards_date ON daily_rewards(date);
CREATE INDEX idx_daily_rewards_player_date ON daily_rewards(player_id, date);
CREATE INDEX idx_leaderboard_period ON leaderboard_entries(period, period_start);
CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(period, period_start, rank);
CREATE INDEX idx_achievements_player ON achievements(player_id);
CREATE INDEX idx_nonces_player ON claim_nonces(player_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## API Route Implementations

### Authentication Routes

```typescript
// routes/auth.ts
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyFarcasterSignature } from "@/lib/farcaster";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Verify Farcaster SIWF
  fastify.post("/verify", {
    schema: {
      body: z.object({
        message: z.string(),
        signature: z.string(),
        fid: z.number(),
      }),
    },
    handler: async (request, reply) => {
      const { message, signature, fid } = request.body;

      // Verify signature
      const isValid = await verifyFarcasterSignature(message, signature, fid);
      if (!isValid) {
        return reply.status(401).send({ error: "Invalid signature" });
      }

      // Get or create player
      const player = await getOrCreatePlayer(fid);

      // Generate JWT
      const token = fastify.jwt.sign({
        playerId: player.id,
        fid: player.fid,
        address: player.address,
      });

      return { token, player };
    },
  });

  // Refresh session
  fastify.post("/refresh", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { playerId, fid, address } = request.user;

      const token = fastify.jwt.sign({ playerId, fid, address });

      return { token };
    },
  });

  // Logout
  fastify.post("/logout", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      // Invalidate any active sessions
      await invalidatePlayerSessions(request.user.playerId);
      return { success: true };
    },
  });
};

export default authRoutes;
```

### Game Session Routes

```typescript
// routes/game.ts
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { calculateRewards } from "@/services/rewardCalculator";
import { signRewardClaim } from "@/services/rewardSigner";
import { validateSession } from "@/services/antiFraud";

const gameRoutes: FastifyPluginAsync = async (fastify) => {
  // Start game session
  fastify.post("/session/start", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { playerId } = request.user;

      // Check for existing active session
      const existingSession = await getActiveSession(playerId);
      if (existingSession) {
        // Abandon old session
        await abandonSession(existingSession.id);
      }

      // Create new session
      const session = await createSession(playerId);

      return { sessionId: session.id };
    },
  });

  // End game session
  fastify.post("/session/end", {
    preHandler: [fastify.authenticate],
    schema: {
      body: z.object({
        sessionId: z.string().uuid(),
        survivalTime: z.number().int().min(0),
        enemiesKilled: z.number().int().min(0),
        xpCollected: z.number().int().min(0),
        levelReached: z.number().int().min(1),
        weaponsUsed: z.array(z.string()),
        passivesUsed: z.array(z.string()),
      }),
    },
    handler: async (request, reply) => {
      const { playerId, address } = request.user;
      const { sessionId, ...results } = request.body;

      // Verify session belongs to player
      const session = await getSession(sessionId);
      if (!session || session.player_id !== playerId) {
        return reply.status(404).send({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return reply.status(400).send({ error: "Session already ended" });
      }

      // Get heartbeats for validation
      const heartbeats = await getSessionHeartbeats(sessionId);

      // Validate session (anti-fraud)
      const validation = validateSession({ ...session, ...results }, heartbeats);
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.reason });
      }

      // Get player's on-chain data
      const gearPower = await getPlayerGearPower(address);
      const hasEarlyAdopterNFT = await checkEarlyAdopterNFT(address);

      // Calculate rewards
      const rewardBreakdown = calculateRewards({
        ...results,
        gearPower,
        hasEarlyAdopterNFT,
      });

      // Apply adjusted rewards if needed
      const finalRewards = validation.adjustedRewards ?? rewardBreakdown.total;

      // Apply diminishing returns
      const dailyClaimed = await getDailyClaimed(playerId);
      const adjustedRewards = applyDiminishingReturns(dailyClaimed, finalRewards);

      // Generate claim signature
      const nonce = await getNextNonce(playerId);
      const expiry = Math.floor(Date.now() / 1000) + 86400; // 24 hours

      const signature = await signRewardClaim({
        player: address as `0x${string}`,
        amount: adjustedRewards,
        rewardType: 0, // Gameplay
        nonce,
        expiry,
      });

      // Update session
      await completeSession(sessionId, {
        ...results,
        rewardsEarned: adjustedRewards.toString(),
        claimSignature: signature,
        claimNonce: nonce,
        claimExpiry: new Date(expiry * 1000),
      });

      // Update daily rewards
      await updateDailyRewards(playerId, adjustedRewards, "gameplay");

      return {
        rewards: adjustedRewards.toString(),
        breakdown: {
          base: rewardBreakdown.baseReward.toString(),
          timeBonus: rewardBreakdown.timeBonus.toString(),
          killBonus: rewardBreakdown.killBonus.toString(),
          levelBonus: rewardBreakdown.levelBonus.toString(),
          gearMultiplier: rewardBreakdown.gearMultiplier,
          earlyAdopterBonus: rewardBreakdown.earlyAdopterBonus.toString(),
        },
        signature,
        nonce,
        expiry,
      };
    },
  });

  // Session heartbeat
  fastify.post("/session/heartbeat", {
    preHandler: [fastify.authenticate],
    schema: {
      body: z.object({
        sessionId: z.string().uuid(),
        playerX: z.number(),
        playerY: z.number(),
        playerHealth: z.number().int(),
        enemiesAlive: z.number().int(),
      }),
    },
    handler: async (request, reply) => {
      const { playerId } = request.user;
      const { sessionId, ...data } = request.body;

      // Verify session
      const session = await getSession(sessionId);
      if (!session || session.player_id !== playerId || session.status !== "active") {
        return reply.status(400).send({ error: "Invalid session" });
      }

      // Record heartbeat
      await recordHeartbeat(sessionId, data);

      return { success: true };
    },
  });

  // Get leaderboard
  fastify.get("/leaderboard", {
    schema: {
      querystring: z.object({
        period: z.enum(["daily", "weekly", "alltime"]).default("weekly"),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
    handler: async (request, reply) => {
      const { period, limit, offset } = request.query;

      const entries = await getLeaderboard(period, limit, offset);
      const total = await getLeaderboardCount(period);

      return { entries, total, period };
    },
  });
};

export default gameRoutes;
```

### Reward Routes

```typescript
// routes/rewards.ts
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const rewardRoutes: FastifyPluginAsync = async (fastify) => {
  // Get pending (unclaimed) rewards
  fastify.get("/pending", {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { playerId } = request.user;

      const pendingSessions = await getPendingRewardSessions(playerId);
      const pendingAchievements = await getPendingAchievementRewards(playerId);

      return {
        sessions: pendingSessions.map((s) => ({
          sessionId: s.id,
          rewards: s.rewards_earned,
          signature: s.claim_signature,
          nonce: s.claim_nonce,
          expiry: s.claim_expiry,
        })),
        achievements: pendingAchievements.map((a) => ({
          type: a.achievement_type,
          signature: a.claim_signature,
          nonce: a.claim_nonce,
        })),
      };
    },
  });

  // Mark rewards as claimed
  fastify.post("/claim", {
    preHandler: [fastify.authenticate],
    schema: {
      body: z.object({
        sessionId: z.string().uuid().optional(),
        achievementType: z.string().optional(),
        txHash: z.string(),
      }),
    },
    handler: async (request, reply) => {
      const { playerId } = request.user;
      const { sessionId, achievementType, txHash } = request.body;

      if (sessionId) {
        await markSessionClaimed(sessionId, playerId, txHash);
      }

      if (achievementType) {
        await markAchievementClaimed(achievementType, playerId, txHash);
      }

      return { success: true };
    },
  });

  // Get reward history
  fastify.get("/history", {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
    handler: async (request, reply) => {
      const { playerId } = request.user;
      const { limit, offset } = request.query;

      const history = await getRewardHistory(playerId, limit, offset);
      const total = await getRewardHistoryCount(playerId);

      return { history, total };
    },
  });
};

export default rewardRoutes;
```

## Services

### Reward Calculator

```typescript
// services/rewardCalculator.ts

interface GameResults {
  survivalTime: number; // seconds
  enemiesKilled: number;
  xpCollected: number;
  levelReached: number;
  gearPower: number; // from chain
  hasEarlyAdopterNFT: boolean;
}

interface RewardBreakdown {
  baseReward: bigint;
  timeBonus: bigint;
  killBonus: bigint;
  levelBonus: bigint;
  gearMultiplier: number;
  earlyAdopterBonus: bigint;
  total: bigint;
}

export function calculateRewards(results: GameResults): RewardBreakdown {
  // Base reward: 1 $VSC per second survived
  const baseReward = BigInt(results.survivalTime) * BigInt(1e18);

  // Time bonus: Extra 0.5 $VSC per second after 5 minutes
  const timeBonus =
    results.survivalTime > 300 ? BigInt(results.survivalTime - 300) * BigInt(5e17) : 0n;

  // Kill bonus: 0.01 $VSC per enemy
  const killBonus = BigInt(results.enemiesKilled) * BigInt(1e16);

  // Level bonus: 10 $VSC per level reached
  const levelBonus = BigInt(results.levelReached) * BigInt(10e18);

  // Gear multiplier: 1 + (gearPower / 10000)
  const gearMultiplier = 1 + results.gearPower / 10000;

  // Subtotal before multipliers
  const subtotal = baseReward + timeBonus + killBonus + levelBonus;

  // Apply gear multiplier
  const withGear = BigInt(Math.floor(Number(subtotal) * gearMultiplier));

  // Early adopter bonus: 10%
  const earlyAdopterBonus = results.hasEarlyAdopterNFT ? withGear / 10n : 0n;

  const total = withGear + earlyAdopterBonus;

  return {
    baseReward,
    timeBonus,
    killBonus,
    levelBonus,
    gearMultiplier,
    earlyAdopterBonus,
    total,
  };
}
```

### Reward Signer

```typescript
// services/rewardSigner.ts
import { privateKeyToAccount } from "viem/accounts";
import { encodePacked, keccak256 } from "viem";

const SIGNER_PRIVATE_KEY = process.env.REWARD_SIGNER_PRIVATE_KEY!;
const signer = privateKeyToAccount(SIGNER_PRIVATE_KEY as `0x${string}`);

interface ClaimData {
  player: `0x${string}`;
  amount: bigint;
  rewardType: number;
  nonce: number;
  expiry: number;
}

export async function signRewardClaim(data: ClaimData): Promise<string> {
  const message = encodePacked(
    ["address", "uint256", "uint8", "uint256", "uint256"],
    [data.player, data.amount, data.rewardType, BigInt(data.nonce), BigInt(data.expiry)]
  );

  const hash = keccak256(message);
  const signature = await signer.signMessage({ message: { raw: hash } });

  return signature;
}

export function getSignerAddress(): `0x${string}` {
  return signer.address;
}
```

### Anti-Fraud Service

```typescript
// services/antiFraud.ts

interface SessionValidation {
  isValid: boolean;
  reason?: string;
  adjustedRewards?: bigint;
}

interface GameSession {
  survivalTime: number;
  enemiesKilled: number;
  xpCollected: number;
  levelReached: number;
}

interface Heartbeat {
  timestamp: Date;
  playerX: number;
  playerY: number;
  playerHealth: number;
  enemiesAlive: number;
}

export function validateSession(session: GameSession, heartbeats: Heartbeat[]): SessionValidation {
  // 1. Check heartbeat consistency
  const expectedHeartbeats = Math.floor(session.survivalTime / 5); // Every 5 seconds
  if (heartbeats.length < expectedHeartbeats * 0.8) {
    return { isValid: false, reason: "Missing heartbeats" };
  }

  // 2. Check kill rate plausibility
  const killsPerSecond = session.enemiesKilled / session.survivalTime;
  if (killsPerSecond > 50) {
    // Max reasonable KPS
    return { isValid: false, reason: "Suspicious kill rate" };
  }

  // 3. Check XP consistency
  const expectedXpRange = {
    min: session.enemiesKilled * 5,
    max: session.enemiesKilled * 15,
  };
  if (session.xpCollected < expectedXpRange.min || session.xpCollected > expectedXpRange.max) {
    return { isValid: false, reason: "XP inconsistency" };
  }

  // 4. Check level consistency
  const expectedLevelRange = {
    min: Math.floor(session.xpCollected / 200),
    max: Math.ceil(session.xpCollected / 50),
  };
  if (
    session.levelReached < expectedLevelRange.min ||
    session.levelReached > expectedLevelRange.max
  ) {
    return { isValid: false, reason: "Level inconsistency" };
  }

  // 5. Check movement patterns (detect stationary bots)
  const movementVariance = calculateMovementVariance(heartbeats);
  if (movementVariance < 10) {
    // Too little movement
    return { isValid: false, reason: "Suspicious movement pattern" };
  }

  // 6. Check for impossible survival times
  if (session.survivalTime > 3600) {
    // 1 hour max
    return {
      isValid: true,
      adjustedRewards: calculateRewards({ ...session, survivalTime: 3600 }).total,
    };
  }

  return { isValid: true };
}

function calculateMovementVariance(heartbeats: Heartbeat[]): number {
  if (heartbeats.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < heartbeats.length; i++) {
    const dx = heartbeats[i].playerX - heartbeats[i - 1].playerX;
    const dy = heartbeats[i].playerY - heartbeats[i - 1].playerY;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  return totalDistance / heartbeats.length;
}

// Diminishing returns for extended play
export function applyDiminishingReturns(dailyClaimed: bigint, newReward: bigint): bigint {
  const DAILY_CAP = BigInt(10000e18); // 10,000 $VSC daily cap
  const SOFT_CAP = BigInt(5000e18); // 50% reduction after 5,000

  if (dailyClaimed >= DAILY_CAP) {
    return 0n;
  }

  if (dailyClaimed + newReward > DAILY_CAP) {
    newReward = DAILY_CAP - dailyClaimed;
  }

  if (dailyClaimed > SOFT_CAP) {
    // 50% reduction on rewards over soft cap
    newReward = newReward / 2n;
  }

  return newReward;
}
```

## Background Jobs

### Leaderboard Update Job

```typescript
// jobs/updateLeaderboard.ts
import { Queue, Worker } from "bullmq";
import { redis } from "@/lib/redis";

const leaderboardQueue = new Queue("leaderboard", { connection: redis });

// Schedule daily/weekly updates
export async function scheduleLeaderboardUpdates() {
  // Daily leaderboard at midnight UTC
  await leaderboardQueue.add(
    "daily",
    {},
    {
      repeat: { cron: "0 0 * * *" },
    }
  );

  // Weekly leaderboard on Monday midnight UTC
  await leaderboardQueue.add(
    "weekly",
    {},
    {
      repeat: { cron: "0 0 * * 1" },
    }
  );
}

const leaderboardWorker = new Worker(
  "leaderboard",
  async (job) => {
    const period = job.name as "daily" | "weekly";

    // Calculate period start
    const now = new Date();
    let periodStart: Date;

    if (period === "daily") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else {
      const dayOfWeek = now.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract - 7);
    }

    // Aggregate scores for the period
    const scores = await aggregateScores(periodStart, period);

    // Rank and insert entries
    const ranked = scores.map((s, i) => ({ ...s, rank: i + 1 }));
    await insertLeaderboardEntries(ranked, period, periodStart);

    // Send notifications to top 10
    const top10 = ranked.slice(0, 10);
    for (const entry of top10) {
      await sendLeaderboardNotification(entry.playerId, entry.rank, period);
    }
  },
  { connection: redis }
);

export { leaderboardQueue, leaderboardWorker };
```

### Maintenance Decay Job

```typescript
// jobs/decayMaintenance.ts
import { Queue, Worker } from "bullmq";
import { redis } from "@/lib/redis";

const decayQueue = new Queue("maintenance-decay", { connection: redis });

// Schedule hourly decay calculations
export async function scheduleDecayJob() {
  await decayQueue.add(
    "decay",
    {},
    {
      repeat: { cron: "0 * * * *" }, // Every hour
    }
  );
}

const decayWorker = new Worker(
  "maintenance-decay",
  async (job) => {
    // This is primarily for analytics/monitoring
    // Actual decay is calculated on-chain in MaintenancePool contract

    // Log decay metrics
    const activePools = await getActiveMaintenancePools();
    const totalDecay = await calculateTotalDecay(activePools);

    console.log(`Hourly decay: ${totalDecay} $VSC across ${activePools.length} pools`);

    // Send warnings to players below threshold
    for (const pool of activePools) {
      if (pool.percentRemaining < 20 && pool.percentRemaining > 0) {
        await sendMaintenanceWarning(pool.playerId, pool.percentRemaining);
      }
    }
  },
  { connection: redis }
);

export { decayQueue, decayWorker };
```

## Middleware

### Authentication Middleware

```typescript
// middleware/auth.ts
import { FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      playerId: string;
      fid: number;
      address: string;
    };
    user: {
      playerId: string;
      fid: number;
      address: string;
    };
  }
}

export default fp(async (fastify) => {
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Unauthorized" });
    }
  });
});
```

### Rate Limiting Middleware

```typescript
// middleware/rateLimit.ts
import rateLimit from "@fastify/rate-limit";
import { redis } from "@/lib/redis";

export const rateLimitConfig = {
  global: true,
  max: 100,
  timeWindow: "1 minute",
  redis,
  keyGenerator: (request) => {
    // Use player ID if authenticated, otherwise IP
    return request.user?.playerId ?? request.ip;
  },
};

// Stricter limits for sensitive endpoints
export const claimRateLimit = {
  max: 10,
  timeWindow: "1 minute",
};

export const sessionStartRateLimit = {
  max: 5,
  timeWindow: "1 minute",
};
```

## Environment Variables

```bash
# Server
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/farcaster_survivors

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Blockchain
REWARD_SIGNER_PRIVATE_KEY=0x...
RPC_URL=https://sepolia.base.org

# Farcaster
FARCASTER_APP_FID=123456
FARCASTER_APP_MNEMONIC=word1 word2 ...

# External Services
SENTRY_DSN=https://...
```
