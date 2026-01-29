/**
 * Game state types for Farcaster Survivors
 */

export type GamePhase = "menu" | "playing" | "paused" | "results";

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface GameConfig {
  arenaWidth: number;
  arenaHeight: number;
  targetFps: number;
  maxEnemies: number;
  maxProjectiles: number;
}

export interface WaveConfig {
  waveNumber: number;
  duration: number;
  enemySpawnRate: number;
  enemyTypes: string[];
  bossWave: boolean;
}

export interface GameSession {
  id: string;
  playerId: string;
  startedAt: Date;
  endedAt?: Date;
  score: number;
  wave: number;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  xpEarned: number;
  vscEarned: bigint;
}
