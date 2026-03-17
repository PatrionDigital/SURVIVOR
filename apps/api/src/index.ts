import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Load .env from monorepo root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { registerAuthPlugin } from "./lib/auth.js";
import { registerRoutes } from "./routes/index.js";
import { getRedisClient } from "./lib/redis.js";
import { getSupabaseClient } from "./lib/db.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
});

await fastify.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
});

// Register JWT auth
await registerAuthPlugin(fastify);

// Health check route
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Readiness check (includes dependencies)
fastify.get("/ready", async () => {
  const checks: Record<string, boolean> = {};

  // Check Redis connection
  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  // Check database connection
  try {
    const db = getSupabaseClient();
    const { error } = await db.from("players").select("id").limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  const allHealthy = Object.values(checks).every((v) => v);

  return {
    status: allHealthy ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  };
});

// Register all routes
await registerRoutes(fastify);

// Graceful shutdown
const shutdown = async () => {
  fastify.log.info("Shutting down...");
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "0.0.0.0";
    await fastify.listen({ port, host });
    fastify.log.info(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
