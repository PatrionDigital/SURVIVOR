/**
 * Contract ABIs for Farcaster Survivors
 * Minimal ABIs for frontend interactions
 */

// ERC20 ABI - balanceOf, symbol, decimals, name
export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

// VSCToken ABI - extends ERC20 with mint capability check
export const vscTokenAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "MAX_SUPPLY",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// GearToken ABI - same as ERC20 for balance reading
export const gearTokenAbi = erc20Abi;

// GearStaking ABI - for staking gear tokens
export const gearStakingAbi = [
  // Read functions
  {
    type: "function",
    name: "stakedAmounts",
    inputs: [
      { name: "player", type: "address" },
      { name: "slot", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getGearPower",
    inputs: [
      { name: "player", type: "address" },
      { name: "slot", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTotalPower",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTotalStaked",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTier",
    inputs: [{ name: "stakedAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getPlayerStats",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "stakedAmounts", type: "uint256[6]" },
          { name: "slotPowers", type: "uint256[6]" },
          { name: "totalPower", type: "uint256" },
          { name: "maintenanceActive", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gearTokens",
    inputs: [{ name: "slot", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "treasury",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maintenancePool",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  // Write functions
  {
    type: "function",
    name: "stake",
    inputs: [
      { name: "slot", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unstake",
    inputs: [
      { name: "slot", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "TokensStaked",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "slot", type: "uint8", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TokensUnstaked",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "slot", type: "uint8", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// MaintenancePool ABI - for maintenance deposits
export const maintenancePoolAbi = [
  // Read functions
  {
    type: "function",
    name: "getPoolBalance",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getThreshold",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMaintenanceStatus",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMaintenancePercentage",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPendingDecay",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRawMaintenanceData",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "lastUpdate", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vscToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gearStaking",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maintenanceMultiplierBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Write functions
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "applyDecay",
    inputs: [{ name: "player", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "MaintenanceDeposited",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "newBalance", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MaintenanceWithdrawn",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "newBalance", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DecayApplied",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "decayAmount", type: "uint256", indexed: false },
      { name: "newBalance", type: "uint256", indexed: false },
    ],
  },
] as const;

// RewardDistributor ABI - for gameplay reward claims
export const rewardDistributorAbi = [
  // Read functions
  {
    type: "function",
    name: "getDailyClaimed",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getGlobalDailyClaimed",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isNonceUsed",
    inputs: [
      { name: "player", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLastClaimTime",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRemainingDailyAllowance",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRemainingGlobalAllowance",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "canClaim",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "authorizedSigner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "dailyPlayerCap",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "globalDailyCap",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Write functions
  {
    type: "function",
    name: "claim",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "rewardType", type: "uint8" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "RewardClaimed",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "rewardType", type: "uint8", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
] as const;

// ERC20BondingCurve ABI - for buying/selling gear tokens with VSC
export const bondingCurveAbi = [
  // Read functions
  {
    type: "function",
    name: "baseToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "token",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentPrice",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSpotPrice",
    inputs: [{ name: "supply", type: "uint256" }],
    outputs: [{ name: "price", type: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "calculateBuyReturn",
    inputs: [{ name: "baseAmount", type: "uint256" }],
    outputs: [
      { name: "tokensOut", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateSellReturn",
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    outputs: [
      { name: "baseOut", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buyFeeBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sellFeeBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "treasury",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  // Write functions
  {
    type: "function",
    name: "buy",
    inputs: [
      { name: "baseAmount", type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
    ],
    outputs: [{ name: "tokensReceived", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [
      { name: "tokenAmount", type: "uint256" },
      { name: "minBaseOut", type: "uint256" },
    ],
    outputs: [{ name: "baseReceived", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "TokensBought",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "baseAmount", type: "uint256", indexed: false },
      { name: "tokensReceived", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TokensSold",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "tokenAmount", type: "uint256", indexed: false },
      { name: "baseReceived", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
] as const;

// GlobalUpgradeNFT ABI - for purchasing permanent upgrades
export const globalUpgradeNftAbi = [
  // Constants
  {
    type: "function",
    name: "BASE_COST",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ESCALATION_MULTIPLIER",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_PER_TYPE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "UPGRADE_TYPES",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Read functions
  {
    type: "function",
    name: "getMintCost",
    inputs: [
      { name: "player", type: "address" },
      { name: "upgradeType", type: "uint256" },
    ],
    outputs: [{ name: "cost", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUpgradeCount",
    inputs: [
      { name: "player", type: "address" },
      { name: "upgradeType", type: "uint256" },
    ],
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllUpgrades",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "upgrades", type: "uint256[7]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vscToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  // Write functions
  {
    type: "function",
    name: "mint",
    inputs: [{ name: "upgradeType", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "UpgradeMinted",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "upgradeType", type: "uint256", indexed: true },
      { name: "cost", type: "uint256", indexed: false },
    ],
  },
] as const;
