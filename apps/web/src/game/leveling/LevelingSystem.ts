/**
 * Configuration for the leveling system
 */
export interface LevelingConfig {
  /** Base XP needed for first level up */
  baseXPThreshold: number;
  /** Multiplier for each subsequent level */
  scalingFactor: number;
  /** Maximum achievable level */
  maxLevel: number;
}

/**
 * Result of adding XP
 */
export interface LevelUpResult {
  /** Whether player leveled up */
  leveledUp: boolean;
  /** New level after XP added */
  newLevel: number;
  /** Number of levels gained */
  levelsGained: number;
  /** Total XP added */
  xpAdded: number;
}

/**
 * Default leveling configuration
 */
export const DEFAULT_LEVELING_CONFIG: LevelingConfig = {
  baseXPThreshold: 100,
  scalingFactor: 1.2,
  maxLevel: 100,
};

/**
 * LevelingSystem - Manages player XP and level progression
 *
 * Features:
 * - XP tracking with configurable thresholds
 * - Exponential scaling for level requirements
 * - Pending level-up queue for UI handling
 * - Progress percentage calculation
 */
export class LevelingSystem {
  private config: LevelingConfig;
  private level: number = 1;
  private currentXP: number = 0;
  private pendingLevelUps: number = 0;

  constructor(config: Partial<LevelingConfig> = {}) {
    this.config = { ...DEFAULT_LEVELING_CONFIG, ...config };
  }

  /**
   * Get current level
   */
  getLevel(): number {
    return this.level;
  }

  /**
   * Get current XP (progress toward next level)
   */
  getCurrentXP(): number {
    return this.currentXP;
  }

  /**
   * Check if player is in level-up state (has pending level ups)
   */
  isLevelingUp(): boolean {
    return this.pendingLevelUps > 0;
  }

  /**
   * Get number of pending level ups
   */
  getPendingLevelUps(): number {
    return this.pendingLevelUps;
  }

  /**
   * Calculate XP threshold for a specific level
   * Uses exponential scaling: base * scalingFactor^(level-1)
   */
  getXPThreshold(level: number): number {
    const threshold = this.config.baseXPThreshold * Math.pow(this.config.scalingFactor, level - 1);
    return Math.floor(threshold);
  }

  /**
   * Get XP needed to reach next level
   */
  getXPToNextLevel(): number {
    return this.getXPThreshold(this.level) - this.currentXP;
  }

  /**
   * Get progress toward next level as percentage (0-100)
   */
  getProgressPercent(): number {
    const threshold = this.getXPThreshold(this.level);
    if (threshold === 0) return 100;
    return Math.floor((this.currentXP / threshold) * 100);
  }

  /**
   * Add XP to the player
   * Handles level ups and carries over excess XP
   */
  addXP(amount: number): LevelUpResult {
    this.currentXP += amount;

    let levelsGained = 0;

    // Process level ups while we have enough XP and haven't hit max
    while (this.level < this.config.maxLevel && this.currentXP >= this.getXPThreshold(this.level)) {
      const threshold = this.getXPThreshold(this.level);
      this.currentXP -= threshold;
      this.level++;
      this.pendingLevelUps++;
      levelsGained++;
    }

    // Cap at max level - any excess XP is lost
    if (this.level >= this.config.maxLevel) {
      this.level = this.config.maxLevel;
      // Keep XP capped at threshold for max level
      const maxThreshold = this.getXPThreshold(this.config.maxLevel);
      if (this.currentXP > maxThreshold) {
        this.currentXP = maxThreshold;
      }
    }

    return {
      leveledUp: levelsGained > 0,
      newLevel: this.level,
      levelsGained,
      xpAdded: amount,
    };
  }

  /**
   * Consume one pending level up (called after player makes upgrade choice)
   * Returns true if a level up was consumed
   */
  consumeLevelUp(): boolean {
    if (this.pendingLevelUps <= 0) {
      return false;
    }
    this.pendingLevelUps--;
    return true;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.level = 1;
    this.currentXP = 0;
    this.pendingLevelUps = 0;
  }
}
