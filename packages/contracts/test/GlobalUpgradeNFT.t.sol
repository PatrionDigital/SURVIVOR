// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { GlobalUpgradeNFT } from "../src/nfts/GlobalUpgradeNFT.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";

contract GlobalUpgradeNFTTest is Test {
    GlobalUpgradeNFT public upgradeNFT;
    VSCToken public vscToken;

    address public owner = address(this);
    address public player1 = address(0x1);
    address public player2 = address(0x2);

    uint256 constant BASE_COST = 1000 ether; // 1,000 VSC
    uint256 constant ESCALATION_MULTIPLIER = 50; // 50% as basis points (0.5 * 100)
    uint256 constant MAX_PER_TYPE = 10;

    // Upgrade type IDs
    uint256 constant MAX_HEALTH = 1;
    uint256 constant BASE_DAMAGE = 2;
    uint256 constant MOVE_SPEED = 3;
    uint256 constant XP_GAIN = 4;
    uint256 constant PICKUP_RANGE = 5;
    uint256 constant REVIVAL = 6;
    uint256 constant STARTING_WEAPON = 7;

    event UpgradeMinted(address indexed player, uint256 indexed upgradeType, uint256 cost);

    function setUp() public {
        // Deploy VSC token
        vscToken = new VSCToken(owner);

        // Deploy upgrade NFT
        upgradeNFT = new GlobalUpgradeNFT(address(vscToken));

        // Add owner as minter and mint VSC to players for testing
        vscToken.addMinter(owner);
        vscToken.mint(player1, 100_000 ether);
        vscToken.mint(player2, 100_000 ether);

        // Add upgradeNFT as minter so it can burn VSC
        vscToken.addMinter(address(upgradeNFT));

        // Approve upgradeNFT to burn VSC from players
        vm.prank(player1);
        vscToken.approve(address(upgradeNFT), type(uint256).max);

        vm.prank(player2);
        vscToken.approve(address(upgradeNFT), type(uint256).max);
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(address(upgradeNFT.vscToken()), address(vscToken));
        assertEq(upgradeNFT.BASE_COST(), BASE_COST);
        assertEq(upgradeNFT.ESCALATION_MULTIPLIER(), ESCALATION_MULTIPLIER);
        assertEq(upgradeNFT.MAX_PER_TYPE(), MAX_PER_TYPE);
    }

    function test_Constructor_InvalidToken() public {
        vm.expectRevert(GlobalUpgradeNFT.InvalidToken.selector);
        new GlobalUpgradeNFT(address(0));
    }

    // ============ Minting Tests ============

    function test_MintUpgrade_FirstPurchase() public {
        uint256 initialBalance = vscToken.balanceOf(player1);
        uint256 cost = upgradeNFT.getMintCost(player1, MAX_HEALTH);

        assertEq(cost, BASE_COST);

        vm.prank(player1);
        vm.expectEmit(true, true, false, true);
        emit UpgradeMinted(player1, MAX_HEALTH, BASE_COST);
        upgradeNFT.mint(MAX_HEALTH);

        // Check NFT balance
        assertEq(upgradeNFT.balanceOf(player1, MAX_HEALTH), 1);

        // Check VSC was burned
        assertEq(vscToken.balanceOf(player1), initialBalance - BASE_COST);

        // Check upgrade count
        assertEq(upgradeNFT.getUpgradeCount(player1, MAX_HEALTH), 1);
    }

    function test_MintUpgrade_MultipleTypes() public {
        vm.startPrank(player1);

        upgradeNFT.mint(MAX_HEALTH);
        upgradeNFT.mint(BASE_DAMAGE);
        upgradeNFT.mint(MOVE_SPEED);

        vm.stopPrank();

        assertEq(upgradeNFT.balanceOf(player1, MAX_HEALTH), 1);
        assertEq(upgradeNFT.balanceOf(player1, BASE_DAMAGE), 1);
        assertEq(upgradeNFT.balanceOf(player1, MOVE_SPEED), 1);
    }

    function test_MintUpgrade_ProgressiveCost() public {
        vm.startPrank(player1);

        // First mint: 1,000 VSC
        uint256 cost1 = upgradeNFT.getMintCost(player1, MAX_HEALTH);
        assertEq(cost1, 1000 ether);
        upgradeNFT.mint(MAX_HEALTH);

        // Second mint: 1,000 * (1 + 1 * 0.5) = 1,500 VSC
        uint256 cost2 = upgradeNFT.getMintCost(player1, MAX_HEALTH);
        assertEq(cost2, 1500 ether);
        upgradeNFT.mint(MAX_HEALTH);

        // Third mint: 1,000 * (1 + 2 * 0.5) = 2,000 VSC
        uint256 cost3 = upgradeNFT.getMintCost(player1, MAX_HEALTH);
        assertEq(cost3, 2000 ether);
        upgradeNFT.mint(MAX_HEALTH);

        vm.stopPrank();

        assertEq(upgradeNFT.balanceOf(player1, MAX_HEALTH), 3);
    }

    function test_MintUpgrade_MaxPerType() public {
        vm.startPrank(player1);

        // Mint MAX_PER_TYPE (10) upgrades
        for (uint256 i = 0; i < MAX_PER_TYPE; i++) {
            upgradeNFT.mint(MAX_HEALTH);
        }

        assertEq(upgradeNFT.balanceOf(player1, MAX_HEALTH), MAX_PER_TYPE);

        // Try to mint one more - should fail
        vm.expectRevert(GlobalUpgradeNFT.MaxUpgradesReached.selector);
        upgradeNFT.mint(MAX_HEALTH);

        vm.stopPrank();
    }

    function test_MintUpgrade_InvalidType() public {
        vm.startPrank(player1);

        vm.expectRevert(GlobalUpgradeNFT.InvalidUpgradeType.selector);
        upgradeNFT.mint(0);

        vm.expectRevert(GlobalUpgradeNFT.InvalidUpgradeType.selector);
        upgradeNFT.mint(8);

        vm.stopPrank();
    }

    function test_MintUpgrade_InsufficientBalance() public {
        address poorPlayer = address(0x999);
        vscToken.mint(poorPlayer, 500 ether); // Only 500 VSC (need 1000)

        vm.startPrank(poorPlayer);
        vscToken.approve(address(upgradeNFT), type(uint256).max);

        // Try to mint with insufficient balance (needs 1000 VSC but only has 500)
        vm.expectRevert();
        upgradeNFT.mint(MAX_HEALTH);

        vm.stopPrank();
    }

    function test_MintUpgrade_MultiplePlayersIndependent() public {
        // Player1 mints 2 MAX_HEALTH
        vm.startPrank(player1);
        upgradeNFT.mint(MAX_HEALTH);
        upgradeNFT.mint(MAX_HEALTH);
        vm.stopPrank();

        // Player2's cost should still be base cost (independent)
        uint256 player2Cost = upgradeNFT.getMintCost(player2, MAX_HEALTH);
        assertEq(player2Cost, BASE_COST);

        vm.prank(player2);
        upgradeNFT.mint(MAX_HEALTH);

        assertEq(upgradeNFT.balanceOf(player1, MAX_HEALTH), 2);
        assertEq(upgradeNFT.balanceOf(player2, MAX_HEALTH), 1);
    }

    // ============ View Function Tests ============

    function test_GetMintCost() public {
        vm.startPrank(player1);

        for (uint256 i = 0; i < 5; i++) {
            uint256 expectedCost = BASE_COST * (100 + i * ESCALATION_MULTIPLIER) / 100;
            uint256 actualCost = upgradeNFT.getMintCost(player1, MAX_HEALTH);
            assertEq(actualCost, expectedCost);
            upgradeNFT.mint(MAX_HEALTH);
        }

        vm.stopPrank();
    }

    function test_GetUpgradeCount() public {
        vm.startPrank(player1);

        assertEq(upgradeNFT.getUpgradeCount(player1, MAX_HEALTH), 0);

        upgradeNFT.mint(MAX_HEALTH);
        assertEq(upgradeNFT.getUpgradeCount(player1, MAX_HEALTH), 1);

        upgradeNFT.mint(MAX_HEALTH);
        assertEq(upgradeNFT.getUpgradeCount(player1, MAX_HEALTH), 2);

        vm.stopPrank();
    }

    function test_GetAllUpgrades() public {
        vm.startPrank(player1);

        upgradeNFT.mint(MAX_HEALTH); // 1
        upgradeNFT.mint(MAX_HEALTH); // 2
        upgradeNFT.mint(BASE_DAMAGE); // 1
        upgradeNFT.mint(REVIVAL); // 1

        uint256[7] memory upgrades = upgradeNFT.getAllUpgrades(player1);

        assertEq(upgrades[0], 2); // MAX_HEALTH (id 1) -> index 0
        assertEq(upgrades[1], 1); // BASE_DAMAGE (id 2) -> index 1
        assertEq(upgrades[2], 0); // MOVE_SPEED (id 3) -> index 2
        assertEq(upgrades[3], 0); // XP_GAIN (id 4) -> index 3
        assertEq(upgrades[4], 0); // PICKUP_RANGE (id 5) -> index 4
        assertEq(upgrades[5], 1); // REVIVAL (id 6) -> index 5
        assertEq(upgrades[6], 0); // STARTING_WEAPON (id 7) -> index 6

        vm.stopPrank();
    }

    // ============ Pausable Tests ============

    function test_Pause() public {
        upgradeNFT.pause();

        vm.prank(player1);
        vm.expectRevert();
        upgradeNFT.mint(MAX_HEALTH);
    }

    function test_Unpause() public {
        upgradeNFT.pause();
        upgradeNFT.unpause();

        vm.prank(player1);
        upgradeNFT.mint(MAX_HEALTH);

        assertEq(upgradeNFT.balanceOf(player1, MAX_HEALTH), 1);
    }

    function test_Pause_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        upgradeNFT.pause();
    }

    function test_Unpause_OnlyOwner() public {
        upgradeNFT.pause();

        vm.prank(player1);
        vm.expectRevert();
        upgradeNFT.unpause();
    }

    // ============ ERC1155 Tests ============

    function test_ERC1155_URI() public view {
        string memory uri = upgradeNFT.uri(MAX_HEALTH);
        // Should return base URI + token ID
        assertGt(bytes(uri).length, 0);
    }

    function test_ERC1155_SupportsInterface() public view {
        // ERC1155
        assertTrue(upgradeNFT.supportsInterface(0xd9b67a26));
        // ERC1155MetadataURI
        assertTrue(upgradeNFT.supportsInterface(0x0e89341c));
    }

    // ============ VSC Burn Tests ============

    function test_VSCBurned() public {
        uint256 initialSupply = vscToken.totalSupply();

        vm.prank(player1);
        upgradeNFT.mint(MAX_HEALTH);

        uint256 finalSupply = vscToken.totalSupply();

        // VSC should be burned
        assertEq(initialSupply - finalSupply, BASE_COST);
    }

    function test_VSCBurned_MultipleMints() public {
        uint256 initialSupply = vscToken.totalSupply();

        vm.startPrank(player1);
        upgradeNFT.mint(MAX_HEALTH); // 1,000
        upgradeNFT.mint(MAX_HEALTH); // 1,500
        upgradeNFT.mint(MAX_HEALTH); // 2,000
        vm.stopPrank();

        uint256 finalSupply = vscToken.totalSupply();
        uint256 expectedBurned = 1000 ether + 1500 ether + 2000 ether;

        assertEq(initialSupply - finalSupply, expectedBurned);
    }
}
