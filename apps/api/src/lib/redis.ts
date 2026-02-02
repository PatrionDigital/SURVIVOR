import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  } else {
    // Default to local docker-compose Redis
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  redis.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  redis.on("connect", () => {
    console.log("Redis connected");
  });

  return redis;
}

// Session cache operations
export async function cacheSession(
  sessionId: string,
  data: Record<string, unknown>,
  ttlSeconds: number = 3600
): Promise<void> {
  const client = getRedisClient();
  await client.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
}

export async function getCachedSession(sessionId: string): Promise<Record<string, unknown> | null> {
  const client = getRedisClient();
  const data = await client.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteCachedSession(sessionId: string): Promise<void> {
  const client = getRedisClient();
  await client.del(`session:${sessionId}`);
}

// Leaderboard cache operations
export async function cacheLeaderboard(
  period: string,
  data: unknown[],
  ttlSeconds: number = 60
): Promise<void> {
  const client = getRedisClient();
  await client.setex(`leaderboard:${period}`, ttlSeconds, JSON.stringify(data));
}

export async function getCachedLeaderboard(period: string): Promise<unknown[] | null> {
  const client = getRedisClient();
  const data = await client.get(`leaderboard:${period}`);
  return data ? JSON.parse(data) : null;
}

// Rate limiting helpers
export async function incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
  const client = getRedisClient();
  const count = await client.incr(`ratelimit:${key}`);
  if (count === 1) {
    await client.expire(`ratelimit:${key}`, windowSeconds);
  }
  return count;
}

export async function getRateLimitCount(key: string): Promise<number> {
  const client = getRedisClient();
  const count = await client.get(`ratelimit:${key}`);
  return count ? parseInt(count, 10) : 0;
}

// Token blocklist operations for logout
export async function addToTokenBlocklist(
  tokenId: string,
  expiresInSeconds: number
): Promise<void> {
  const client = getRedisClient();
  // Store blocked token with TTL matching token expiry
  await client.setex(`blocklist:${tokenId}`, expiresInSeconds, "1");
}

export async function isTokenBlocked(tokenId: string): Promise<boolean> {
  const client = getRedisClient();
  const exists = await client.exists(`blocklist:${tokenId}`);
  return exists === 1;
}

export { redis };
