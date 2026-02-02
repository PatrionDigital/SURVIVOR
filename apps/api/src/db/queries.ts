/**
 * Database Query Functions
 *
 * Typed query functions for all database operations.
 * Uses the Supabase-compatible client from db.ts.
 */

import { getSupabaseClient } from "../lib/db.js";
import type {
  Player,
  PlayerInsert,
  PlayerUpdate,
  GameSession,
  GameSessionInsert,
  GameSessionEnd,
  SessionHeartbeat,
  SessionHeartbeatInsert,
  DailyReward,
  Achievement,
  LeaderboardEntry,
  NotificationToken,
  DailyRewardsSummary,
} from "./types.js";

// ============================================================================
// Player Queries
// ============================================================================

/**
 * Get a player by ID
 */
export async function getPlayerById(id: string): Promise<Player | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("players").select("*").eq("id", id).single();

  if (error) {
    console.error("Error fetching player:", error);
    return null;
  }
  return data as Player;
}

/**
 * Get a player by wallet address
 */
export async function getPlayerByWallet(walletAddress: string): Promise<Player | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (error && error.message !== "Row not found") {
    console.error("Error fetching player by wallet:", error);
    return null;
  }
  return data as Player | null;
}

/**
 * Get a player by Farcaster FID
 */
export async function getPlayerByFid(fid: number): Promise<Player | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("farcaster_fid", fid)
    .single();

  if (error && error.message !== "Row not found") {
    console.error("Error fetching player by FID:", error);
    return null;
  }
  return data as Player | null;
}

/**
 * Create a new player
 */
export async function createPlayer(player: PlayerInsert): Promise<Player | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      wallet_address: player.wallet_address.toLowerCase(),
      farcaster_fid: player.farcaster_fid ?? null,
      farcaster_username: player.farcaster_username ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating player:", error);
    return null;
  }
  return data as Player;
}

/**
 * Update a player
 */
export async function updatePlayer(id: string, updates: PlayerUpdate): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("players").update(updates).eq("id", id);

  if (error) {
    console.error("Error updating player:", error);
    return false;
  }
  return true;
}

/**
 * Upsert a player (create or update by wallet address)
 */
export async function upsertPlayer(player: PlayerInsert): Promise<Player | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("players")
    .upsert(
      {
        wallet_address: player.wallet_address.toLowerCase(),
        farcaster_fid: player.farcaster_fid ?? null,
        farcaster_username: player.farcaster_username ?? null,
      },
      { onConflict: "wallet_address" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting player:", error);
    return null;
  }
  return data as Player;
}

// ============================================================================
// Game Session Queries
// ============================================================================

/**
 * Get a game session by ID
 */
export async function getSessionById(id: string): Promise<GameSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("game_sessions").select("*").eq("id", id).single();

  if (error) {
    console.error("Error fetching session:", error);
    return null;
  }
  return data as GameSession;
}

/**
 * Get the active session for a player (if any)
 */
export async function getActiveSession(playerId: string): Promise<GameSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("player_id", playerId)
    .eq("status", "active")
    .single();

  if (error && error.message !== "Row not found") {
    console.error("Error fetching active session:", error);
    return null;
  }
  return data as GameSession | null;
}

/**
 * Create a new game session
 */
export async function createSession(session: GameSessionInsert): Promise<GameSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      player_id: session.player_id,
      gear_snapshot: session.gear_snapshot ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    return null;
  }
  return data as GameSession;
}

/**
 * End a game session with final stats
 */
export async function endSession(
  sessionId: string,
  playerId: string,
  endData: GameSessionEnd
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: endData.status,
      ended_at: endData.ended_at,
      final_score: endData.final_score,
      final_wave: endData.final_wave,
      total_kills: endData.total_kills,
      damage_dealt: endData.damage_dealt,
      damage_taken: endData.damage_taken,
      xp_earned: endData.xp_earned,
      vsc_reward: endData.vsc_reward,
      reward_signature: endData.reward_signature,
      reward_nonce: endData.reward_nonce,
      reward_expiry: endData.reward_expiry,
      survival_time: endData.survival_time,
      level_reached: endData.level_reached,
    })
    .eq("id", sessionId)
    .eq("player_id", playerId);

  if (error) {
    console.error("Error ending session:", error);
    return false;
  }
  return true;
}

/**
 * Abandon a session (mark as abandoned without stats)
 */
export async function abandonSession(sessionId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: "abandoned",
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Error abandoning session:", error);
    return false;
  }
  return true;
}

/**
 * Mark a session's reward as claimed
 */
export async function markSessionClaimed(sessionId: string, playerId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("game_sessions")
    .update({ reward_claimed: true })
    .eq("id", sessionId)
    .eq("player_id", playerId);

  if (error) {
    console.error("Error marking session claimed:", error);
    return false;
  }
  return true;
}

/**
 * Get unclaimed sessions for a player
 */
export async function getUnclaimedSessions(playerId: string): Promise<GameSession[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("player_id", playerId)
    .eq("status", "completed")
    .eq("reward_claimed", false);

  if (error) {
    console.error("Error fetching unclaimed sessions:", error);
    return [];
  }
  return (data as GameSession[]) || [];
}

// ============================================================================
// Heartbeat Queries
// ============================================================================

/**
 * Record a session heartbeat
 */
