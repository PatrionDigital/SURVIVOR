/**
 * Database Query Tests
 *
 * Tests for the typed query functions.
 * Requires a running PostgreSQL database (via docker-compose).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool, PoolClient } from "pg";
import * as queries from "./queries.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/survivor";

let pool: Pool | null = null;
let client: PoolClient | null = null;

// Test data
const testWallet = "0xtest" + Date.now().toString(16).padEnd(32, "0");
let testPlayerId: string | null = null;
let testSessionId: string | null = null;

beforeAll(async () => {
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 3000,
    });
    client = await pool.connect();
    await client.query("SELECT 1");
  } catch (error) {
    console.warn("Database not available, tests will be skipped:", error);
    pool = null;
    client = null;
  }
});

afterAll(async () => {
  // Cleanup test data
  if (client && testPlayerId) {
    await client.query(
      "DELETE FROM session_heartbeats WHERE session_id IN (SELECT id FROM game_sessions WHERE player_id = $1)",
      [testPlayerId]
    );
    await client.query("DELETE FROM game_sessions WHERE player_id = $1", [testPlayerId]);
    await client.query("DELETE FROM daily_rewards WHERE player_id = $1", [testPlayerId]);
    await client.query("DELETE FROM achievements WHERE player_id = $1", [testPlayerId]);
    await client.query("DELETE FROM claim_nonces WHERE player_id = $1", [testPlayerId]);
    await client.query("DELETE FROM notification_tokens WHERE player_id = $1", [testPlayerId]);
    await client.query("DELETE FROM players WHERE id = $1", [testPlayerId]);
  }
  if (client) {
    client.release();
  }
  if (pool) {
    await pool.end();
  }
});

describe("Player Queries", () => {
  it("should create a player", async () => {
    if (!client) return;

    const player = await queries.createPlayer({
      wallet_address: testWallet,
      farcaster_fid: 99999,
      farcaster_username: "testuser",
    });

    expect(player).not.toBeNull();
    expect(player!.wallet_address).toBe(testWallet.toLowerCase());
    expect(player!.farcaster_fid).toBe(99999);
    testPlayerId = player!.id;
  });

  it("should get player by ID", async () => {
    if (!client || !testPlayerId) return;

    const player = await queries.getPlayerById(testPlayerId);

    expect(player).not.toBeNull();
    expect(player!.id).toBe(testPlayerId);
  });

  it("should get player by wallet", async () => {
    if (!client || !testPlayerId) return;

    const player = await queries.getPlayerByWallet(testWallet);

    expect(player).not.toBeNull();
    expect(player!.id).toBe(testPlayerId);
  });

  it("should get player by FID", async () => {
    if (!client || !testPlayerId) return;

    const player = await queries.getPlayerByFid(99999);

    expect(player).not.toBeNull();
    expect(player!.id).toBe(testPlayerId);
  });

  it("should update player", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.updatePlayer(testPlayerId, {
      farcaster_username: "updated_user",
    });

    expect(success).toBe(true);

    const player = await queries.getPlayerById(testPlayerId);
    expect(player!.farcaster_username).toBe("updated_user");
  });

  it("should upsert player", async () => {
    if (!client) return;

    const player = await queries.upsertPlayer({
      wallet_address: testWallet,
      farcaster_fid: 99999,
      farcaster_username: "upserted_user",
    });

    expect(player).not.toBeNull();
    expect(player!.farcaster_username).toBe("upserted_user");
  });
});

describe("Game Session Queries", () => {
  it("should create a session", async () => {
    if (!client || !testPlayerId) return;

    const session = await queries.createSession({
      player_id: testPlayerId,
      gear_snapshot: { test: true },
    });

    expect(session).not.toBeNull();
    expect(session!.player_id).toBe(testPlayerId);
    expect(session!.status).toBe("active");
    testSessionId = session!.id;
  });

  it("should get session by ID", async () => {
    if (!client || !testSessionId) return;

    const session = await queries.getSessionById(testSessionId);

    expect(session).not.toBeNull();
    expect(session!.id).toBe(testSessionId);
  });

  it("should get active session", async () => {
    if (!client || !testPlayerId) return;

    const session = await queries.getActiveSession(testPlayerId);

    expect(session).not.toBeNull();
    expect(session!.status).toBe("active");
  });

  it("should end a session", async () => {
    if (!client || !testSessionId || !testPlayerId) return;

    const success = await queries.endSession(testSessionId, testPlayerId, {
      status: "completed",
      ended_at: new Date().toISOString(),
      final_score: 1000,
      final_wave: 5,
      total_kills: 50,
      damage_dealt: 5000,
      damage_taken: 100,
      xp_earned: 500,
      vsc_reward: "1000000000000000000",
      survival_time: 300,
      level_reached: 3,
    });

    expect(success).toBe(true);

    const session = await queries.getSessionById(testSessionId);
    expect(session!.status).toBe("completed");
    expect(session!.final_score).toBe("1000");
  });

  it("should get unclaimed sessions", async () => {
    if (!client || !testPlayerId) return;

    const sessions = await queries.getUnclaimedSessions(testPlayerId);

    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].reward_claimed).toBe(false);
  });

  it("should mark session as claimed", async () => {
    if (!client || !testSessionId || !testPlayerId) return;

    const success = await queries.markSessionClaimed(testSessionId, testPlayerId);
    expect(success).toBe(true);

    const session = await queries.getSessionById(testSessionId);
    expect(session!.reward_claimed).toBe(true);
  });
});

describe("Heartbeat Queries", () => {
  it("should create and retrieve heartbeats", async () => {
    if (!client || !testPlayerId) return;

    // Create a session for heartbeat tests
    const session = await queries.createSession({
      player_id: testPlayerId,
    });
    expect(session).not.toBeNull();
    const heartbeatSessionId = session!.id;

    // Create a heartbeat
    const success = await queries.createHeartbeat({
      session_id: heartbeatSessionId,
      score: 100,
      wave: 1,
      kills: 10,
      timestamp: Date.now(),
      checksum: "abc123",
    });
    expect(success).toBe(true);

    // Retrieve heartbeats
    const heartbeats = await queries.getSessionHeartbeats(heartbeatSessionId);
    expect(Array.isArray(heartbeats)).toBe(true);
    expect(heartbeats.length).toBeGreaterThan(0);
    expect(heartbeats[0].session_id).toBe(heartbeatSessionId);
  });
});

describe("Daily Rewards Queries", () => {
  it("should get daily rewards summary", async () => {
    if (!client || !testPlayerId) return;

    const summary = await queries.getDailyRewardsSummary(testPlayerId);

    expect(summary).toBeDefined();
    expect(typeof summary.total_earned).toBe("string");
    expect(typeof summary.games_played).toBe("number");
    expect(typeof summary.remaining_cap).toBe("string");
  });

  it("should record daily reward", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.recordDailyReward(testPlayerId, "1000000000000000000");

    expect(success).toBe(true);
  });

  it("should get daily rewards history", async () => {
    if (!client || !testPlayerId) return;

    const history = await queries.getDailyRewardsHistory(testPlayerId);

    expect(Array.isArray(history)).toBe(true);
  });
});

describe("Nonce Queries", () => {
  const testNonce = "0x" + Date.now().toString(16).padEnd(62, "a");

  it("should check if nonce is unused", async () => {
    if (!client || !testPlayerId) return;

    const isUsed = await queries.isNonceUsed(testNonce);

    expect(isUsed).toBe(false);
  });

  it("should use a nonce", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.useNonce(testNonce, testPlayerId);

    expect(success).toBe(true);
  });

  it("should report nonce as used after using", async () => {
    if (!client || !testPlayerId) return;

    const isUsed = await queries.isNonceUsed(testNonce);

    expect(isUsed).toBe(true);
  });

  it("should fail to use same nonce twice", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.useNonce(testNonce, testPlayerId);

    expect(success).toBe(false);
  });
});

describe("Player Stats Queries", () => {
  it("should update player stats", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.updatePlayerStats(testPlayerId, 2000, 10, "2000000000000000000");

    expect(success).toBe(true);

    const player = await queries.getPlayerById(testPlayerId);
    expect(Number(player!.highest_score)).toBeGreaterThanOrEqual(2000);
  });
});

describe("Achievement Queries", () => {
  it("should unlock an achievement", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.unlockAchievement(testPlayerId, "first_win", {
      score: 1000,
    });

    expect(success).toBe(true);
  });

  it("should get player achievements", async () => {
    if (!client || !testPlayerId) return;

    const achievements = await queries.getPlayerAchievements(testPlayerId);

    expect(Array.isArray(achievements)).toBe(true);
    expect(achievements.length).toBeGreaterThan(0);
    expect(achievements[0].achievement_type).toBe("first_win");
  });
});

describe("Notification Token Queries", () => {
  it("should save notification token", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.saveNotificationToken(
      testPlayerId,
      "test_token_123",
      "https://api.farcaster.xyz/v1/notifications",
      "farcaster"
    );

    expect(success).toBe(true);
  });

  it("should get notification token", async () => {
    if (!client || !testPlayerId) return;

    const token = await queries.getNotificationToken(testPlayerId);

    expect(token).not.toBeNull();
    expect(token!.token).toBe("test_token_123");
  });
});

describe("Leaderboard Queries", () => {
  it("should get leaderboard", async () => {
    if (!client) return;

    const entries = await queries.getLeaderboard("all_time", 10, 0);

    expect(Array.isArray(entries)).toBe(true);
  });

  it("should get player rank", async () => {
    if (!client || !testPlayerId) return;

    const rank = await queries.getPlayerRank(testPlayerId, "all_time");

    expect(typeof rank).toBe("number");
  });
});
