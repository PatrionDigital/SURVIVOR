/**
 * Player-related types for Farcaster Survivors
 */

export interface PlayerStats {
  maxHealth: number;
  damage: number;
  defense: number;
  moveSpeed: number;
  attackSpeed: number;
  aoeRadius: number;
  xpMultiplier: number;
}

export interface PlayerProfile {
  id: string;
  walletAddress: string;
  farcasterFid?: number;
  farcasterUsername?: string;
  createdAt: Date;
  lastPlayedAt?: Date;
  totalGamesPlayed: number;
  totalVscEarned: bigint;
  highestWave: number;
  highestScore: number;
}

export interface PlayerGear {
  weapon: bigint;
  armor: bigint;
  power: bigint;
  gloves: bigint;
  amulet: bigint;
  boots: bigint;
}

export type GearSlot = keyof PlayerGear;

export const GEAR_SLOTS: GearSlot[] = [
  "weapon",
  "armor",
  "power",
  "gloves",
  "amulet",
  "boots",
];
