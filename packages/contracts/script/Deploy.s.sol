// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";
import { GearToken } from "../src/tokens/GearToken.sol";
import { BondingCurve } from "../src/bonding/BondingCurve.sol";

/**
 * @title Deploy
 * @notice Main deployment script for Farcaster Survivors contracts
 * @dev Orchestrates deployment of all contracts in the correct order
 *
 * Deployment order:
 * 1. VSCToken (primary currency)
 * 2. GearTokens (6 gear types: WEAPON, ARMOR, POWER, GLOVES, AMULET, BOOTS)
 * 3. VSC-ETH BondingCurve (trading AMM for VSC)
 * 4. Configure permissions
 *
 * Note: Gear-VSC BondingCurves require ERC20-based bonding curve (future task)
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast --verify
 *
 * Environment variables required:
 *   TREASURY_ADDRESS - Address to receive treasury fees
 *   BURN_ADDRESS - Address to receive burn fees (or dead address)
 */
contract Deploy is Script {
    // Deployed contract instances
    VSCToken public vscToken;
    BondingCurve public vscBondingCurve;

    // Gear token instances
    GearToken public weaponToken;
    GearToken public armorToken;
    GearToken public powerToken;
    GearToken public glovesToken;
    GearToken public amuletToken;
    GearToken public bootsToken;

    // Gear token array for iteration
    GearToken[6] public gearTokens;

    // Gear token metadata
    string[6] public gearNames =
        ["Weapon Core", "Armor Plate", "Power Belt", "Combat Gloves", "Amulet", "Swift Boots"];
    string[6] public gearSymbols = ["WEAPON", "ARMOR", "POWER", "GLOVES", "AMULET", "BOOTS"];

    function setUp() public { }

    function run() public {
        // Load configuration from environment
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address burnAddress = vm.envAddress("BURN_ADDRESS");
        address deployer = msg.sender;

        console.log("=== Farcaster Survivors Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Treasury:", treasury);
        console.log("Burn Address:", burnAddress);
        console.log("");

        vm.startBroadcast();

        // 1. Deploy VSCToken
        console.log("1. Deploying VSCToken...");
        vscToken = new VSCToken(deployer);
        console.log("   VSCToken deployed at:", address(vscToken));

        // 2. Deploy GearTokens
        console.log("2. Deploying GearTokens...");
        for (uint256 i = 0; i < 6; i++) {
            gearTokens[i] = new GearToken(gearNames[i], gearSymbols[i], deployer);
            console.log("   ", gearSymbols[i], "deployed at:", address(gearTokens[i]));
        }

        // Assign to named variables for clarity
        weaponToken = gearTokens[0];
        armorToken = gearTokens[1];
        powerToken = gearTokens[2];
        glovesToken = gearTokens[3];
        amuletToken = gearTokens[4];
        bootsToken = gearTokens[5];

        // 3. Deploy VSC-ETH BondingCurve
        console.log("3. Deploying VSC-ETH BondingCurve...");
        vscBondingCurve = new BondingCurve(address(vscToken), treasury, burnAddress, deployer);
        console.log("   VSC-ETH BondingCurve deployed at:", address(vscBondingCurve));

        // 4. Configure permissions
        console.log("4. Configuring permissions...");

        // Add VSC BondingCurve as minter for VSCToken
        vscToken.addMinter(address(vscBondingCurve));
        console.log("   Added VSC BondingCurve as VSCToken minter");

        // Note: Gear-VSC BondingCurves not yet implemented
        // When implemented, each GearToken's setBondingCurve would be called here
        console.log("   Note: Gear-VSC BondingCurves pending (requires ERC20-based curve)");

        vm.stopBroadcast();

        // Log summary
        _logDeploymentSummary();
    }

    function _logDeploymentSummary() internal view {
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("");
        console.log("Tokens:");
        console.log("  VSCToken:", address(vscToken));
        console.log("  WEAPON:", address(weaponToken));
        console.log("  ARMOR:", address(armorToken));
        console.log("  POWER:", address(powerToken));
        console.log("  GLOVES:", address(glovesToken));
        console.log("  AMULET:", address(amuletToken));
        console.log("  BOOTS:", address(bootsToken));
        console.log("");
        console.log("Trading:");
        console.log("  VSC-ETH BondingCurve:", address(vscBondingCurve));
        console.log("");
        console.log("=== Deployment Complete ===");
    }
}
