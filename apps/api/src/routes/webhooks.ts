/**
 * Farcaster Webhook Routes
 *
 * Handles webhook events from Farcaster for notification token management.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { parseWebhookEvent, verifyAppKeyWithNeynar } from "@farcaster/miniapp-node";
import { saveNotificationToken, getPlayerByFid } from "../db/queries.js";

interface WebhookBody {
  event: string;
  fid: number;
  notificationDetails?: {
    url: string;
    token: string;
  };
  [key: string]: unknown;
}

export async function webhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/webhooks/farcaster
   * Receives webhook events from Farcaster for notification management
   */
  fastify.post("/farcaster", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Parse and verify webhook event
      const data = await parseWebhookEvent(request.body as WebhookBody, verifyAppKeyWithNeynar);

      // Extract event type and FID
      const eventData = data as unknown as {
        event: string;
        fid: number;
        notificationDetails?: {
          url: string;
          token: string;
        };
      };

      const { event, fid, notificationDetails } = eventData;

      // Get player by FID
      const player = await getPlayerByFid(fid);
      if (!player) {
        // Player not found - they haven't connected their wallet yet
        // This is okay, we'll store the token when they connect
        return reply.status(200).send({ success: true, message: "Player not found" });
      }

      // Handle notification events
      if (event === "miniapp_added" || event === "notifications_enabled") {
        if (notificationDetails?.url && notificationDetails?.token) {
          await saveNotificationToken(
            player.id,
            notificationDetails.token,
            notificationDetails.url,
            "farcaster"
          );
          console.log(`[Webhook] Notification enabled for FID ${fid}`);
        }
      } else if (event === "miniapp_removed" || event === "notifications_disabled") {
        // Clear the token by saving empty values
        await saveNotificationToken(player.id, "", null, "farcaster");
        console.log(`[Webhook] Notification disabled for FID ${fid}`);
      } else {
        console.log(`[Webhook] Unhandled event: ${event}`);
      }

      // Respond quickly to avoid timeout (must respond within 10 seconds)
      return reply.status(200).send({ success: true });
    } catch (error) {
      // Log error but return 200 to prevent retries
      console.error("[Webhook] Error processing webhook:", error);

      if (error && typeof error === "object" && "name" in error) {
        const err = error as { name: string; message?: string };
        switch (err.name) {
          case "VerifyJsonFarcasterSignature.InvalidDataError":
          case "VerifyJsonFarcasterSignature.InvalidEventDataError":
            console.error("[Webhook] Invalid request data");
            break;
          case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
            console.error("[Webhook] Invalid app key");
            break;
          case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
            console.error("[Webhook] Verification service error");
            break;
        }
      }

      // Return 200 to prevent Farcaster from retrying
      return reply.status(200).send({ success: false, error: "Processing failed" });
    }
  });

  /**
   * GET /api/webhooks/health
   * Health check endpoint
   */
  fastify.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ status: "ok" });
  });
}
