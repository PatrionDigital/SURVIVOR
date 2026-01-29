/**
 * Contract addresses for Farcaster Survivors
 * Updated after each deployment
 */

export const CONTRACT_ADDRESSES = {
  // Base Mainnet (Chain ID: 8453)
  mainnet: {
    vscToken: "" as `0x${string}`,
    bondingCurve: "" as `0x${string}`,
    gearStaking: "" as `0x${string}`,
    maintenancePool: "" as `0x${string}`,
    rewardDistributor: "" as `0x${string}`,
    globalUpgradeNFT: "" as `0x${string}`,
    earlyAdopterNFT: "" as `0x${string}`,
    gearTokens: {
      weapon: "" as `0x${string}`,
      armor: "" as `0x${string}`,
      power: "" as `0x${string}`,
      gloves: "" as `0x${string}`,
      amulet: "" as `0x${string}`,
      boots: "" as `0x${string}`,
    },
  },
  // Base Sepolia (Chain ID: 84532)
  testnet: {
    vscToken: "" as `0x${string}`,
    bondingCurve: "" as `0x${string}`,
    gearStaking: "" as `0x${string}`,
    maintenancePool: "" as `0x${string}`,
    rewardDistributor: "" as `0x${string}`,
    globalUpgradeNFT: "" as `0x${string}`,
    earlyAdopterNFT: "" as `0x${string}`,
    gearTokens: {
      weapon: "" as `0x${string}`,
      armor: "" as `0x${string}`,
      power: "" as `0x${string}`,
      gloves: "" as `0x${string}`,
      amulet: "" as `0x${string}`,
      boots: "" as `0x${string}`,
    },
  },
} as const;

export type NetworkType = keyof typeof CONTRACT_ADDRESSES;

export function getContractAddress(
  network: NetworkType,
  contract: keyof (typeof CONTRACT_ADDRESSES)["mainnet"]
): `0x${string}` {
  const address = CONTRACT_ADDRESSES[network][contract];
  if (typeof address === "object") {
    throw new Error(`${contract} is a nested object, use getGearTokenAddress`);
  }
  return address;
}

export function getGearTokenAddress(
  network: NetworkType,
  gearSlot: keyof (typeof CONTRACT_ADDRESSES)["mainnet"]["gearTokens"]
): `0x${string}` {
  return CONTRACT_ADDRESSES[network].gearTokens[gearSlot];
}
