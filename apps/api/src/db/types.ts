/**
 * Database Entity Types
 *
 * TypeScript interfaces for all database tables.
 */

export interface Player {
  id: string;
  wallet_address: string;
  farcaster_fid: number | null;
  farcaster_username: string | null;
  created_at: string;
  updated_at: string;
  last_played_at: string | null;
  total_games_played: number;
  total_vsc_earned: string; // numeric as string
  highest_wave: number;
  highest_score: string; // bigint as string
}

export interface PlayerInsert {
  wallet_address: string;
  farcaster_fid?: number | null;
  farcaster_username?: string | null;
}

export interface PlayerUpdate {
  farcaster_fid?: number | null;
  farcaster_username?: string | null;
  last_played_at?: string;
}

export interface GameSession {
  id: string;
  player_id: string;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "abandoned" | "invalid";
  final_score: string;
  final_wave: number;
  total_kills: number;
  damage_dealt: string;
  damage_taken: string;
  xp_earned: string;
  vsc_reward: string;
  reward_claimed: boolean;
  reward_signature: string | null;
  reward_nonce: string | null;
  gear_snapshot: Record<string, unknown> | null;
  created_at: string;
  survival_time: number | null;
  level_reached: number;
  reward_expiry: string | null;
}

export interface GameSessionInsert {
  player_id: string;
  gear_snapshot?: Record<string, unknown> | null;
}

export interface GameSessionEnd {
  status: "completed" | "abandoned";
  ended_at: string;
  final_score: number;
  final_wave: number;
  total_kills: number;
  damage_dealt: number;
  damage_taken: number;
  xp_earned: number;
  vsc_reward: string;
  reward_signature?: string;
  reward_nonce?: string;
  reward_expiry?: string;
  survival_time?: number;
  level_reached?: number;
}

export interface SessionHeartbeat {
  id: string;
  session_id: string;
  score: string;
  wave: number;
  kills: number;
  timestamp: number;
  checksum: string;
  server_time: string;
  is_valid: boolean;
}

export interface SessionHeartbeatInsert {
  session_id: string;
  score: number;
  wave: number;
  kills: number;
  timestamp: number;
  checksum: string;
}

export interface DailyReward {
  id: string;
  player_id: string;
  date: string;
  total_vsc_earned: string;
  games_played: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  player_id: string;
  achievement_type: string;
  unlocked_at: string;
  metadata: Record<string, unknown> | null;
}

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  period: "daily" | "weekly" | "all_time";
  period_start: string;
  score: string;
  wave: number;
  rank: number | null;
  session_id: string | null;
  created_at: string;
  // Joined data
  players?: Pick<Player, "id" | "farcaster_username" | "wallet_address">;
}

export interface NotificationToken {
  id: string;
  player_id: string;
  token: string;
  url: string | null;
  platform: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimNonce {
  nonce: string;
  player_id: string;
  session_id: string | null;
  used_at: string;
}

// Query result types
export interface DailyRewardsSummary {
  total_earned: string;
  games_played: number;
  remaining_cap: string;
}
