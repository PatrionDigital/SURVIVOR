/**
 * Types of upgrades available
 */
export type UpgradeType =
  | "damage"
  | "attackSpeed"
  | "moveSpeed"
  | "maxHealth"
  | "healthRegen"
  | "pickupRange"
  | "xpBonus";

/**
 * Upgrade definition
 */
export interface Upgrade {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of the upgrade effect */
  description: string;
  /** Type of stat this affects */
  type: UpgradeType;
  /** Value to add to the stat */
  value: number;
}

/**
 * Player stats that can be upgraded
 */
export interface PlayerStats {
  /** Weapon damage multiplier/bonus */
  damage: number;
  /** Attack speed multiplier */
  attackSpeed: number;
  /** Movement speed in pixels/second */
  moveSpeed: number;
  /** Maximum health */
  maxHealth: number;
  /** Health regeneration per second */
  healthRegen: number;
  /** Pickup magnet range in pixels */
  pickupRange: number;
  /** XP gain bonus percentage */
  xpBonus: number;
}

/**
 * Pool of available upgrades
 */
export const UPGRADE_POOL: Upgrade[] = [
  // Damage upgrades
  {
    id: "damage-1",
    name: "Sharp Bullets",
    description: "+5 Damage",
    type: "damage",
    value: 5,
  },
  {
    id: "damage-2",
    name: "Power Shot",
    description: "+10 Damage",
    type: "damage",
    value: 10,
  },

  // Attack speed upgrades
  {
    id: "attackSpeed-1",
    name: "Quick Trigger",
    description: "+10% Attack Speed",
    type: "attackSpeed",
    value: 0.1,
  },
  {
    id: "attackSpeed-2",
    name: "Rapid Fire",
    description: "+20% Attack Speed",
    type: "attackSpeed",
    value: 0.2,
  },

  // Move speed upgrades
  {
    id: "moveSpeed-1",
    name: "Light Feet",
    description: "+20 Move Speed",
    type: "moveSpeed",
    value: 20,
  },
  {
    id: "moveSpeed-2",
    name: "Sprint",
    description: "+40 Move Speed",
    type: "moveSpeed",
    value: 40,
  },

  // Max health upgrades
  {
    id: "maxHealth-1",
    name: "Vitality",
    description: "+25 Max Health",
    type: "maxHealth",
    value: 25,
  },
  {
    id: "maxHealth-2",
    name: "Fortitude",
    description: "+50 Max Health",
    type: "maxHealth",
    value: 50,
  },

  // Health regen upgrades
  {
    id: "healthRegen-1",
    name: "Regeneration",
    description: "+1 HP/sec",
    type: "healthRegen",
    value: 1,
  },
  {
    id: "healthRegen-2",
    name: "Fast Healing",
    description: "+2 HP/sec",
    type: "healthRegen",
    value: 2,
  },

  // Pickup range upgrades
  {
    id: "pickupRange-1",
    name: "Magnet",
    description: "+25 Pickup Range",
    type: "pickupRange",
    value: 25,
  },
  {
    id: "pickupRange-2",
    name: "Strong Magnet",
    description: "+50 Pickup Range",
    type: "pickupRange",
    value: 50,
  },

  // XP bonus upgrades
  {
    id: "xpBonus-1",
    name: "Wisdom",
    description: "+10% XP Gain",
    type: "xpBonus",
    value: 10,
  },
  {
    id: "xpBonus-2",
    name: "Enlightenment",
    description: "+20% XP Gain",
    type: "xpBonus",
    value: 20,
  },
];

/**
 * Generate random upgrade choices with diverse stat types
 *
 * Prioritizes selecting upgrades from different stat types to give
 * players more meaningful choices. Falls back to any available upgrade
 * if there aren't enough unique types.
 *
 * @param count - Number of choices to generate (default 3)
 * @returns Array of unique upgrade choices, preferring different types
 */
export function generateUpgradeChoices(count: number = 3): Upgrade[] {
  // Group upgrades by type
  const byType = new Map<UpgradeType, Upgrade[]>();
  for (const upgrade of UPGRADE_POOL) {
    const typeUpgrades = byType.get(upgrade.type) || [];
    typeUpgrades.push(upgrade);
    byType.set(upgrade.type, typeUpgrades);
  }

  // Shuffle the types to randomize which stats appear
  const types = [...byType.keys()].sort(() => Math.random() - 0.5);

  const choices: Upgrade[] = [];
  const usedTypes = new Set<UpgradeType>();

  // First pass: pick one random upgrade from each type (up to count)
  for (const type of types) {
    if (choices.length >= count) break;

    const typeUpgrades = byType.get(type)!;
    // Pick a random upgrade from this type
    const randomIndex = Math.floor(Math.random() * typeUpgrades.length);
    choices.push(typeUpgrades[randomIndex]);
    usedTypes.add(type);
  }

  // Second pass: if we still need more, pick from remaining upgrades
  // (this handles edge cases where count > number of types)
  if (choices.length < count) {
    const remaining = UPGRADE_POOL.filter(
      (upgrade) => !choices.some((c) => c.id === upgrade.id)
    ).sort(() => Math.random() - 0.5);

    for (const upgrade of remaining) {
      if (choices.length >= count) break;
      choices.push(upgrade);
    }
  }

  // Final shuffle to randomize presentation order
  return choices.sort(() => Math.random() - 0.5);
}

/**
 * Apply an upgrade to player stats
 *
 * @param stats - Current player stats
 * @param upgrade - Upgrade to apply
 * @returns New stats with upgrade applied (does not mutate original)
 */
export function applyUpgrade(stats: PlayerStats, upgrade: Upgrade): PlayerStats {
  const newStats = { ...stats };

  switch (upgrade.type) {
    case "damage":
      newStats.damage += upgrade.value;
      break;
    case "attackSpeed":
      newStats.attackSpeed += upgrade.value;
      break;
    case "moveSpeed":
      newStats.moveSpeed += upgrade.value;
      break;
    case "maxHealth":
      newStats.maxHealth += upgrade.value;
      break;
    case "healthRegen":
      newStats.healthRegen += upgrade.value;
      break;
    case "pickupRange":
      newStats.pickupRange += upgrade.value;
      break;
    case "xpBonus":
      newStats.xpBonus += upgrade.value;
      break;
  }

  return newStats;
}
