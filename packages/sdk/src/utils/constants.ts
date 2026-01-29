/**
 * Game constants for Farcaster Survivors
 */

// Chain IDs
export const CHAIN_ID = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const;

// Game Configuration
export const GAME_CONFIG = {
  ARENA_WIDTH: 1920,
  ARENA_HEIGHT: 1080,
  TARGET_FPS: 60,
  MAX_ENEMIES: 500,
  MAX_PROJECTILES: 1000,
  WAVE_DURATION_SECONDS: 60,
  BOSS_WAVE_INTERVAL: 5,
} as const;

// Player Defaults
export const PLAYER_BASE_STATS = {
  MAX_HEALTH: 100,
  DAMAGE: 10,
  DEFENSE: 0,
  MOVE_SPEED: 5,
  ATTACK_SPEED: 1,
  AOE_RADIUS: 1,
  XP_MULTIPLIER: 1,
} as const;

// Token Economics
export const TOKEN_ECONOMICS = {
  BUY_FEE_BPS: 200, // 2%
  SELL_FEE_BPS: 300, // 3%
  STAKE_FEE_BPS: 500, // 5%
  TREASURY_SHARE_BPS: 6000, // 60%
  BURN_SHARE_BPS: 4000, // 40%
  MAINTENANCE_DECAY_PER_WEEK_BPS: 200, // 2%
} as const;

// Bonding Curve Parameters
export const BONDING_CURVE = {
  EXPONENT: 2,
  INITIAL_PRICE_WEI: 1000000000n, // 1 gwei
} as const;

// Session Limits
export const SESSION_LIMITS = {
  MAX_DURATION_SECONDS: 3600, // 1 hour
  HEARTBEAT_INTERVAL_SECONDS: 30,
  MAX_MISSED_HEARTBEATS: 3,
} as const;

// Anti-Fraud Thresholds
export const ANTI_FRAUD = {
  MAX_SCORE_PER_SECOND: 1000,
  MAX_KILLS_PER_SECOND: 50,
  MIN_WAVE_DURATION_SECONDS: 10,
} as const;
