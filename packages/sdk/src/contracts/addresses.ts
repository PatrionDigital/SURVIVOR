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
  anvil: {
    vscToken: "0x3155755b79aA083bd953911C92705B7aA82a18F9" as `0x${string}`,
    gearStaking: "0x6F6f570F45833E249e27022648a26F4076F48f78" as `0x${string}`,
    maintenancePool: "0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9" as `0x${string}`,
    rewardDistributor: "0xB0f05d25e41FbC2b52013099ED9616f1206Ae21B" as `0x${string}`,
    globalUpgradeNFT: "" as `0x${string}`,
    earlyAdopterNFT: "" as `0x${string}`,
    gearTokens: {
      weapon: "0x5bf5b11053e734690269C6B9D438F8C9d48F528A" as `0x${string}`,
      armor: "0xffa7CA1AEEEbBc30C874d32C7e22F052BbEa0429" as `0x${string}`,
      power: "0x3aAde2dCD2Df6a8cAc689EE797591b2913658659" as `0x${string}`,
      gloves: "0xab16A69A5a8c12C732e0DEFF4BE56A70bb64c926" as `0x${string}`,
      amulet: "0xE3011A37A904aB90C8881a99BD1F6E21401f1522" as `0x${string}`,
      boots: "0x1f10F3Ba7ACB61b2F50B9d6DdCf91a6f787C0E82" as `0x${string}`,
    },
    bondingCurves: {
      weapon: "0x457cCf29090fe5A24c19c1bc95F492168C0EaFdb" as `0x${string}`,
      armor: "0x525C7063E7C20997BaaE9bDa922159152D0e8417" as `0x${string}`,
      power: "0x38a024C0b412B9d1db8BC398140D00F5Af3093D4" as `0x${string}`,
      gloves: "0x5fc748f1FEb28d7b76fa1c6B07D8ba2d5535177c" as `0x${string}`,
      amulet: "0xB82008565FdC7e44609fA118A4a681E92581e680" as `0x${string}`,
      boots: "0x2a810409872AfC346F9B5b26571Fd6eC42EA4849" as `0x${string}`,
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
