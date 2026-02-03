import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { saveNotificationToken, getNotificationToken } from "../db/queries.js";
import { validateRequest } from "../lib/validation.js";
import { z } from "zod";

// Validation schemas
const registerTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
  platform: z.string().default("farcaster"),
});

const unregisterTokenSchema = z.object({
  platform: z.string().default("farcaster"),
});

export async function notificationRoutes(fastify: FastifyInstance) {
  // POST /api/notifications/register - Register notification token
  fastify.post(
    "/register",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(registerTokenSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { token, platform } = validation.data;
      const playerId = request.user.playerId;

      try {
        // URL will be provided by webhook, not frontend registration
        const success = await saveNotificationToken(playerId, token, null, platform);

        if (!success) {
          return reply.status(500).send({
            error: "Failed to register notification token",
          });
        }

        return reply.send({
          success: true,
          message: "Notification token registered successfully",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Failed to register notification token",
        });
      }
    }
  );

  // GET /api/notifications/status - Get notification registration status
  fastify.get(
    "/status",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const playerId = request.user.playerId;
      const platform = (request.query as { platform?: string }).platform || "farcaster";

      try {
        const token = await getNotificationToken(playerId, platform);

        return reply.send({
          registered: !!token,
          platform,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Failed to check notification status",
        });
      }
    }
  );

  // DELETE /api/notifications/unregister - Unregister notification token
  fastify.delete(
    "/unregister",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(unregisterTokenSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { platform } = validation.data;
      const playerId = request.user.playerId;

      try {
        // Delete token by setting it to empty string (or we could delete the row)
        const success = await saveNotificationToken(playerId, "", null, platform);

        return reply.send({
          success,
          message: "Notification token unregistered successfully",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Failed to unregister notification token",
        });
      }
    }
  );
}
