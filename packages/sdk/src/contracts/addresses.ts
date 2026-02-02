/**
 * Contract addresses for Farcaster Survivors
 * Updated after each deployment
 */

export const CONTRACT_ADDRESSES = {
  // Base Mainnet (Chain ID: 8453)
  mainnet: {
    vscToken: "" as `0x${string}`,
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
    bondingCurves: {
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
    bondingCurves: {
      weapon: "" as `0x${string}`,
      armor: "" as `0x${string}`,
      power: "" as `0x${string}`,
      gloves: "" as `0x${string}`,
      amulet: "" as `0x${string}`,
      boots: "" as `0x${string}`,
    },
  },
  // Anvil Local (Chain ID: 31337)
  // NOTE: These addresses are deterministic based on deployment order.
  // If you reset Anvil or change deployment order, run DeployAnvil.s.sol again.
  // Last updated: 2026-02-02
  anvil: {
    vscToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
    gearStaking: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c" as `0x${string}`,
    maintenancePool: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d" as `0x${string}`,
    rewardDistributor: "0x59b670e9fA9D0A427751Af201D676719a970857b" as `0x${string}`,
    globalUpgradeNFT: "" as `0x${string}`,
    earlyAdopterNFT: "" as `0x${string}`,
    gearTokens: {
      weapon: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as `0x${string}`,
      armor: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as `0x${string}`,
      power: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" as `0x${string}`,
      gloves: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" as `0x${string}`,
      amulet: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" as `0x${string}`,
      boots: "0x0165878A594ca255338adfa4d48449f69242Eb8F" as `0x${string}`,
    },
    bondingCurves: {
      weapon: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853" as `0x${string}`,
      armor: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6" as `0x${string}`,
      power: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318" as `0x${string}`,
      gloves: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788" as `0x${string}`,
      amulet: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e" as `0x${string}`,
      boots: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0" as `0x${string}`,
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

export function getBondingCurveAddress(
  network: NetworkType,
  gearSlot: keyof (typeof CONTRACT_ADDRESSES)["mainnet"]["bondingCurves"]
): `0x${string}` {
  return CONTRACT_ADDRESSES[network].bondingCurves[gearSlot];
}
