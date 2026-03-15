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
import {
  type HeartbeatData,
  type SessionTrustData,
  runValidationPipeline,
  getRewardMultiplier,
  computeChecksumSecret,
} from "../services/antiFraud.js";

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
      const walletAddress = request.user.walletAddress as string;

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

      // Generate checksum secret for anti-fraud validation
      const checksumSecret = computeChecksumSecret(session.id, walletAddress);

      // Cache session in Redis
      await cacheSession(session.id, {
        playerId,
        startedAt: session.started_at,
        lastHeartbeat: Date.now(),
        score: 0,
        wave: 1,
        kills: 0,
        trustScore: 100,
        heartbeatCount: 0,
        sessionStartTime: Date.now(),
        checksumSecret,
      });

      return reply.send({
        sessionId: session.id,
        serverTime: Date.now(),
        checksumSecret,
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

      // Build heartbeat data for anti-fraud validation
      const heartbeatData: HeartbeatData = {
        sessionId,
        playerId,
        score,
        wave,
        kills,
        timestamp,
        checksum,
        heartbeatCount: ((cachedSession.heartbeatCount as number) ?? 0) + 1,
      };

      const trustData: SessionTrustData = {
        sessionId,
        walletAddress: request.user.walletAddress as string,
        trustScore: (cachedSession.trustScore as number) ?? 100,
        flags: [],
        previousHeartbeat: cachedSession.previousHeartbeat
          ? (cachedSession.previousHeartbeat as HeartbeatData)
          : null,
        sessionStartTime: (cachedSession.sessionStartTime as number) ?? Date.now(),
        heartbeatCount: (cachedSession.heartbeatCount as number) ?? 0,
      };

      const results = await runValidationPipeline(heartbeatData, trustData);
      const totalPenalty = results.reduce((sum, r) => sum + r.trustPenalty, 0);
      const newTrustScore = Math.max(0, trustData.trustScore - totalPenalty);

      // Store fraud flags for violations (non-blocking)
      const violations = results.filter((r) => !r.valid);
      if (violations.length > 0) {
        for (const v of violations) {
          supabase.from("fraud_flags").insert({
            session_id: sessionId,
            player_id: playerId,
            validator: v.validator,
            severity: v.severity,
            penalty: v.trustPenalty,
            reason: v.reason || "Validation failed",
            heartbeat_index: heartbeatData.heartbeatCount,
          });
        }
      }

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

      // Update cache with trust data
      await cacheSession(sessionId, {
        ...cachedSession,
        lastHeartbeat: Date.now(),
        score,
        wave,
        kills,
        trustScore: newTrustScore,
        heartbeatCount: heartbeatData.heartbeatCount,
        previousHeartbeat: heartbeatData,
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
      // Apply trust-based reward multiplier before converting to wei
      const baseReward = Math.floor(finalScore * 0.001 + finalWave * 10 + totalKills * 0.5);
      const trustScore = (cachedSession.trustScore as number) ?? 100;
      const rewardMultiplier = getRewardMultiplier(trustScore);
      const vscReward = BigInt(Math.floor(baseReward * rewardMultiplier)) * BigInt(1e18);

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
