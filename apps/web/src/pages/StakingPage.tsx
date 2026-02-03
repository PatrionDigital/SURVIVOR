import { Link } from "react-router-dom";
import { useCallback } from "react";
import {
  useGearStaking,
  useMaintenancePool,
  useWallet,
  useBondingCurve,
  useVSCToken,
  useGearTokens,
} from "@/hooks";
import type { GearSlot } from "@/hooks/useBondingCurve";
import type { GearSlotIndex } from "@/hooks/useGearStaking";
import { GearSlotCard, MaintenanceBar } from "@/components/meta";

export function StakingPage() {
  const { isConnected } = useWallet();

  // Staking hooks
  const {
    stats,
    isLoading: stakingLoading,
    stake,
    unstake,
    approve: approveGear,
    isPending: stakingPending,
    refetch: refetchStaking,
  } = useGearStaking();

  // Maintenance pool hooks
  const {
    data: maintenanceData,
    isLoading: maintenanceLoading,
    deposit,
    withdraw,
    approve: approveVSC,
    isPending: maintenancePending,
    refetch: refetchMaintenance,
  } = useMaintenancePool();

  // Bonding curve hooks
  const {
    curves,
    isLoading: curvesLoading,
    buy,
    sell,
    approveVsc,
    vscAllowance,
    isPending: curvePending,
  } = useBondingCurve();

  // VSC token balance
  const { formattedBalance: vscBalance, refetch: refetchVsc } = useVSCToken();

  // Gear token balances (for wallet balance refresh)
  const { refetch: refetchGear } = useGearTokens();

  // Refetch all balances
  const refetchAll = useCallback(() => {
    refetchVsc();
    refetchGear();
    refetchStaking();
    refetchMaintenance();
  }, [refetchVsc, refetchGear, refetchStaking, refetchMaintenance]);

  // Wrap actions to refetch balances after transaction
  const handleStake = useCallback(
    async (slot: GearSlotIndex, amount: string) => {
      await stake(slot, amount);
      refetchAll();
    },
    [stake, refetchAll]
  );

  const handleUnstake = useCallback(
    async (slot: GearSlotIndex, amount: string) => {
      await unstake(slot, amount);
      refetchAll();
    },
    [unstake, refetchAll]
  );

  const handleBuy = useCallback(
    async (slot: GearSlot, vscAmount: string, minTokensOut: string) => {
      await buy(slot, vscAmount, minTokensOut);
      refetchAll();
    },
    [buy, refetchAll]
  );

  const handleSell = useCallback(
    async (slot: GearSlot, tokenAmount: string, minVscOut: string) => {
      await sell(slot, tokenAmount, minVscOut);
      refetchAll();
    },
    [sell, refetchAll]
  );

  const handleDeposit = useCallback(
    async (amount: string) => {
      await deposit(amount);
      refetchAll();
    },
    [deposit, refetchAll]
  );

  const handleWithdraw = useCallback(
    async (amount: string) => {
      await withdraw(amount);
      refetchAll();
    },
    [withdraw, refetchAll]
  );

  const isLoading = stakingLoading || maintenanceLoading || curvesLoading;
  const isPending = stakingPending || maintenancePending || curvePending;

  // Get current price for a slot
  const getCurvePrice = (slot: string): string | undefined => {
    const curve = curves.find((c) => c.slot === slot);
    return curve?.formattedPrice;
  };

  // Get VSC allowance for a slot's bonding curve
  const getVscAllowance = (slot: string): bigint => {
    return vscAllowance(slot as GearSlot);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-400">Gear Staking</h1>
          <p className="text-gray-400 text-sm mt-1">
            Stake gear tokens to boost your in-game stats. Buy and sell gear on the bonding curve!
          </p>
        </div>
        <Link to="/" className="text-gray-400 hover:text-white transition-colors">
          Back
        </Link>
      </div>

      {/* Connection check */}
      {!isConnected ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to view and manage your gear stakes</p>
        </div>
      ) : isLoading ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-400">Loading staking data...</p>
        </div>
      ) : (
        <>
          {/* Total power display */}
          {stats && (
            <div className="bg-gradient-to-r from-gray-800 to-gray-800/50 rounded-lg p-6 mb-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Power</p>
                  <p className="text-3xl font-bold text-white">
                    {Number(stats.formattedTotalPower).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">VSC Balance</p>
                  <p className="text-xl font-bold text-game-xp">
                    {Number(vscBalance).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Maintenance Bonus</p>
                  <p
                    className={`text-xl font-bold ${
                      stats.maintenanceActive ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    {stats.maintenanceActive ? "+50% Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance pool */}
          <div className="mb-6">
            <MaintenanceBar
              data={maintenanceData}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onApprove={approveVSC}
              isPending={maintenancePending}
              disabled={isPending}
            />
          </div>

          {/* Gear slots grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats?.slots.map((slotData) => (
              <GearSlotCard
                key={slotData.slot}
                slotData={slotData}
                onStake={handleStake}
                onUnstake={handleUnstake}
                onApprove={approveGear}
                onBuy={handleBuy}
                onSell={handleSell}
                onApproveVsc={approveVsc}
                currentPrice={getCurvePrice(slotData.slot)}
                vscBalance={vscBalance}
                vscAllowance={getVscAllowance(slotData.slot)}
                isPending={isPending}
                disabled={isPending}
              />
            ))}
          </div>

          {/* Info section */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Buy Gear</h3>
                <p className="text-gray-400">
                  Use VSC to buy gear tokens on the bonding curve. Price increases as supply grows.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Stake Gear</h3>
                <p className="text-gray-400">
                  Stake gear tokens for stat bonuses. Higher tiers unlock at 100, 1K, 10K, 100K.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Sell Gear</h3>
                <p className="text-gray-400">
                  Sell gear tokens back to the curve for VSC. Price decreases as supply shrinks.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Maintenance</h3>
                <p className="text-gray-400">
                  Keep maintenance above 100% for +50% total power. Decay is 1% per week.
                </p>
              </div>
            </div>
          </div>

          {/* Fee info */}
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>Buy: 2% fee | Sell: 3% fee | Stake: 5% fee | Unstake: No fee</p>
          </div>
        </>
      )}
    </div>
  );
}
