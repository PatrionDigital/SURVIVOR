// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { GlobalUpgradeNFT } from "../src/nfts/GlobalUpgradeNFT.sol";
import { EarlyAdopterNFT } from "../src/nfts/EarlyAdopterNFT.sol";

/**
 * @title DeployNFTs
 * @notice Deployment script for GlobalUpgradeNFT and EarlyAdopterNFT
 * @dev Run after Deploy.s.sol — requires VSCToken address in env
 *
 * Usage:
 *   forge script script/DeployNFTs.s.sol --rpc-url <RPC_URL> --broadcast
 */
contract DeployNFTs is Script {
    function setUp() public { }

    function run() public {
        address vscToken = vm.envAddress("VITE_VSC_TOKEN_ADDRESS");
        address mintSigner = vm.envAddress("REWARD_SIGNER_ADDRESS");

        console.log("=== Deploying NFT Contracts ===");
        console.log("VSCToken:", vscToken);
        console.log("Mint Signer:", mintSigner);

        vm.startBroadcast();

        GlobalUpgradeNFT globalUpgradeNFT = new GlobalUpgradeNFT(vscToken);
        console.log("GlobalUpgradeNFT deployed at:", address(globalUpgradeNFT));

        EarlyAdopterNFT earlyAdopterNFT = new EarlyAdopterNFT(mintSigner);
        console.log("EarlyAdopterNFT deployed at:", address(earlyAdopterNFT));

        vm.stopBroadcast();

        console.log("");
        console.log("=== NFT Deployment Complete ===");
        console.log("GlobalUpgradeNFT:", address(globalUpgradeNFT));
        console.log("EarlyAdopterNFT:", address(earlyAdopterNFT));
    }
}
