/**
 * Game calculation utilities for Farcaster Survivors
 */

import type { PlayerStats, PlayerGear } from "../types/player.js";

/**
 * Calculate stat bonus from staked gear tokens
 * Using square root formula: bonus = sqrt(stakedAmount / 1e18) * multiplier
 */
export function calculateGearBonus(
  stakedAmount: bigint,
  multiplier: number = 1
): number {
  const normalized = Number(stakedAmount) / 1e18;
  return Math.sqrt(normalized) * multiplier;
}

/**
 * Calculate effective player stats with gear bonuses
 */
export function calculateEffectiveStats(
  baseStats: PlayerStats,
  gear: PlayerGear
): PlayerStats {
  return {
    maxHealth: baseStats.maxHealth + calculateGearBonus(gear.armor, 10),
    damage: baseStats.damage + calculateGearBonus(gear.weapon, 5),
    defense: baseStats.defense + calculateGearBonus(gear.armor, 2),
    moveSpeed: baseStats.moveSpeed + calculateGearBonus(gear.boots, 0.5),
    attackSpeed: baseStats.attackSpeed + calculateGearBonus(gear.gloves, 0.1),
    aoeRadius: baseStats.aoeRadius + calculateGearBonus(gear.power, 0.2),
    xpMultiplier: baseStats.xpMultiplier + calculateGearBonus(gear.amulet, 0.05),
  };
}

/**
 * Calculate VSC reward based on game performance
 */
export function calculateVscReward(
  score: number,
  wave: number,
  kills: number,
  gearMultiplier: number = 1
): bigint {
  // Base reward formula
  const baseReward = score * 0.001 + wave * 10 + kills * 0.5;
  const finalReward = baseReward * gearMultiplier;

  // Convert to token amount (18 decimals)
  return BigInt(Math.floor(finalReward * 1e18));
}

/**
 * Calculate XP needed for next level
 */
export function calculateXpForLevel(level: number): number {
  // Exponential curve: 100 * 1.5^level
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * Calculate maintenance decay percentage
 * Decays 2% per week if maintenance not paid
 */
export function calculateMaintenanceDecay(
  lastMaintenanceTimestamp: number,
  currentTimestamp: number
): number {
  const weekInSeconds = 7 * 24 * 60 * 60;
  const weeksSinceMaintenance = Math.floor(
    (currentTimestamp - lastMaintenanceTimestamp) / weekInSeconds
  );
  const decayPercentage = Math.min(weeksSinceMaintenance * 2, 100);
  return decayPercentage;
}
