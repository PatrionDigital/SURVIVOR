/**
 * Database Schema Tests
 *
 * These tests verify the database schema is correctly set up.
 * They require a running PostgreSQL database (via docker-compose).
 *
 * Run with: pnpm test (will skip if DB not available)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool, PoolClient } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/survivor";

let pool: Pool | null = null;
let client: PoolClient | null = null;

// Synchronous check - try to create pool
function createPool(): Pool {
  return new Pool({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 3000,
  });
}

beforeAll(async () => {
  try {
    pool = createPool();
    client = await pool.connect();
    // Verify connection
    await client.query("SELECT 1");
  } catch (error) {
    console.warn("Database not available, tests will be skipped:", error);
    pool = null;
    client = null;
  }
});

afterAll(async () => {
  if (client) {
    client.release();
  }
  if (pool) {
    await pool.end();
  }
});

describe("Database Schema", () => {
  describe("Tables", () => {
    const expectedTables = [
      "players",
      "game_sessions",
      "session_heartbeats",
      "daily_rewards",
      "achievements",
      "leaderboard_entries",
      "claim_nonces",
      "notification_tokens",
    ];

    it.each(expectedTables)("should have table: %s", async (tableName) => {
      if (!client) {
        return; // Skip if no DB
      }
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [tableName]
      );
      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe("Players Table", () => {
    const expectedColumns = [
      { name: "id", type: "uuid" },
      { name: "wallet_address", type: "character varying" },
      { name: "farcaster_fid", type: "integer" },
      { name: "farcaster_username", type: "character varying" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
      { name: "total_games_played", type: "integer" },
      { name: "total_vsc_earned", type: "numeric" },
      { name: "highest_wave", type: "integer" },
      { name: "highest_score", type: "bigint" },
    ];

    it.each(expectedColumns)("should have column: $name ($type)", async ({ name, type }) => {
      if (!client) {
        return; // Skip if no DB
      }
      const result = await client.query(
        `SELECT data_type
         FROM information_schema.columns
         WHERE table_name = 'players'
         AND column_name = $1`,
        [name]
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe(type);
    });

    it("should have unique constraint on wallet_address", async () => {
      if (!client) {
        return; // Skip if no DB
      }
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'players'
          AND tc.constraint_type = 'UNIQUE'
          AND ccu.column_name = 'wallet_address'
        )`
      );
      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe("Game Sessions Table", () => {
    const expectedColumns = [
      { name: "id", type: "uuid" },
      { name: "player_id", type: "uuid" },
      { name: "status", type: "character varying" },
      { name: "final_score", type: "bigint" },
      { name: "final_wave", type: "integer" },
      { name: "total_kills", type: "integer" },
      { name: "vsc_reward", type: "numeric" },
      { name: "reward_claimed", type: "boolean" },
    ];

    it.each(expectedColumns)("should have column: $name ($type)", async ({ name, type }) => {
      if (!client) {
        return; // Skip if no DB
      }
      const result = await client.query(
        `SELECT data_type
         FROM information_schema.columns
         WHERE table_name = 'game_sessions'
         AND column_name = $1`,
        [name]
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe(type);
    });

    it("should have foreign key to players", async () => {
      if (!client) {
        return; // Skip if no DB
      }
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'game_sessions'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'player_id'
        )`
      );
      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe("Indexes", () => {
    const expectedIndexes = [
      { name: "idx_players_wallet", table: "players" },
      { name: "idx_sessions_player", table: "game_sessions" },
      { name: "idx_sessions_status", table: "game_sessions" },
      { name: "idx_heartbeats_session", table: "session_heartbeats" },
      { name: "idx_daily_rewards_player_date", table: "daily_rewards" },
    ];

    it.each(expectedIndexes)("should have index: $name on $table", async ({ name, table }) => {
      if (!client) {
        return; // Skip if no DB
      }
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE schemaname = 'public'
          AND tablename = $1
          AND indexname = $2
        )`,
        [table, name]
      );
      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe("Triggers", () => {
    it("should have updated_at trigger on players", async () => {
      if (!client) {
        return; // Skip if no DB
      }
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.triggers
          WHERE event_object_table = 'players'
          AND trigger_name = 'update_players_updated_at'
        )`
      );
      expect(result.rows[0].exists).toBe(true);
    });
  });
});

describe("RPC Functions", () => {
  it("should have update_player_stats function", async () => {
    if (!client) {
      return; // Skip if no DB
    }
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'update_player_stats'
      )`
    );
    expect(result.rows[0].exists).toBe(true);
  });

  it("should have get_daily_rewards_summary function", async () => {
    if (!client) {
      return; // Skip if no DB
    }
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'get_daily_rewards_summary'
      )`
    );
    expect(result.rows[0].exists).toBe(true);
  });

  it("should have record_daily_reward function", async () => {
    if (!client) {
      return; // Skip if no DB
    }
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'record_daily_reward'
      )`
    );
    expect(result.rows[0].exists).toBe(true);
  });

  it("should have check_nonce_used function", async () => {
    if (!client) {
      return; // Skip if no DB
    }
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'check_nonce_used'
      )`
    );
    expect(result.rows[0].exists).toBe(true);
  });

  it("should have use_nonce function", async () => {
    if (!client) {
      return; // Skip if no DB
    }
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'use_nonce'
      )`
    );
    expect(result.rows[0].exists).toBe(true);
  });
});

describe("Data Operations", () => {
  const testWallet = "0xtest" + Date.now().toString(16) + "abcdef1234567890";
  let testPlayerId: string | null = null;

  afterAll(async () => {
    // Cleanup test data
    if (testPlayerId && client) {
      await client.query("DELETE FROM claim_nonces WHERE player_id = $1", [testPlayerId]);
      await client.query("DELETE FROM daily_rewards WHERE player_id = $1", [testPlayerId]);
      await client.query("DELETE FROM players WHERE id = $1", [testPlayerId]);
    }
  });

  it("should insert a player", async () => {
    if (!client) {
      return; // Skip if no DB
    }
    const result = await client.query(
      `INSERT INTO players (wallet_address, farcaster_fid, farcaster_username)
       VALUES ($1, $2, $3)
       RETURNING id, wallet_address, farcaster_fid`,
      [testWallet, 12345, "testuser"]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].wallet_address).toBe(testWallet);
    expect(result.rows[0].farcaster_fid).toBe(12345);
    testPlayerId = result.rows[0].id;
  });

  it("should update player stats with RPC function", async () => {
    if (!client || !testPlayerId) {
      return; // Skip if no DB or player not created
    }

    await client.query("SELECT update_player_stats($1, $2, $3, $4)", [
      testPlayerId,
      1000,
      5,
      "1000000000000000000",
    ]);

    const result = await client.query(
      "SELECT total_games_played, highest_score, highest_wave, total_vsc_earned FROM players WHERE id = $1",
      [testPlayerId]
    );

    expect(result.rows[0].total_games_played).toBe(1);
    expect(result.rows[0].highest_score).toBe("1000");
    expect(result.rows[0].highest_wave).toBe(5);
  });

  it("should track daily rewards", async () => {
    if (!client || !testPlayerId) {
      return; // Skip if no DB or player not created
    }

    await client.query("SELECT record_daily_reward($1, $2)", [
      testPlayerId,
      "500000000000000000",
    ]);

    const result = await client.query("SELECT * FROM get_daily_rewards_summary($1)", [
      testPlayerId,
    ]);

    expect(result.rows.length).toBe(1);
    expect(BigInt(result.rows[0].total_earned)).toBe(BigInt("500000000000000000"));
    expect(result.rows[0].games_played).toBe(1);
  });

  it("should prevent nonce reuse", async () => {
    if (!client || !testPlayerId) {
      return; // Skip if no DB or player not created
    }

    const testNonce = "0x" + Date.now().toString(16) + "a".repeat(48);

    // First use should succeed
    const firstUse = await client.query("SELECT use_nonce($1, $2)", [testNonce, testPlayerId]);
    expect(firstUse.rows[0].use_nonce).toBe(true);

    // Second use should fail
    const secondUse = await client.query("SELECT use_nonce($1, $2)", [testNonce, testPlayerId]);
    expect(secondUse.rows[0].use_nonce).toBe(false);

    // Check should report used
    const check = await client.query("SELECT check_nonce_used($1)", [testNonce]);
    expect(check.rows[0].check_nonce_used).toBe(true);
  });
});
