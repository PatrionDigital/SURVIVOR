import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authVerifySchema, validateRequest } from "../lib/validation.js";
import { generateTokens } from "../lib/auth.js";
import { getSupabaseClient } from "../lib/db.js";

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/verify - Verify Farcaster SIWF signature and issue JWT
  fastify.post("/verify", async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = validateRequest(authVerifySchema, request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Validation Error",
        details: validation.error.issues,
      });
    }

    const { walletAddress, farcasterFid, farcasterUsername } = validation.data;

    // TODO: Verify SIWF signature
    // For now, we'll trust the wallet address and create/update the player

    const supabase = getSupabaseClient();

    // Upsert player
    const { data: player, error } = await supabase
      .from("players")
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          farcaster_fid: farcasterFid,
          farcaster_username: farcasterUsername,
        },
        { onConflict: "wallet_address" }
      )
      .select()
      .single();

    if (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Database error" });
    }

    // Generate JWT
    const { accessToken, expiresAt } = generateTokens(fastify, {
      playerId: player.id,
      walletAddress: player.wallet_address,
      farcasterFid: player.farcaster_fid,
    });

    return reply.send({
      token: accessToken,
      expiresAt,
      player: {
        id: player.id,
        walletAddress: player.wallet_address,
        farcasterFid: player.farcaster_fid,
        farcasterUsername: player.farcaster_username,
      },
    });
  });

  // POST /api/auth/refresh - Refresh JWT token
  fastify.post(
    "/refresh",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;

      // Generate new token
      const { accessToken, expiresAt } = generateTokens(fastify, {
        playerId: user.playerId,
        walletAddress: user.walletAddress,
        farcasterFid: user.farcasterFid,
      });

      return reply.send({
        token: accessToken,
        expiresAt,
      });
    }
  );

  // POST /api/auth/logout - Invalidate session (placeholder)
  fastify.post(
    "/logout",
    { preHandler: [fastify.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // TODO: Add token to blocklist in Redis if needed
      return reply.send({ success: true });
    }
  );
}
