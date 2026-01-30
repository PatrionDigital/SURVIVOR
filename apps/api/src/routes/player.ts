import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { updatePlayerSchema, validateRequest } from "../lib/validation.js";
import { getSupabaseClient } from "../lib/db.js";

export async function playerRoutes(fastify: FastifyInstance) {
  // GET /api/player/profile - Get current player profile
  fastify.get(
    "/profile",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const playerId = request.user.playerId;
      const supabase = getSupabaseClient();

      const { data: player, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();

      if (error || !player) {
        return reply.status(404).send({ error: "Player not found" });
      }

      return reply.send({
        id: player.id,
        walletAddress: player.wallet_address,
        farcasterFid: player.farcaster_fid,
        farcasterUsername: player.farcaster_username,
        createdAt: player.created_at,
        lastPlayedAt: player.last_played_at,
        stats: {
          totalGamesPlayed: player.total_games_played,
          totalVscEarned: player.total_vsc_earned,
          highestWave: player.highest_wave,
          highestScore: player.highest_score,
        },
      });
    }
  );

  // PATCH /api/player/profile - Update player profile
  fastify.patch(
    "/profile",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(updatePlayerSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const playerId = request.user.playerId;
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from("players")
        .update({
          farcaster_username: validation.data.farcasterUsername,
        })
        .eq("id", playerId);

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to update profile" });
      }

      return reply.send({ success: true });
    }
  );

  // GET /api/player/sessions - Get player's game session history
  fastify.get(
    "/sessions",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const playerId = request.user.playerId;
      const supabase = getSupabaseClient();

      const { data: sessions, error } = await supabase
        .from("game_sessions")
        .select("id, status, final_score, final_wave, total_kills, started_at, ended_at")
        .eq("player_id", playerId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch sessions" });
      }

      return reply.send({
        sessions: sessions || [],
      });
    }
  );

  // GET /api/player/achievements - Get player's achievements
  fastify.get(
    "/achievements",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const playerId = request.user.playerId;
      const supabase = getSupabaseClient();

      const { data: achievements, error } = await supabase
        .from("achievements")
        .select("achievement_type, unlocked_at, metadata")
        .eq("player_id", playerId)
        .order("unlocked_at", { ascending: false });

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch achievements" });
      }

      return reply.send({
        achievements: achievements || [],
      });
    }
  );
}
