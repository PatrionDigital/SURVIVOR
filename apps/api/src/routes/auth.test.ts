/**
 * Auth Routes Tests
 *
 * Tests for authentication endpoints including SIWF verification,
 * token generation, and token revocation.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createWalletClient, http, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { verifySIWFSignature, generateTokens, revokeToken, isTokenBlocked } from "../lib/auth.js";
import { getRedisClient } from "../lib/redis.js";
import Fastify, { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import Redis from "ioredis";

// Test wallet
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil account 0
const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);

let walletClient: WalletClient;
let fastify: FastifyInstance;
let redisAvailable = false;

beforeAll(async () => {
  // Create wallet client for signing
  walletClient = createWalletClient({
    account: testAccount,
    chain: mainnet,
    transport: http(),
  });

  // Create minimal Fastify instance for token tests
  fastify = Fastify();
  await fastify.register(fastifyJwt, {
    secret: "test-secret-key-for-testing",
    sign: { expiresIn: "1h" },
  });

  // Check if Redis is available
  try {
    const testRedis = new Redis({
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: true,
    });
    await testRedis.connect();
    await testRedis.ping();
    redisAvailable = true;
    await testRedis.quit();
  } catch {
    console.warn("Redis not available, Token Blocklist tests will be skipped");
    redisAvailable = false;
  }
});

afterAll(async () => {
  if (fastify) {
    await fastify.close();
  }
  // Clean up Redis only if available
  if (redisAvailable) {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys("blocklist:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
});

describe("SIWF Signature Verification", () => {
  it("should verify a valid signature", async () => {
    const message = "Sign in to Farcaster Survivors";

    // Sign the message
    const signature = await walletClient.signMessage({
      account: testAccount,
      message,
    });

    const isValid = await verifySIWFSignature(
      message,
      signature as `0x${string}`,
      testAccount.address as `0x${string}`
    );

    expect(isValid).toBe(true);
  });

  it("should reject an invalid signature", async () => {
    const message = "Sign in to Farcaster Survivors";
    const invalidSignature = ("0x" + "a".repeat(130)) as `0x${string}`;

    const isValid = await verifySIWFSignature(
      message,
      invalidSignature,
      testAccount.address as `0x${string}`
    );

    expect(isValid).toBe(false);
  });

  it("should reject signature from wrong address", async () => {
    const message = "Sign in to Farcaster Survivors";

    const signature = await walletClient.signMessage({
      account: testAccount,
      message,
    });

    // Use a different address
    const wrongAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    const isValid = await verifySIWFSignature(
      message,
      signature as `0x${string}`,
      wrongAddress as `0x${string}`
    );

    expect(isValid).toBe(false);
  });

  it("should reject signature for different message", async () => {
    const originalMessage = "Sign in to Farcaster Survivors";
    const differentMessage = "Different message entirely";

    const signature = await walletClient.signMessage({
      account: testAccount,
      message: originalMessage,
    });

    const isValid = await verifySIWFSignature(
      differentMessage,
      signature as `0x${string}`,
      testAccount.address as `0x${string}`
    );

    expect(isValid).toBe(false);
  });
});

describe("Token Generation", () => {
  it("should generate a valid JWT token", () => {
    const payload = {
      playerId: "test-player-id",
      walletAddress: testAccount.address,
      farcasterFid: 12345,
    };

    const { accessToken, expiresAt } = generateTokens(fastify, payload);

    expect(accessToken).toBeTruthy();
    expect(typeof accessToken).toBe("string");
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("should include jti in token for blocklist support", () => {
    const payload = {
      playerId: "test-player-id",
      walletAddress: testAccount.address,
    };

    const { accessToken } = generateTokens(fastify, payload);
    const decoded = fastify.jwt.decode(accessToken) as { jti?: string };

    expect(decoded.jti).toBeTruthy();
    expect(typeof decoded.jti).toBe("string");
  });

  it("should generate unique jti for each token", () => {
    const payload = {
      playerId: "test-player-id",
      walletAddress: testAccount.address,
    };

    const { accessToken: token1 } = generateTokens(fastify, payload);
    const { accessToken: token2 } = generateTokens(fastify, payload);

    const decoded1 = fastify.jwt.decode(token1) as { jti: string };
    const decoded2 = fastify.jwt.decode(token2) as { jti: string };

    expect(decoded1.jti).not.toBe(decoded2.jti);
  });
});

describe("Token Blocklist", () => {
  it("should not block a token by default", async () => {
    if (!redisAvailable) return; // Skip if no Redis

    const jti = `test-jti-${Date.now()}`;

    const blocked = await isTokenBlocked(jti);

    expect(blocked).toBe(false);
  });

  it("should block a token after revocation", async () => {
    if (!redisAvailable) return; // Skip if no Redis

    const jti = `test-jti-revoke-${Date.now()}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    await revokeToken(jti, expiresAt);

    const blocked = await isTokenBlocked(jti);

    expect(blocked).toBe(true);
  });

  it("should not revoke token with past expiry", async () => {
    if (!redisAvailable) return; // Skip if no Redis

    const jti = `test-jti-expired-${Date.now()}`;
    const expiresAt = Math.floor(Date.now() / 1000) - 100; // Already expired

    await revokeToken(jti, expiresAt);

    // Should not be in blocklist since it's already expired
    const blocked = await isTokenBlocked(jti);

    expect(blocked).toBe(false);
  });
});
