// Pickup system exports
export type {
  Pickup,
  PickupType,
  XPGemTier,
  PickupVisualConfig,
  PickupConfig,
} from "./types";
export { XP_GEM_TIERS, DEFAULT_PICKUP_CONFIG, getXPGemTier } from "./types";
export { createXPGem, destroyPickup } from "./PickupFactory";
export { pickupAttractionSystem } from "./PickupAttractionSystem";
export { pickupCollectionSystem, type CollectionResult } from "./PickupCollectionSystem";
