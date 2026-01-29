import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
});

await fastify.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
});

// Health check route
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "0.0.0.0";
    await fastify.listen({ port, host });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
