/**
 * API request/response types for Farcaster Survivors
 */

// Auth
export interface AuthRequest {
  message: string;
  signature: `0x${string}`;
  walletAddress: `0x${string}`;
}

export interface AuthResponse {
  token: string;
  expiresAt: number;
  player: {
    id: string;
    walletAddress: string;
    farcasterFid?: number;
  };
}

// Game Sessions
export interface StartSessionRequest {
  gearSnapshot: {
    weapon: string;
    armor: string;
    power: string;
    gloves: string;
    amulet: string;
    boots: string;
  };
}

export interface StartSessionResponse {
  sessionId: string;
  serverTime: number;
}

export interface HeartbeatRequest {
  sessionId: string;
  score: number;
  wave: number;
  kills: number;
  timestamp: number;
  checksum: string;
}

export interface EndSessionRequest {
  sessionId: string;
  finalScore: number;
  finalWave: number;
  totalKills: number;
  damageDealt: number;
  damageTaken: number;
  xpEarned: number;
}

export interface EndSessionResponse {
  vscReward: string;
  rewardSignature: `0x${string}`;
  nonce: string;
  deadline: number;
}

// Rewards
export interface ClaimRewardRequest {
  sessionId: string;
  signature: `0x${string}`;
  nonce: string;
  deadline: number;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username?: string;
  score: number;
  wave: number;
  timestamp: Date;
}

export interface LeaderboardResponse {
  period: "daily" | "weekly" | "allTime";
  entries: LeaderboardEntry[];
  userRank?: number;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
