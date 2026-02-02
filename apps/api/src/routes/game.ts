import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { Address } from "viem";
import {
  startSessionSchema,
  heartbeatSchema,
  endSessionSchema,
  leaderboardQuerySchema,
  validateRequest,
} from "../lib/validation.js";
import { getSupabaseClient } from "../lib/db.js";
import { cacheSession, getCachedSession, deleteCachedSession } from "../lib/redis.js";
import {
  signRewardClaim,
  generateNonce,
  calculateExpiry,
  RewardType,
} from "../lib/rewardSigner.js";

export async function gameRoutes(fastify: FastifyInstance) {
  // POST /api/game/session/start - Start a new game session
  fastify.post(
    "/session/start",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(startSessionSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { gearSnapshot } = validation.data;
      const playerId = request.user.playerId;

      const supabase = getSupabaseClient();

      // Check for existing active session
      const { data: existingSession } = await supabase
        .from("game_sessions")
        .select("id")
        .eq("player_id", playerId)
        .eq("status", "active")
        .single();

      if (existingSession) {
        // Mark existing session as abandoned
        await supabase
          .from("game_sessions")
          .update({ status: "abandoned", ended_at: new Date().toISOString() })
          .eq("id", existingSession.id);
      }

      // Create new session
      const { data: session, error } = await supabase
        .from("game_sessions")
        .insert({
          player_id: playerId,
          gear_snapshot: gearSnapshot,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to create session" });
      }

      // Cache session in Redis
      await cacheSession(session.id, {
        playerId,
        startedAt: session.started_at,
        lastHeartbeat: Date.now(),
        score: 0,
        wave: 1,
        kills: 0,
      });

      return reply.send({
        sessionId: session.id,
        serverTime: Date.now(),
      });
    }
  );

  // POST /api/game/session/heartbeat - Send gameplay heartbeat
  fastify.post(
    "/session/heartbeat",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(heartbeatSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { sessionId, score, wave, kills, timestamp, checksum } = validation.data;
      const playerId = request.user.playerId;

      // Verify session ownership from cache
      const cachedSession = await getCachedSession(sessionId);
      if (!cachedSession || cachedSession.playerId !== playerId) {
        return reply.status(403).send({ error: "Invalid session" });
      }

      const supabase = getSupabaseClient();

      // TODO: Validate checksum for anti-fraud
      // TODO: Check for suspicious patterns (score growth rate, etc.)

      // Store heartbeat
      const { error } = await supabase.from("session_heartbeats").insert({
        session_id: sessionId,
        score,
        wave,
        kills,
        timestamp,
        checksum,
      });

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to record heartbeat" });
      }

      // Update cache
      await cacheSession(sessionId, {
        ...cachedSession,
        lastHeartbeat: Date.now(),
        score,
        wave,
        kills,
      });

      return reply.send({ success: true, serverTime: Date.now() });
    }
  );

  // POST /api/game/session/end - End game session and calculate rewards
  fastify.post(
    "/session/end",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(endSessionSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { sessionId, finalScore, finalWave, totalKills, damageDealt, damageTaken, xpEarned } =
        validation.data;
      const playerId = request.user.playerId;

      // Verify session ownership
      const cachedSession = await getCachedSession(sessionId);
      if (!cachedSession || cachedSession.playerId !== playerId) {
        return reply.status(403).send({ error: "Invalid session" });
      }

      const supabase = getSupabaseClient();

      // Get player's wallet address for signing
      const walletAddress = request.user.walletAddress as Address;
      if (!walletAddress) {
        return reply.status(400).send({ error: "Wallet address not found in session" });
      }

      // Calculate VSC reward based on performance
      // Base formula: score * 0.001 + wave * 10 + kills * 0.5
      // Converted to wei (18 decimals)
      const baseReward = Math.floor(finalScore * 0.001 + finalWave * 10 + totalKills * 0.5);
      const vscReward = BigInt(baseReward) * BigInt(1e18);

      // Generate unique nonce and expiry
      const nonce = generateNonce();
      const expiry = calculateExpiry(1); // 1 hour

      // Sign the reward claim
      let signedReward;
      try {
        signedReward = await signRewardClaim({
          player: walletAddress,
          amount: vscReward,
          rewardType: RewardType.GAMEPLAY,
          nonce,
          expiry,
        });
      } catch (signError) {
        fastify.log.error({ err: signError }, "Failed to sign reward");
        return reply.status(500).send({ error: "Failed to sign reward claim" });
      }

      // Update session
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
          final_score: finalScore,
          final_wave: finalWave,
          total_kills: totalKills,
          damage_dealt: damageDealt,
          damage_taken: damageTaken,
          xp_earned: xpEarned,
          vsc_reward: signedReward.amount,
          reward_nonce: signedReward.nonce,
        })
        .eq("id", sessionId)
        .eq("player_id", playerId);

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to end session" });
      }

      // Update player stats
      await supabase.rpc("update_player_stats", {
        p_player_id: playerId,
        p_score: finalScore,
        p_wave: finalWave,
        p_vsc: signedReward.amount,
      });

      // Clear session cache
      await deleteCachedSession(sessionId);

      return reply.send({
        vscReward: signedReward.amount,
        rewardSignature: signedReward.signature,
        nonce: signedReward.nonce,
        deadline: signedReward.expiry,
      });
    }
  );

  // GET /api/game/leaderboard - Get leaderboard
  fastify.get("/leaderboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = validateRequest(leaderboardQuerySchema, request.query);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Validation Error",
        details: validation.error.issues,
      });
    }

    const { period, limit = 20, offset = 0 } = validation.data;

    const supabase = getSupabaseClient();

    // TODO: Implement proper period filtering
    const { data: entries, error } = await supabase
      .from("leaderboard_entries")
      .select(
        `
        rank,
        score,
        wave,
        players (
          id,
          farcaster_username,
          wallet_address
        )
      `
      )
      .eq("period", period === "allTime" ? "all_time" : period)
      .order("score", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch leaderboard" });
    }

    return reply.send({
      period,
      entries: entries || [],
    });
  });
}
