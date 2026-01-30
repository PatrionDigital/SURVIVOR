import { z } from "zod";

// ============ Common Schemas ============

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

export const signatureSchema = z.string().regex(/^0x[a-fA-F0-9]{130}$/, "Invalid signature");

export const uuidSchema = z.string().uuid();

// ============ Auth Schemas ============

export const authVerifySchema = z.object({
  message: z.string().min(1),
  signature: signatureSchema,
  walletAddress: addressSchema,
  farcasterFid: z.number().int().positive().optional(),
  farcasterUsername: z.string().optional(),
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type AuthVerifyInput = z.infer<typeof authVerifySchema>;
export type AuthRefreshInput = z.infer<typeof authRefreshSchema>;

// ============ Game Session Schemas ============

export const gearSnapshotSchema = z.object({
  weapon: z.string(),
  armor: z.string(),
  power: z.string(),
  gloves: z.string(),
  amulet: z.string(),
  boots: z.string(),
});

export const startSessionSchema = z.object({
  gearSnapshot: gearSnapshotSchema,
});

export const heartbeatSchema = z.object({
  sessionId: uuidSchema,
  score: z.number().int().nonnegative(),
  wave: z.number().int().positive(),
  kills: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
  checksum: z.string().min(1),
});

export const endSessionSchema = z.object({
  sessionId: uuidSchema,
  finalScore: z.number().int().nonnegative(),
  finalWave: z.number().int().positive(),
  totalKills: z.number().int().nonnegative(),
  damageDealt: z.number().int().nonnegative(),
  damageTaken: z.number().int().nonnegative(),
  xpEarned: z.number().int().nonnegative(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;

// ============ Reward Schemas ============

export const claimRewardSchema = z.object({
  sessionId: uuidSchema,
  signature: signatureSchema,
  nonce: z.string().min(1),
  deadline: z.number().int().positive(),
});

export type ClaimRewardInput = z.infer<typeof claimRewardSchema>;

// ============ Leaderboard Schemas ============

export const leaderboardQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "allTime"]).default("daily"),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export type LeaderboardQueryInput = z.infer<typeof leaderboardQuerySchema>;

// ============ Player Schemas ============

export const updatePlayerSchema = z.object({
  farcasterUsername: z.string().optional(),
});

export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;

// ============ Validation Helper ============

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
