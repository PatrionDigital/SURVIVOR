// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";

/**
 * @title DeployStaking
 * @notice Deployment script for GearStaking and MaintenancePool contracts
 * @dev Deploys the staking system for gear tokens
 *
 * GearStaking features:
 * - Stake gear tokens for in-game stat bonuses
 * - Bonus calculation: baseMultiplier * log2(stakedAmount + 1)
 * - 5% stake fee sent to treasury
 * - Snapshot-based bonus calculation for game sessions
 *
 * MaintenancePool features:
 * - Weekly 5% decay on staked amounts
 * - Pay maintenance in VSC to prevent decay
 * - Decay goes to treasury
 *
 * Usage:
 *   forge script script/DeployStaking.s.sol --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployStaking is Script {
    // Contract addresses
    address public gearStaking;
    address public maintenancePool;

    function setUp() public { }

    function run() public {
        // Load configuration
        address vscToken = vm.envAddress("VITE_VSC_TOKEN_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        // Gear token addresses (unused until contracts are implemented)
        // address weaponToken = vm.envAddress("WEAPON_TOKEN_ADDRESS");
        // address armorToken = vm.envAddress("ARMOR_TOKEN_ADDRESS");
        // address powerToken = vm.envAddress("POWER_TOKEN_ADDRESS");
        // address glovesToken = vm.envAddress("GLOVES_TOKEN_ADDRESS");
        // address amuletToken = vm.envAddress("AMULET_TOKEN_ADDRESS");
        // address bootsToken = vm.envAddress("BOOTS_TOKEN_ADDRESS");

        console.log("Deploying Staking contracts...");
        console.log("VSCToken:", vscToken);
        console.log("Treasury:", treasury);

        vm.startBroadcast();

        // TODO: Deploy GearStaking when implemented
        // address[] memory gearTokens = new address[](6);
        // gearTokens[0] = weaponToken;
        // gearTokens[1] = armorToken;
        // gearTokens[2] = powerToken;
        // gearTokens[3] = glovesToken;
        // gearTokens[4] = amuletToken;
        // gearTokens[5] = bootsToken;
        //
        // gearStaking = address(new GearStaking(
        //     gearTokens,
        //     treasury,
        //     500  // stakeFeeBps (5%)
        // ));

        // TODO: Deploy MaintenancePool when implemented
        // maintenancePool = address(new MaintenancePool(
        //     vscToken,
        //     gearStaking,
        //     treasury,
        //     500,    // decayBps (5%)
        //     7 days  // decayPeriod
        // ));

        vm.stopBroadcast();

        console.log("\n=== Deployed Staking Contracts ===");
        console.log("GearStaking:", gearStaking);
        console.log("MaintenancePool:", maintenancePool);
    }
}
