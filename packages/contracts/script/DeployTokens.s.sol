// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";

/**
 * @title DeployTokens
 * @notice Deployment script for VSCToken and GearTokens
 * @dev Deploys the primary currency and all 6 gear tokens
 *
 * Tokens deployed:
 * - VSCToken: Primary in-game currency (100B max supply)
 * - WEAPON: Gear token for damage bonus
 * - ARMOR: Gear token for defense bonus
 * - POWER: Gear token for AoE bonus
 * - GLOVES: Gear token for attack speed bonus
 * - AMULET: Gear token for XP gain bonus
 * - BOOTS: Gear token for move speed bonus
 *
 * Usage:
 *   forge script script/DeployTokens.s.sol --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployTokens is Script {
    // Token addresses
    VSCToken public vscToken;

    // TODO: Add GearToken references when implemented
    // GearToken public weaponToken;
    // GearToken public armorToken;
    // GearToken public powerToken;
    // GearToken public glovesToken;
    // GearToken public amuletToken;
    // GearToken public bootsToken;

    function setUp() public { }

    function run() public {
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        console.log("Deploying tokens...");
        console.log("Treasury:", treasury);

        vm.startBroadcast();

        // Deploy VSCToken
        vscToken = new VSCToken(treasury);
        console.log("VSCToken deployed at:", address(vscToken));

        // TODO: Deploy GearTokens when implemented
        // weaponToken = new GearToken("Weapon", "WEAPON", bondingCurve);
        // armorToken = new GearToken("Armor", "ARMOR", bondingCurve);
        // powerToken = new GearToken("Power", "POWER", bondingCurve);
        // glovesToken = new GearToken("Gloves", "GLOVES", bondingCurve);
        // amuletToken = new GearToken("Amulet", "AMULET", bondingCurve);
        // bootsToken = new GearToken("Boots", "BOOTS", bondingCurve);

        vm.stopBroadcast();

        _logDeployedTokens();
    }

    function _logDeployedTokens() internal view {
        console.log("\n=== Deployed Tokens ===");
        console.log("VSCToken:", address(vscToken));
        // console.log("WEAPON:", address(weaponToken));
        // console.log("ARMOR:", address(armorToken));
        // console.log("POWER:", address(powerToken));
        // console.log("GLOVES:", address(glovesToken));
        // console.log("AMULET:", address(amuletToken));
        // console.log("BOOTS:", address(bootsToken));
    }
}
