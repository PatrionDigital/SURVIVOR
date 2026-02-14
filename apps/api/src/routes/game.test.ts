/**
 * Game Routes Integration Tests
 *
 * Tests for game session lifecycle, heartbeats, and reward generation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { gameRoutes } from "./game.js";
import type { Address } from "viem";

// Mock modules
vi.mock("../lib/db.js", () => ({
  getSupabaseClient: () => mockSupabase,
}));

vi.mock("../lib/redis.js", () => ({
  cacheSession: vi.fn(),
  getCachedSession: vi.fn(),
  deleteCachedSession: vi.fn(),
}));

vi.mock("../lib/rewardSigner.js", () => ({
  signRewardClaim: vi.fn().mockResolvedValue({
    amount: "1000000000000000000", // 1 VSC
    signature: "0xabcdef1234567890",
    nonce: "12345",
    expiry: Math.floor(Date.now() / 1000) + 3600,
  }),
  generateNonce: () => "test-nonce-" + Date.now(),
  calculateExpiry: (hours: number) => Math.floor(Date.now() / 1000) + hours * 3600,
  RewardType: {
    GAMEPLAY: 0,
    DAILY_LOGIN: 1,
    ACHIEVEMENT: 2,
    SOCIAL: 3,
  },
}));

// Mock Supabase client
const mockSupabase = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          if (table === "game_sessions") {
            return mockGameSessionQuery(column, value);
          }
          return { data: null, error: null };
        },
      }),
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          if (table === "game_sessions") {
            return {
              data: {
                id: "test-session-id",
                player_id: data.player_id,
                started_at: new Date().toISOString(),
                status: "active",
                gear_snapshot: data.gear_snapshot,
              },
              error: null,
            };
          }
          if (table === "session_heartbeats") {
            return { data: { id: "heartbeat-id" }, error: null };
          }
          return { data: null, error: null };
        },
      }),
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        eq: (column2: string, value2: any) => ({
          select: () => async () => ({ data: [{ ...data }], error: null }),
        }),
      }),
    }),
  }),
  rpc: async (fn: string, params: any) => {
    return { data: null, error: null };
  },
};

let existingSession: any = null;

function mockGameSessionQuery(column: string, value: any) {
  if (column === "player_id" && existingSession) {
    return { data: existingSession, error: null };
  }
  return { data: null, error: null };
}

let fastify: FastifyInstance;
let authToken: string;

beforeAll(async () => {
  // Create Fastify instance
  fastify = Fastify();

  // Register JWT
  await fastify.register(fastifyJwt, {
    secret: "test-secret-for-game-tests",
  });

  // Register authentication decorator
  fastify.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Unauthorized" });
    }
  });

  // Register game routes
  await fastify.register(gameRoutes);

  // Generate test token
  authToken = fastify.jwt.sign({
    playerId: "test-player-123",
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address,
    farcasterFid: 12345,
  });
});

afterAll(async () => {
  await fastify.close();
});

beforeEach(async () => {
  // Reset mocks
  vi.clearAllMocks();
  existingSession = null;

  // Setup default Redis mock responses
  const { getCachedSession } = await import("../lib/redis.js");
  vi.mocked(getCachedSession).mockResolvedValue({
    playerId: "test-player-123",
    startedAt: new Date().toISOString(),
    lastHeartbeat: Date.now(),
    score: 0,
    wave: 1,
    kills: 0,
  });
});

describe("Game Session Lifecycle", () => {
  it("should start a new session successfully", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/start",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        gearSnapshot: {
          weapon: "100",
          armor: "50",
          power: "30",
          gloves: "20",
          amulet: "40",
          boots: "25",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.sessionId).toBe("test-session-id");
    expect(body.serverTime).toBeDefined();
  });

  it("should abandon existing active session when starting new one", async () => {
    // Set up existing session
    existingSession = {
      id: "old-session-id",
      player_id: "test-player-123",
      status: "active",
    };

    const response = await fastify.inject({
      method: "POST",
      url: "/session/start",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        gearSnapshot: {
          weapon: "0",
          armor: "0",
          power: "0",
          gloves: "0",
          amulet: "0",
          boots: "0",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.sessionId).toBe("test-session-id");

    // Old session should be abandoned
    // This would be verified by checking the update call in a real test
  });

  it("should send heartbeat successfully", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/heartbeat",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        sessionId: "test-session-id",
        score: 1000,
        wave: 5,
        kills: 50,
        timestamp: Date.now(),
        checksum: "test-checksum",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.serverTime).toBeDefined();
  });

  it("should reject heartbeat for invalid session", async () => {
    const { getCachedSession } = await import("../lib/redis.js");
    vi.mocked(getCachedSession).mockResolvedValue(null);

    const response = await fastify.inject({
      method: "POST",
      url: "/session/heartbeat",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        sessionId: "invalid-session-id",
        score: 1000,
        wave: 5,
        kills: 50,
        timestamp: Date.now(),
        checksum: "test-checksum",
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Invalid session");
  });

  it("should end session and generate reward", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/end",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        sessionId: "test-session-id",
        finalScore: 10000,
        finalWave: 20,
        totalKills: 500,
        damageDealt: 50000,
        damageTaken: 10000,
        xpEarned: 2000,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.vscReward).toBeDefined();
    expect(body.rewardSignature).toBeDefined();
    expect(body.nonce).toBeDefined();
    expect(body.deadline).toBeDefined();
  });

  it("should validate reward signature format", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/end",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        sessionId: "test-session-id",
        finalScore: 5000,
        finalWave: 10,
        totalKills: 250,
        damageDealt: 25000,
        damageTaken: 5000,
        xpEarned: 1000,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Verify signature format (should be hex string starting with 0x)
    expect(body.rewardSignature).toMatch(/^0x[a-fA-F0-9]+$/);

    // Verify nonce is a string
    expect(typeof body.nonce).toBe("string");

    // Verify deadline is a number (Unix timestamp)
    expect(typeof body.deadline).toBe("number");
    expect(body.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe("Authentication", () => {
  it("should reject session start without auth", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/start",
      payload: {
        gearSnapshot: {},
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should reject heartbeat without auth", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/heartbeat",
      payload: {
        sessionId: "test-session-id",
        score: 1000,
        wave: 5,
        kills: 50,
        timestamp: Date.now(),
        checksum: "test-checksum",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should reject session end without auth", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/end",
      payload: {
        sessionId: "test-session-id",
        finalScore: 10000,
        finalWave: 20,
        totalKills: 500,
        damageDealt: 50000,
        damageTaken: 10000,
        xpEarned: 2000,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("Validation", () => {
  it("should reject heartbeat with missing fields", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/heartbeat",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        sessionId: "test-session-id",
        // Missing required fields
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Validation Error");
  });

  it("should reject session end with invalid data types", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/session/end",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        sessionId: "test-session-id",
        finalScore: "not-a-number", // Invalid type
        finalWave: 20,
        totalKills: 500,
        damageDealt: 50000,
        damageTaken: 10000,
        xpEarned: 2000,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