export async function createHeartbeat(heartbeat: SessionHeartbeatInsert): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("session_heartbeats").insert({
    session_id: heartbeat.session_id,
    score: heartbeat.score,
    wave: heartbeat.wave,
    kills: heartbeat.kills,
    timestamp: heartbeat.timestamp,
    checksum: heartbeat.checksum,
  });

  if (error) {
    console.error("Error creating heartbeat:", error);
    return false;
  }
  return true;
}

/**
 * Get all heartbeats for a session
 */
export async function getSessionHeartbeats(sessionId: string): Promise<SessionHeartbeat[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("session_heartbeats")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error fetching heartbeats:", error);
    return [];
  }
  return (data as SessionHeartbeat[]) || [];
}

// ============================================================================
// Daily Rewards Queries
// ============================================================================

/**
 * Get today's daily reward summary for a player
 */
export async function getDailyRewardsSummary(playerId: string): Promise<DailyRewardsSummary> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_daily_rewards_summary", {
    p_player_id: playerId,
  });

  if (error) {
    console.error("Error fetching daily rewards summary:", error);
    return {
      total_earned: "0",
      games_played: 0,
      remaining_cap: "10000000000000000000000", // 10,000 VSC in wei
    };
  }

  // The RPC returns a table, so data is an array
  const summary = Array.isArray(data) ? data[0] : data;
  return summary as DailyRewardsSummary;
}

/**
 * Record a daily reward
 */
export async function recordDailyReward(playerId: string, vscAmount: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("record_daily_reward", {
    p_player_id: playerId,
    p_vsc_amount: vscAmount,
  });

  if (error) {
    console.error("Error recording daily reward:", error);
    return false;
  }
  return true;
}

/**
 * Get daily rewards history for a player
 */
export async function getDailyRewardsHistory(playerId: string, limit = 30): Promise<DailyReward[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("daily_rewards")
    .select("*")
    .eq("player_id", playerId);

  if (error) {
    console.error("Error fetching daily rewards history:", error);
    return [];
  }
  // Sort by date descending and apply limit
  const sorted = ((data as DailyReward[]) || []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sorted.slice(0, limit);
}

// ============================================================================
// Leaderboard Queries
// ============================================================================

/**
 * Get leaderboard entries for a period
 */
export async function getLeaderboard(
  period: "daily" | "weekly" | "all_time",
  limit = 50,
  offset = 0
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("*")
    .eq("period", period);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  // Sort by score descending and apply pagination
  const sorted = ((data as LeaderboardEntry[]) || []).sort(
    (a, b) => Number(b.score) - Number(a.score)
  );
  return sorted.slice(offset, offset + limit);
}

/**
 * Get a player's rank for a period
 */
export async function getPlayerRank(playerId: string, period: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_player_rank", {
    p_player_id: playerId,
    p_period: period,
  });

  if (error) {
    console.error("Error fetching player rank:", error);
    return 0;
  }
  return data as number;
}

// ============================================================================
// Achievement Queries
// ============================================================================

/**
 * Get all achievements for a player
 */
export async function getPlayerAchievements(playerId: string): Promise<Achievement[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("achievements").select("*").eq("player_id", playerId);

  if (error) {
    console.error("Error fetching achievements:", error);
    return [];
  }
  return (data as Achievement[]) || [];
}

/**
 * Unlock an achievement for a player
 */
export async function unlockAchievement(
  playerId: string,
  achievementType: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("achievements")
    .upsert(
      {
        player_id: playerId,
        achievement_type: achievementType,
        metadata: metadata ?? null,
      },
      { onConflict: "player_id,achievement_type" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error unlocking achievement:", error);
    return false;
  }
  return true;
}

// ============================================================================
// Nonce Queries
// ============================================================================

/**
 * Check if a nonce has been used
 */
export async function isNonceUsed(nonce: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("check_nonce_used", {
    p_nonce: nonce,
  });

  if (error) {
    console.error("Error checking nonce:", error);
    return true; // Assume used on error for safety
  }
  return data as boolean;
}

/**
 * Mark a nonce as used
 */
export async function useNonce(
  nonce: string,
  playerId: string,
  sessionId?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("use_nonce", {
    p_nonce: nonce,
    p_player_id: playerId,
    p_session_id: sessionId ?? null,
  });

  if (error) {
    console.error("Error using nonce:", error);
    return false;
  }
  return data as boolean;
}

// ============================================================================
// Notification Token Queries
// ============================================================================

/**
 * Save or update a notification token for a player
 */
export async function saveNotificationToken(
  playerId: string,
  token: string,
  platform = "farcaster"
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("notification_tokens")
    .upsert(
      {
        player_id: playerId,
        token,
        platform,
      },
      { onConflict: "player_id,platform" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving notification token:", error);
    return false;
  }
  return true;
}

/**
 * Get notification token for a player
 */
export async function getNotificationToken(
  playerId: string,
  platform = "farcaster"
): Promise<NotificationToken | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notification_tokens")
    .select("*")
    .eq("player_id", playerId)
    .eq("platform", platform)
    .single();

  if (error && error.message !== "Row not found") {
    console.error("Error fetching notification token:", error);
    return null;
  }
  return data as NotificationToken | null;
}

// ============================================================================
// Player Stats (RPC wrapper)
// ============================================================================

/**
 * Update player stats after a game session
 */
export async function updatePlayerStats(
  playerId: string,
  score: number,
  wave: number,
  vscEarned: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("update_player_stats", {
    p_player_id: playerId,
    p_score: score,
    p_wave: wave,
    p_vsc: vscEarned,
  });

  if (error) {
    console.error("Error updating player stats:", error);
    return false;
  }
  return true;
}
