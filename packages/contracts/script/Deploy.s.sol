// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";

/**
 * @title Deploy
 * @notice Main deployment script for Farcaster Survivors contracts
 * @dev Orchestrates deployment of all contracts in the correct order
 *
 * Deployment order:
 * 1. VSCToken (primary currency)
 * 2. GearTokens (6 gear types: WEAPON, ARMOR, POWER, GLOVES, AMULET, BOOTS)
 * 3. BondingCurve (trading AMM)
 * 4. GearStaking (stake gear for bonuses)
 * 5. MaintenancePool (weekly decay mechanics)
 * 6. RewardDistributor (game rewards)
 * 7. GlobalUpgradeNFT (ERC-1155 upgrades)
 * 8. EarlyAdopterNFT (ERC-721 badges)
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast --verify
 */
contract Deploy is Script {
    // Deployed contract addresses
    address public vscToken;
    address public bondingCurve;
    address public gearStaking;
    address public maintenancePool;
    address public rewardDistributor;
    address public globalUpgradeNFT;
    address public earlyAdopterNFT;

    // Gear token addresses
    address public weaponToken;
    address public armorToken;
    address public powerToken;
    address public glovesToken;
    address public amuletToken;
    address public bootsToken;

    function setUp() public { }

    function run() public {
        // Load configuration from environment
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT_ADDRESS");

        console.log("Deploying Farcaster Survivors contracts...");
        console.log("Treasury:", treasury);
        console.log("Fee Recipient:", feeRecipient);

        vm.startBroadcast();

        // TODO: Deploy contracts in order
        // 1. Deploy VSCToken
        // vscToken = address(new VSCToken(treasury));

        // 2. Deploy GearTokens
        // weaponToken = address(new GearToken("Weapon", "WEAPON"));
        // armorToken = address(new GearToken("Armor", "ARMOR"));
        // powerToken = address(new GearToken("Power", "POWER"));
        // glovesToken = address(new GearToken("Gloves", "GLOVES"));
        // amuletToken = address(new GearToken("Amulet", "AMULET"));
        // bootsToken = address(new GearToken("Boots", "BOOTS"));

        // 3. Deploy BondingCurve
        // bondingCurve = address(new BondingCurve(vscToken, treasury, feeRecipient));

        // 4. Deploy GearStaking
        // gearStaking = address(new GearStaking(...));

        // 5. Deploy MaintenancePool
        // maintenancePool = address(new MaintenancePool(...));

        // 6. Deploy RewardDistributor
        // rewardDistributor = address(new RewardDistributor(vscToken));

        // 7. Deploy NFTs
        // globalUpgradeNFT = address(new GlobalUpgradeNFT());
        // earlyAdopterNFT = address(new EarlyAdopterNFT());

        vm.stopBroadcast();

        // Log deployed addresses
        _logDeployedAddresses();
    }

    function _logDeployedAddresses() internal view {
        console.log("\n=== Deployed Contract Addresses ===");
        console.log("VSCToken:", vscToken);
        console.log("BondingCurve:", bondingCurve);
        console.log("GearStaking:", gearStaking);
        console.log("MaintenancePool:", maintenancePool);
        console.log("RewardDistributor:", rewardDistributor);
        console.log("GlobalUpgradeNFT:", globalUpgradeNFT);
        console.log("EarlyAdopterNFT:", earlyAdopterNFT);
        console.log("\n=== Gear Tokens ===");
        console.log("WEAPON:", weaponToken);
        console.log("ARMOR:", armorToken);
        console.log("POWER:", powerToken);
        console.log("GLOVES:", glovesToken);
        console.log("AMULET:", amuletToken);
        console.log("BOOTS:", bootsToken);
    }
}
