/**
 * Pickup type identifiers
 */
export type PickupType = "xp_gem";

/**
 * XP gem size tiers (affects value and visual)
 */
export type XPGemTier = "small" | "medium" | "large";

/**
 * Pickup component - attached to entities that can be collected
 */
export interface Pickup {
  /** Type of pickup */
  type: PickupType;
  /** XP value when collected (for xp_gem type) */
  xpValue: number;
  /** Visual tier for XP gems */
  tier?: XPGemTier;
  /** Whether this pickup is being attracted to the player */
  isAttracted: boolean;
  /** Lifetime remaining in ms (pickups despawn after a while) */
  lifetime: number;
}

/**
 * Pickup visual configuration
 */
export interface PickupVisualConfig {
  /** Color of the pickup */
  color: number;
  /** Radius in pixels */
  radius: number;
}

/**
 * XP gem tier configurations
 */
export const XP_GEM_TIERS: Record<XPGemTier, { xpValue: number; visual: PickupVisualConfig }> = {
  small: {
    xpValue: 1,
    visual: { color: 0x00ff00, radius: 5 },
  },
  medium: {
    xpValue: 5,
    visual: { color: 0x00ff88, radius: 8 },
  },
  large: {
    xpValue: 20,
    visual: { color: 0x00ffff, radius: 12 },
  },
};

/**
 * Pickup system configuration
 */
export interface PickupConfig {
  /** Distance at which pickups are attracted to player */
  magnetRange: number;
  /** Speed at which attracted pickups move toward player */
  attractionSpeed: number;
  /** Distance at which pickups are collected */
  collectionRange: number;
  /** How long pickups last before despawning (ms) */
  lifetime: number;
}

/**
 * Default pickup configuration
 */
export const DEFAULT_PICKUP_CONFIG: PickupConfig = {
  magnetRange: 100, // Start attracting within 100px
  attractionSpeed: 300, // Move at 300px/s when attracted
  collectionRange: 25, // Collect within 25px
  lifetime: 30000, // Despawn after 30 seconds
};

/**
 * Determine XP gem tier based on XP value
 */
export function getXPGemTier(xpValue: number): XPGemTier {
  if (xpValue >= 20) return "large";
  if (xpValue >= 5) return "medium";
  return "small";
}
