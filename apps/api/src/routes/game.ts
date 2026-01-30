import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  startSessionSchema,
  heartbeatSchema,
  endSessionSchema,
  leaderboardQuerySchema,
  validateRequest,
} from "../lib/validation.js";
import { getSupabaseClient } from "../lib/db.js";
import { cacheSession, getCachedSession, deleteCachedSession } from "../lib/redis.js";

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

      // TODO: Calculate VSC reward based on performance
      // TODO: Generate reward signature
      const vscReward = BigInt(Math.floor(finalScore * 0.001 + finalWave * 10 + totalKills * 0.5));
      const nonce = `0x${crypto.randomUUID().replace(/-/g, "")}`;
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

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
          vsc_reward: vscReward.toString(),
          reward_nonce: nonce,
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
        p_vsc: vscReward.toString(),
      });

      // Clear session cache
      await deleteCachedSession(sessionId);

      return reply.send({
        vscReward: vscReward.toString(),
        rewardSignature: "0x" + "0".repeat(130), // TODO: Generate real signature
        nonce,
        deadline,
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
