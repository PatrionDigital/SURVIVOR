import { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.js";
import { gameRoutes } from "./game.js";
import { rewardsRoutes } from "./rewards.js";
import { playerRoutes } from "./player.js";
import { farcasterRoutes } from "./farcaster.js";
import { notificationRoutes } from "./notifications.js";

export async function registerRoutes(fastify: FastifyInstance) {
  // Register all route modules with their prefixes
  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(gameRoutes, { prefix: "/api/game" });
  await fastify.register(rewardsRoutes, { prefix: "/api/rewards" });
  await fastify.register(playerRoutes, { prefix: "/api/player" });
  await fastify.register(farcasterRoutes, { prefix: "/api/farcaster" });
  await fastify.register(notificationRoutes, { prefix: "/api/notifications" });
}
