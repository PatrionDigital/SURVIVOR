import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { claimRewardSchema, validateRequest } from "../lib/validation.js";
import { getSupabaseClient } from "../lib/db.js";

export async function rewardsRoutes(fastify: FastifyInstance) {
  // GET /api/rewards/pending - Get pending rewards for player
  fastify.get(
    "/pending",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const playerId = request.user.playerId;
      const supabase = getSupabaseClient();

      const { data: sessions, error } = await supabase
        .from("game_sessions")
        .select("id, vsc_reward, reward_nonce, final_score, final_wave, ended_at")
        .eq("player_id", playerId)
        .eq("status", "completed")
        .eq("reward_claimed", false)
        .order("ended_at", { ascending: false });

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch pending rewards" });
      }

      const totalPending = sessions?.reduce((sum, s) => sum + BigInt(s.vsc_reward || 0), BigInt(0));

      return reply.send({
        sessions: sessions || [],
        totalPending: totalPending?.toString() || "0",
      });
    }
  );

  // POST /api/rewards/claim - Mark reward as claimed
  fastify.post(
    "/claim",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = validateRequest(claimRewardSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: validation.error.issues,
        });
      }

      const { sessionId, nonce } = validation.data;
      const playerId = request.user.playerId;

      const supabase = getSupabaseClient();

      // Verify session and nonce
      const { data: session, error: fetchError } = await supabase
        .from("game_sessions")
        .select("id, reward_nonce, reward_claimed")
        .eq("id", sessionId)
        .eq("player_id", playerId)
        .single();

      if (fetchError || !session) {
        return reply.status(404).send({ error: "Session not found" });
      }

      if (session.reward_claimed) {
        return reply.status(400).send({ error: "Reward already claimed" });
      }

      if (session.reward_nonce !== nonce) {
        return reply.status(400).send({ error: "Invalid nonce" });
      }

      // Check if nonce was already used
      const { data: existingNonce } = await supabase
        .from("claim_nonces")
        .select("nonce")
        .eq("nonce", nonce)
        .single();

      if (existingNonce) {
        return reply.status(400).send({ error: "Nonce already used" });
      }

      // Record nonce usage
      await supabase.from("claim_nonces").insert({
        nonce,
        player_id: playerId,
        session_id: sessionId,
      });

      // Mark reward as claimed
      const { error: updateError } = await supabase
        .from("game_sessions")
        .update({ reward_claimed: true })
        .eq("id", sessionId);

      if (updateError) {
        fastify.log.error(updateError);
        return reply.status(500).send({ error: "Failed to mark reward as claimed" });
      }

      return reply.send({ success: true });
    }
  );

  // GET /api/rewards/history - Get reward claim history
  fastify.get(
    "/history",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const playerId = request.user.playerId;
      const supabase = getSupabaseClient();

      const { data: sessions, error } = await supabase
        .from("game_sessions")
        .select("id, vsc_reward, final_score, final_wave, ended_at, reward_claimed")
        .eq("player_id", playerId)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(50);

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch reward history" });
      }

      return reply.send({
        history: sessions || [],
      });
    }
  );
}
