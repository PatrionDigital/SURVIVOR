/**
 * Token-related types for Farcaster Survivors
 */

export interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
}

export interface GearTokenInfo extends TokenInfo {
  gearSlot: string;
  statBonus: string;
}

export const VSC_TOKEN_SYMBOL = "VSC";
export const VSC_TOKEN_DECIMALS = 18;
export const VSC_MAX_SUPPLY = 100_000_000_000n * 10n ** 18n; // 100B

export const GEAR_TOKEN_SYMBOLS = {
  weapon: "WEAPON",
  armor: "ARMOR",
  power: "POWER",
  gloves: "GLOVES",
  amulet: "AMULET",
  boots: "BOOTS",
} as const;

export type GearTokenSymbol = (typeof GEAR_TOKEN_SYMBOLS)[keyof typeof GEAR_TOKEN_SYMBOLS];

export interface BondingCurvePriceQuote {
  tokenAmount: bigint;
  ethAmount: bigint;
  fee: bigint;
  priceImpact: number;
}

export interface StakingPosition {
  gearSlot: string;
  amount: bigint;
  stakedAt: Date;
  lastMaintenanceAt: Date;
  effectiveBonus: number;
}
