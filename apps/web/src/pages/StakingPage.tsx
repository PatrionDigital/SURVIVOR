import { Link } from "react-router-dom";
import { useGearStaking, useMaintenancePool, useWallet } from "@/hooks";
import { GearSlotCard, MaintenanceBar } from "@/components/meta";

export function StakingPage() {
  const { isConnected } = useWallet();
  const {
    stats,
    isLoading: stakingLoading,
    stake,
    unstake,
    approve: approveGear,
    isPending: stakingPending,
  } = useGearStaking();

  const {
    data: maintenanceData,
    isLoading: maintenanceLoading,
    deposit,
    withdraw,
    approve: approveVSC,
    isPending: maintenancePending,
  } = useMaintenancePool();

  const isLoading = stakingLoading || maintenanceLoading;
  const isPending = stakingPending || maintenancePending;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-400">Gear Staking</h1>
          <p className="text-gray-400 text-sm mt-1">
            Stake gear tokens to boost your in-game stats. Higher stakes = bigger bonuses!
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
              onDeposit={deposit}
              onWithdraw={withdraw}
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
                onStake={stake}
                onUnstake={unstake}
                onApprove={approveGear}
                isPending={stakingPending}
                disabled={isPending}
              />
            ))}
          </div>

          {/* Info section */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4">How Staking Works</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Gear Tokens</h3>
                <p className="text-gray-400">
                  Each gear type provides different stat bonuses. Stake more tokens to increase your
                  power and unlock higher tiers.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Power Calculation</h3>
                <p className="text-gray-400">
                  Power = sqrt(staked amount). Higher tiers unlock at 100, 1K, 10K, and 100K tokens
                  staked.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Maintenance</h3>
                <p className="text-gray-400">
                  Keep your maintenance pool above 100% threshold for a +50% total power bonus.
                  Decay is 1% per week.
                </p>
              </div>
            </div>
          </div>

          {/* Fee info */}
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>5% fee on staking goes to treasury. No fee on unstaking.</p>
          </div>
        </>
      )}
    </div>
  );
}
