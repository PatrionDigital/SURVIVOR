/**
 * Reward Routes Tests
 *
 * Tests for reward endpoints.
 * Requires a running PostgreSQL database (via docker-compose).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool, PoolClient } from "pg";
import * as queries from "../db/queries.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/survivor";

let pool: Pool | null = null;
let client: PoolClient | null = null;

// Test data
const testWallet = "0xreward" + Date.now().toString(16).padEnd(32, "0");
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
    await client.query("DELETE FROM claim_nonces WHERE player_id = $1", [testPlayerId]);
    await client.query(
      "DELETE FROM session_heartbeats WHERE session_id IN (SELECT id FROM game_sessions WHERE player_id = $1)",
      [testPlayerId]
    );
    await client.query("DELETE FROM game_sessions WHERE player_id = $1", [testPlayerId]);
    await client.query("DELETE FROM players WHERE id = $1", [testPlayerId]);
  }
  if (client) {
    client.release();
  }
  if (pool) {
    await pool.end();
  }
});

describe("Reward Queries", () => {
  it("should create a player for reward tests", async () => {
    if (!client) return;

    const player = await queries.createPlayer({
      wallet_address: testWallet,
      farcaster_fid: 88888,
      farcaster_username: "rewardtestuser",
    });

    expect(player).not.toBeNull();
    testPlayerId = player!.id;
  });

  it("should create a completed session with reward", async () => {
    if (!client || !testPlayerId) return;

    const session = await queries.createSession({
      player_id: testPlayerId,
    });

    expect(session).not.toBeNull();
    testSessionId = session!.id;

    // End the session with a reward
    const success = await queries.endSession(testSessionId, testPlayerId, {
      status: "completed",
      ended_at: new Date().toISOString(),
      final_score: 5000,
      final_wave: 10,
      total_kills: 100,
      damage_dealt: 10000,
      damage_taken: 500,
      xp_earned: 1000,
      vsc_reward: "5000000000000000000", // 5 VSC
      reward_nonce: "test-nonce-" + Date.now(),
      survival_time: 600,
      level_reached: 5,
    });

    expect(success).toBe(true);
  });

  it("should get unclaimed sessions", async () => {
    if (!client || !testPlayerId) return;

    const sessions = await queries.getUnclaimedSessions(testPlayerId);

    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].reward_claimed).toBe(false);
    expect(sessions[0].vsc_reward).toBe("5000000000000000000");
  });

  it("should mark session as claimed", async () => {
    if (!client || !testSessionId || !testPlayerId) return;

    const success = await queries.markSessionClaimed(testSessionId, testPlayerId);

    expect(success).toBe(true);

    const session = await queries.getSessionById(testSessionId);
    expect(session!.reward_claimed).toBe(true);
  });

  it("should not return claimed sessions in unclaimed list", async () => {
    if (!client || !testPlayerId) return;

    const sessions = await queries.getUnclaimedSessions(testPlayerId);

    // The previously claimed session should not be in the list
    const foundSession = sessions.find((s) => s.id === testSessionId);
    expect(foundSession).toBeUndefined();
  });
});

describe("Nonce Tracking for Rewards", () => {
  const rewardNonce = "0x" + Date.now().toString(16).padEnd(62, "r");

  it("should check if nonce is unused", async () => {
    if (!client || !testPlayerId) return;

    const isUsed = await queries.isNonceUsed(rewardNonce);

    expect(isUsed).toBe(false);
  });

  it("should use a nonce for reward claim", async () => {
    if (!client || !testPlayerId || !testSessionId) return;

    const success = await queries.useNonce(rewardNonce, testPlayerId, testSessionId);

    expect(success).toBe(true);
  });

  it("should report nonce as used after claiming", async () => {
    if (!client || !testPlayerId) return;

    const isUsed = await queries.isNonceUsed(rewardNonce);

    expect(isUsed).toBe(true);
  });

  it("should reject duplicate nonce usage", async () => {
    if (!client || !testPlayerId) return;

    const success = await queries.useNonce(rewardNonce, testPlayerId);

    expect(success).toBe(false);
  });
});
