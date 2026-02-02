/**
 * Leveling System Module
 *
 * Handles player experience, level progression, and upgrade choices.
 */

// Core leveling system
export {
  LevelingSystem,
  DEFAULT_LEVELING_CONFIG,
  type LevelingConfig,
  type LevelUpResult,
} from "./LevelingSystem";

// Upgrade system
export {
  UPGRADE_POOL,
  generateUpgradeChoices,
  applyUpgrade,
  type UpgradeType,
  type Upgrade,
  type PlayerStats,
} from "./UpgradeChoices";
