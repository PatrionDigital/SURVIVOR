import { formatTokenAmount } from "@survivor/sdk";
import { useVSCToken, useGearTokens, type GearSlot } from "@/hooks";

interface TokenBalanceProps {
  className?: string;
  showGear?: boolean;
}

/**
 * Displays the user's token balances ($VSC and optionally gear tokens)
 */
export function TokenBalance({ className = "", showGear = false }: TokenBalanceProps) {
  const { balance: vscBalance, isLoading: vscLoading } = useVSCToken();
  const { balances: gearBalances, isLoading: gearLoading } = useGearTokens();

  const isLoading = vscLoading || (showGear && gearLoading);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-700 rounded w-24" />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* VSC Balance */}
      <div className="flex items-center gap-2">
        <span className="text-primary-400 font-bold">$VSC</span>
        <span className="text-white font-mono">
          {vscBalance !== undefined ? formatTokenAmount(vscBalance) : "0"}
        </span>
      </div>

      {/* Gear Balances */}
      {showGear && gearBalances.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {gearBalances.map((gear) => (
            <div key={gear.slot} className="flex items-center gap-1">
              <span className="text-gray-400">${gear.symbol}</span>
              <span className="text-white font-mono">{formatTokenAmount(gear.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SingleTokenBalanceProps {
  token: "vsc" | GearSlot;
  className?: string;
  showSymbol?: boolean;
}

/**
 * Displays a single token balance (VSC or a specific gear token)
 */
export function SingleTokenBalance({
  token,
  className = "",
  showSymbol = true,
}: SingleTokenBalanceProps) {
  const { balance: vscBalance, isLoading: vscLoading } = useVSCToken();
  const { getBalance, isLoading: gearLoading } = useGearTokens();

  const isVSC = token === "vsc";
  const isLoading = isVSC ? vscLoading : gearLoading;

  if (isLoading) {
    return (
      <span className={`animate-pulse bg-gray-700 rounded w-16 h-5 inline-block ${className}`} />
    );
  }

  if (isVSC) {
    return (
      <span className={`font-mono ${className}`}>
        {showSymbol && <span className="text-primary-400">$VSC </span>}
        {vscBalance !== undefined ? formatTokenAmount(vscBalance) : "0"}
      </span>
    );
  }

  const gearBalance = getBalance(token);
  return (
    <span className={`font-mono ${className}`}>
      {showSymbol && (
        <span className="text-gray-400">${gearBalance?.symbol ?? token.toUpperCase()} </span>
      )}
      {gearBalance ? formatTokenAmount(gearBalance.balance) : "0"}
    </span>
  );
}
