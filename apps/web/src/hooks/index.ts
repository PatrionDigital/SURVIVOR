export { useMiniApp } from "./useMiniApp";
export type { MiniAppContext, UseMiniAppReturn } from "./useMiniApp";

export { useWallet } from "./useWallet";
export type { ConnectionState, UseWalletReturn } from "./useWallet";

export { useVSCToken } from "./useVSCToken";
export type { UseVSCTokenReturn } from "./useVSCToken";

export { useGearTokens } from "./useGearTokens";
export type { GearSlot, GearTokenBalance, UseGearTokensReturn } from "./useGearTokens";

export { useGearStaking, TIER_NAMES, TIER_COLORS } from "./useGearStaking";
export type {
  GearSlotIndex,
  GearSlotData,
  PlayerStats,
  UseGearStakingReturn,
} from "./useGearStaking";

export { useMaintenancePool } from "./useMaintenancePool";
export type { MaintenanceData, UseMaintenancePoolReturn } from "./useMaintenancePool";

export { useBondingCurve } from "./useBondingCurve";
export type { BondingCurveData, UseBondingCurveReturn } from "./useBondingCurve";

export { useRewardDistributor, RewardType } from "./useRewardDistributor";
export type { RewardClaimData, UseRewardDistributorReturn } from "./useRewardDistributor";

export { useGameSession } from "./useGameSession";
export type { RewardClaimData as GameRewardData } from "./useGameSession";

export { usePlayerProfile } from "./usePlayerProfile";
export type {
  PlayerProfile,
  PlayerStats as ProfilePlayerStats,
  GameSession,
  UsePlayerProfileReturn,
} from "./usePlayerProfile";

export { useGlobalUpgrades, UPGRADE_TYPES } from "./useGlobalUpgrades";
export type { UpgradeType, UpgradeData, UseGlobalUpgradesReturn } from "./useGlobalUpgrades";

export { useLeaderboard } from "./useLeaderboard";
export type { LeaderboardPeriod, LeaderboardEntry, UseLeaderboardReturn } from "./useLeaderboard";

export { useNotifications } from "./useNotifications";
export type { UseNotificationsReturn } from "./useNotifications";
