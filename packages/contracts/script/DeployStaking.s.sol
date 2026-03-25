// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { GearStaking } from "../src/staking/GearStaking.sol";
import { MaintenancePool } from "../src/staking/MaintenancePool.sol";

/**
 * @title DeployStaking
 * @notice Deployment script for GearStaking and MaintenancePool contracts
 * @dev Run after Deploy.s.sol — requires token addresses in env
 *
 * Usage:
 *   forge script script/DeployStaking.s.sol --rpc-url <RPC_URL> --broadcast
 */
contract DeployStaking is Script {
    function setUp() public { }

    function run() public {
        address vscToken = vm.envAddress("VITE_VSC_TOKEN_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        address[6] memory gearTokens = [
            vm.envAddress("VITE_WEAPON_TOKEN_ADDRESS"),
            vm.envAddress("VITE_ARMOR_TOKEN_ADDRESS"),
            vm.envAddress("VITE_POWER_TOKEN_ADDRESS"),
            vm.envAddress("VITE_GLOVES_TOKEN_ADDRESS"),
            vm.envAddress("VITE_AMULET_TOKEN_ADDRESS"),
            vm.envAddress("VITE_BOOTS_TOKEN_ADDRESS")
        ];

        address deployer = msg.sender;

        console.log("=== Deploying Staking Contracts ===");
        console.log("Deployer:", deployer);
        console.log("VSCToken:", vscToken);
        console.log("Treasury:", treasury);

        vm.startBroadcast();

        GearStaking gearStaking = new GearStaking(deployer, gearTokens, treasury);
        console.log("GearStaking deployed at:", address(gearStaking));

        MaintenancePool maintenancePool = new MaintenancePool(deployer, vscToken);
        console.log("MaintenancePool deployed at:", address(maintenancePool));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Staking Deployment Complete ===");
        console.log("GearStaking:", address(gearStaking));
        console.log("MaintenancePool:", address(maintenancePool));
    }
}
