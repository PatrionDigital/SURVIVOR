import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authVerifySchema, validateRequest, addressSchema } from "../lib/validation.js";
import { generateTokens, verifySIWFSignature, revokeToken } from "../lib/auth.js";
import { getSupabaseClient } from "../lib/db.js";

// Schema for dev-only auth (no signature required)
const devAuthSchema = z.object({
  walletAddress: addressSchema,
  farcasterFid: z.number().int().positive().optional(),
  farcasterUsername: z.string().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/dev - Dev-only auth without SIWF (local development only)
  if (process.env.NODE_ENV === "development") {
    fastify.post("/dev", async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(devAuthSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { walletAddress, farcasterFid, farcasterUsername } = validation.data;

      const supabase = getSupabaseClient();

      // Upsert player
      const { data: player, error } = await supabase
        .from("players")
        .upsert(
          {
            wallet_address: walletAddress.toLowerCase(),
            farcaster_fid: farcasterFid || null,
            farcaster_username: farcasterUsername || null,
          },
          { onConflict: "wallet_address" }
        )
        .select()
        .single();

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Database error", details: error.message });
      }

      // Generate JWT
      const { accessToken, expiresAt } = generateTokens(fastify, {
        playerId: player.id,
        walletAddress: player.wallet_address,
        farcasterFid: player.farcaster_fid,
      });

      fastify.log.info(`[Dev Auth] Player authenticated: ${player.id}`);

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
  }

  // POST /api/auth/verify - Verify Farcaster SIWF signature and issue JWT
  fastify.post("/verify", async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = validateRequest(authVerifySchema, request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Validation Error",
        details: validation.error.issues,
      });
    }

    const { message, signature, walletAddress, farcasterFid, farcasterUsername } = validation.data;

    // Verify the SIWF signature
    const isValid = await verifySIWFSignature(
      message,
      signature as `0x${string}`,
      walletAddress as `0x${string}`
    );

    if (!isValid) {
      fastify.log.warn(`[Auth] Invalid signature for wallet: ${walletAddress}`);
      return reply.status(401).send({
        error: "Authentication Failed",
        message: "Invalid signature",
      });
    }

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

    fastify.log.info(`[Auth] Player authenticated: ${player.id}`);

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

      // Revoke the old token
      if (user.jti && user.exp) {
        await revokeToken(user.jti, user.exp);
      }

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

  // POST /api/auth/logout - Invalidate session by revoking token
  fastify.post(
    "/logout",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;

      // Add token to blocklist
      if (user.jti && user.exp) {
        await revokeToken(user.jti, user.exp);
        fastify.log.info(`[Auth] Token revoked for player: ${user.playerId}`);
      }

      return reply.send({ success: true });
    }
  );
}
