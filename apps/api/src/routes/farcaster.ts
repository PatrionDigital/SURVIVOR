import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { validateRequest } from "../lib/validation.js";
import { getSupabaseClient } from "../lib/db.js";

const notificationTokenSchema = z.object({
  token: z.string().min(1),
});

export async function farcasterRoutes(fastify: FastifyInstance) {
  // POST /api/farcaster/notifications/register - Register notification token
  fastify.post(
    "/notifications/register",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(notificationTokenSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { token } = validation.data;
      const playerId = request.user.playerId;

      const supabase = getSupabaseClient();

      // Upsert notification token
      const { error } = await supabase.from("notification_tokens").upsert(
        {
          player_id: playerId,
          token,
          platform: "farcaster",
        },
        { onConflict: "player_id,platform" }
      );

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to register token" });
      }

      return reply.send({ success: true });
    }
  );

  // DELETE /api/farcaster/notifications/unregister - Unregister notification token
  fastify.delete(
    "/notifications/unregister",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const playerId = request.user.playerId;
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from("notification_tokens")
        .delete()
        .eq("player_id", playerId)
        .eq("platform", "farcaster");

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to unregister token" });
      }

      return reply.send({ success: true });
    }
  );

  // GET /api/farcaster/frame - Get Farcaster Frame metadata
  fastify.get("/frame", async (_request: FastifyRequest, reply: FastifyReply) => {
    const appUrl = process.env.VITE_APP_URL || "https://survivors.game";

    return reply.send({
      frame: {
        version: "vNext",
        name: "Farcaster Survivors",
        iconUrl: `${appUrl}/icon.png`,
        homeUrl: appUrl,
        imageUrl: `${appUrl}/og-image.png`,
        buttonTitle: "Play Now",
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#1a1a2e",
        webhookUrl: `${process.env.API_URL}/api/farcaster/webhook`,
      },
    });
  });

  // POST /api/farcaster/webhook - Handle Farcaster webhooks
  fastify.post("/webhook", async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Verify webhook signature
    // TODO: Handle different webhook events

    fastify.log.info({ body: request.body }, "Farcaster webhook received");

    return reply.send({ success: true });
  });
}
