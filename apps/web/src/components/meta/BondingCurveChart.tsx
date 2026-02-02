import { useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { formatUnits } from "viem";

interface BondingCurveChartProps {
  symbol: string;
  currentSupply: bigint;
  currentPrice: bigint;
  color: string;
}

// Bonding curve constants (matching contract)
const BASE_PRICE = 1n * 10n ** 18n; // 1 VSC
const SLOPE = 10n ** 14n; // 1e14

/**
 * Calculate price at a given supply using the polynomial bonding curve formula
 * Price = BASE_PRICE + (SLOPE × Supply² / 1e36)
 */
function calculatePrice(supply: bigint): bigint {
  const supplySquared = supply * supply;
  const slopeComponent = (SLOPE * supplySquared) / (10n ** 36n);
  return BASE_PRICE + slopeComponent;
}

/**
 * Format large numbers for display (1K, 1M, etc.)
 */
function formatNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(1);
}

export function BondingCurveChart({
  symbol,
  currentSupply,
  currentPrice,
  color,
}: BondingCurveChartProps) {
  // Generate data points for the curve
  const chartData = useMemo(() => {
    const points: Array<{ supply: number; price: number }> = [];
    const currentSupplyNum = Number(formatUnits(currentSupply, 18));

    // Calculate max supply to show (2x current supply or minimum 10K)
    const maxSupply = Math.max(currentSupplyNum * 2, 10000);

    // Generate 50 points along the curve
    const step = maxSupply / 50;

    for (let i = 0; i <= 50; i++) {
      const supplyNum = i * step;
      const supplyBigInt = BigInt(Math.floor(supplyNum * 1e18));
      const priceBigInt = calculatePrice(supplyBigInt);
      const priceNum = Number(formatUnits(priceBigInt, 18));

      points.push({
        supply: supplyNum,
        price: priceNum,
      });
    }

    return points;
  }, [currentSupply]);

  const currentSupplyNum = Number(formatUnits(currentSupply, 18));
  const currentPriceNum = Number(formatUnits(currentPrice, 18));

  // Custom tooltip - memoized to prevent recreation
  const CustomTooltip = useCallback(
    ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { supply: number } }> }) => {
      if (active && payload && payload.length > 0) {
        return (
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
            <p className="text-gray-400 text-xs">Supply</p>
            <p className="text-white font-bold">{formatNumber(payload[0].payload.supply)} {symbol}</p>
            <p className="text-gray-400 text-xs mt-1">Price</p>
            <p className="text-cyan-400 font-bold">{payload[0].value.toFixed(4)} VSC</p>
          </div>
        );
      }
      return null;
    },
    [symbol]
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
        // Workaround for Recharts 3 warning - provide initial dimensions
        // See: https://github.com/recharts/recharts/issues/6716
        initialDimension={{ width: 300, height: 256 }}
      >
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="supply"
            stroke="#9CA3AF"
            fontSize={10}
            tickFormatter={formatNumber}
            tickLine={false}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={10}
            tickFormatter={(value) => `${value.toFixed(1)}`}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${symbol})`}
          />
          {/* Current position marker */}
          {currentSupplyNum > 0 && (
            <>
              <ReferenceLine
                x={currentSupplyNum}
                stroke="#FBBF24"
                strokeDasharray="5 5"
                strokeWidth={1}
              />
              <ReferenceDot
                x={currentSupplyNum}
                y={currentPriceNum}
                r={6}
                fill="#FBBF24"
                stroke="#FFF"
                strokeWidth={2}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
