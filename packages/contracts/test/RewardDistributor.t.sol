// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { RewardDistributor } from "../src/rewards/RewardDistributor.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";

contract RewardDistributorTest is Test {
    RewardDistributor public distributor;
    VSCToken public vscToken;

    address public owner = makeAddr("owner");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    uint256 public signerPrivateKey = 0x1234567890abcdef;
    address public signer;

    uint256 constant INITIAL_BALANCE = 10_000_000 * 1e18;
    uint256 constant DAILY_PLAYER_CAP = 10_000 * 1e18;
    uint256 constant GLOBAL_DAILY_CAP = 1_000_000 * 1e18;
    uint256 constant CLAIM_COOLDOWN = 60;

    function setUp() public {
        signer = vm.addr(signerPrivateKey);

        vm.startPrank(owner);

        // Deploy VSC token
        vscToken = new VSCToken(owner);
        vscToken.addMinter(owner);

        // Deploy reward distributor
        distributor = new RewardDistributor(owner, address(vscToken), signer);

        // Mint tokens to distributor
        vscToken.mint(address(distributor), INITIAL_BALANCE);

        vm.stopPrank();
    }

    // ============ Helper Functions ============

    function _createSignature(
        address player,
        uint256 amount,
        uint8 rewardType,
        uint256 nonce,
        uint256 expiry
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                player, amount, rewardType, nonce, expiry, block.chainid, address(distributor)
            )
        );
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    // ============ Constructor Tests ============

    function test_constructor_setsOwner() public view {
        assertEq(distributor.owner(), owner);
    }

    function test_constructor_setsVscToken() public view {
        assertEq(address(distributor.vscToken()), address(vscToken));
    }

    function test_constructor_setsSigner() public view {
        assertEq(distributor.authorizedSigner(), signer);
    }

    function test_constructor_setsDailyCaps() public view {
        assertEq(distributor.dailyPlayerCap(), DAILY_PLAYER_CAP);
        assertEq(distributor.globalDailyCap(), GLOBAL_DAILY_CAP);
    }

    function test_constructor_revertsOnZeroToken() public {
        vm.prank(owner);
        vm.expectRevert(RewardDistributor.ZeroAddress.selector);
        new RewardDistributor(owner, address(0), signer);
    }

    function test_constructor_revertsOnZeroSigner() public {
        vm.prank(owner);
        vm.expectRevert(RewardDistributor.ZeroAddress.selector);
        new RewardDistributor(owner, address(vscToken), address(0));
    }

    // ============ Claim Tests ============

    function test_claim_transfersTokens() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertEq(vscToken.balanceOf(player1), amount);
    }

    function test_claim_emitsEvent() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.expectEmit(true, false, false, true);
        emit RewardDistributor.RewardClaimed(player1, amount, 0, nonce);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);
    }

    function test_claim_updatesNonce() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        assertFalse(distributor.isNonceUsed(player1, nonce));

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertTrue(distributor.isNonceUsed(player1, nonce));
    }

    function test_claim_updatesDailyClaimed() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertEq(distributor.getDailyClaimed(player1), amount);
        assertEq(distributor.getGlobalDailyClaimed(), amount);
    }

    function test_claim_updatesLastClaimTime() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertEq(distributor.getLastClaimTime(player1), block.timestamp);
    }

    function test_claim_revertsOnZeroAmount() public {
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, 0, 0, nonce, expiry);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.ZeroAmount.selector);
        distributor.claim(0, 0, nonce, expiry, signature);
    }

    function test_claim_revertsOnInvalidRewardType() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 5, nonce, expiry);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.InvalidRewardType.selector);
        distributor.claim(amount, 5, nonce, expiry, signature);
    }

    function test_claim_revertsOnExpiredClaim() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp - 1;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.ClaimExpired.selector);
        distributor.claim(amount, 0, nonce, expiry, signature);
    }

    function test_claim_revertsOnUsedNonce() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        // Wait for cooldown
        vm.warp(block.timestamp + CLAIM_COOLDOWN + 1);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.NonceAlreadyUsed.selector);
        distributor.claim(amount, 0, nonce, expiry, signature);
    }

    function test_claim_revertsOnCooldown() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce1 = 1;
        uint256 nonce2 = 2;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature1 = _createSignature(player1, amount, 0, nonce1, expiry);
        bytes memory signature2 = _createSignature(player1, amount, 0, nonce2, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce1, expiry, signature1);

        // Try to claim again immediately
        vm.prank(player1);
        vm.expectRevert(RewardDistributor.CooldownActive.selector);
        distributor.claim(amount, 0, nonce2, expiry, signature2);
    }

    function test_claim_succeedsAfterCooldown() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce1 = 1;
        uint256 nonce2 = 2;
        uint256 expiry = block.timestamp + 2 hours;

        bytes memory signature1 = _createSignature(player1, amount, 0, nonce1, expiry);
        bytes memory signature2 = _createSignature(player1, amount, 0, nonce2, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce1, expiry, signature1);

        // Wait for cooldown
        vm.warp(block.timestamp + CLAIM_COOLDOWN + 1);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce2, expiry, signature2);

        assertEq(vscToken.balanceOf(player1), amount * 2);
    }

    function test_claim_revertsOnInvalidSignature() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        // Create signature with different amount
        bytes memory signature = _createSignature(player1, amount * 2, 0, nonce, expiry);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.InvalidSignature.selector);
        distributor.claim(amount, 0, nonce, expiry, signature);
    }

    function test_claim_revertsOnDailyPlayerCapExceeded() public {
        uint256 expiry = block.timestamp + 1 hours;
        uint256 amount = DAILY_PLAYER_CAP / 2 + 1;

        // First claim
        bytes memory signature1 = _createSignature(player1, amount, 0, 1, expiry);
        vm.prank(player1);
        distributor.claim(amount, 0, 1, expiry, signature1);

        // Wait for cooldown
        vm.warp(block.timestamp + CLAIM_COOLDOWN + 1);

        // Second claim should exceed cap
        bytes memory signature2 = _createSignature(player1, amount, 0, 2, expiry);
        vm.prank(player1);
        vm.expectRevert(RewardDistributor.DailyCapExceeded.selector);
        distributor.claim(amount, 0, 2, expiry, signature2);
    }

    function test_claim_dailyCapResetsNextDay() public {
        uint256 amount = DAILY_PLAYER_CAP;
        uint256 expiry = block.timestamp + 2 days;

        // First claim - max out daily cap
        bytes memory signature1 = _createSignature(player1, amount, 0, 1, expiry);
        vm.prank(player1);
        distributor.claim(amount, 0, 1, expiry, signature1);

        // Move to next day
        vm.warp(block.timestamp + 1 days + CLAIM_COOLDOWN);

        // Should be able to claim again
        bytes memory signature2 = _createSignature(player1, amount, 0, 2, expiry);
        vm.prank(player1);
        distributor.claim(amount, 0, 2, expiry, signature2);

        assertEq(vscToken.balanceOf(player1), amount * 2);
    }

    function test_claim_allRewardTypes() public {
        uint256 amount = 100 * 1e18;
        uint256 expiry = block.timestamp + 1 hours;

        for (uint8 rewardType = 0; rewardType <= 3; rewardType++) {
            bytes memory signature =
                _createSignature(player1, amount, rewardType, rewardType + 1, expiry);

            vm.prank(player1);
            distributor.claim(amount, rewardType, rewardType + 1, expiry, signature);

            // Wait for cooldown between claims
            vm.warp(block.timestamp + CLAIM_COOLDOWN + 1);
        }

        assertEq(vscToken.balanceOf(player1), amount * 4);
    }

    // ============ View Function Tests ============

    function test_getRemainingDailyAllowance() public {
        uint256 amount = 5000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        assertEq(distributor.getRemainingDailyAllowance(player1), DAILY_PLAYER_CAP);

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);
        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertEq(distributor.getRemainingDailyAllowance(player1), DAILY_PLAYER_CAP - amount);
    }

    function test_getRemainingGlobalAllowance() public {
        uint256 amount = 500_000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        // Increase player cap to test global cap
        vm.prank(owner);
        distributor.setDailyPlayerCap(amount * 2);

        assertEq(distributor.getRemainingGlobalAllowance(), GLOBAL_DAILY_CAP);

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);
        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertEq(distributor.getRemainingGlobalAllowance(), GLOBAL_DAILY_CAP - amount);
    }

    function test_canClaim() public {
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        assertTrue(distributor.canClaim(player1));

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);
        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertFalse(distributor.canClaim(player1));

        vm.warp(block.timestamp + CLAIM_COOLDOWN + 1);
        assertTrue(distributor.canClaim(player1));
    }

    function test_getBalance() public view {
        assertEq(distributor.getBalance(), INITIAL_BALANCE);
    }

    // ============ Admin Tests ============

    function test_setAuthorizedSigner_updatesSigner() public {
        address newSigner = makeAddr("newSigner");

        vm.prank(owner);
        distributor.setAuthorizedSigner(newSigner);

        assertEq(distributor.authorizedSigner(), newSigner);
    }

    function test_setAuthorizedSigner_emitsEvent() public {
        address newSigner = makeAddr("newSigner");

        vm.expectEmit(true, true, false, false);
        emit RewardDistributor.SignerUpdated(signer, newSigner);

        vm.prank(owner);
        distributor.setAuthorizedSigner(newSigner);
    }

    function test_setAuthorizedSigner_revertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(RewardDistributor.ZeroAddress.selector);
        distributor.setAuthorizedSigner(address(0));
    }

    function test_setAuthorizedSigner_revertsIfNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        distributor.setAuthorizedSigner(makeAddr("newSigner"));
    }

    function test_setDailyCaps_updatesCaps() public {
        uint256 newPlayerCap = 20_000 * 1e18;
        uint256 newGlobalCap = 2_000_000 * 1e18;

        vm.prank(owner);
        distributor.setDailyCaps(newPlayerCap, newGlobalCap);

        assertEq(distributor.dailyPlayerCap(), newPlayerCap);
        assertEq(distributor.globalDailyCap(), newGlobalCap);
    }

    function test_setDailyCaps_emitsEvent() public {
        uint256 newPlayerCap = 20_000 * 1e18;
        uint256 newGlobalCap = 2_000_000 * 1e18;

        vm.expectEmit(false, false, false, true);
        emit RewardDistributor.DailyCapUpdated(newPlayerCap, newGlobalCap);

        vm.prank(owner);
        distributor.setDailyCaps(newPlayerCap, newGlobalCap);
    }

    function test_setDailyPlayerCap_updatesCap() public {
        uint256 newCap = 20_000 * 1e18;

        vm.prank(owner);
        distributor.setDailyPlayerCap(newCap);

        assertEq(distributor.dailyPlayerCap(), newCap);
    }

    function test_setGlobalDailyCap_updatesCap() public {
        uint256 newCap = 2_000_000 * 1e18;

        vm.prank(owner);
        distributor.setGlobalDailyCap(newCap);

        assertEq(distributor.globalDailyCap(), newCap);
    }

    function test_emergencyWithdraw_transfersTokens() public {
        uint256 amount = 1_000_000 * 1e18;
        address recipient = makeAddr("recipient");

        vm.prank(owner);
        distributor.emergencyWithdraw(address(vscToken), recipient, amount);

        assertEq(vscToken.balanceOf(recipient), amount);
        assertEq(vscToken.balanceOf(address(distributor)), INITIAL_BALANCE - amount);
    }

    function test_emergencyWithdraw_emitsEvent() public {
        uint256 amount = 1_000_000 * 1e18;
        address recipient = makeAddr("recipient");

        vm.expectEmit(true, true, false, true);
        emit RewardDistributor.EmergencyWithdraw(address(vscToken), recipient, amount);

        vm.prank(owner);
        distributor.emergencyWithdraw(address(vscToken), recipient, amount);
    }

    function test_emergencyWithdraw_revertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(RewardDistributor.ZeroAddress.selector);
        distributor.emergencyWithdraw(address(vscToken), address(0), 1000);
    }

    function test_pause_blocksClaims() public {
        vm.prank(owner);
        distributor.pause();

        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        vm.expectRevert();
        distributor.claim(amount, 0, nonce, expiry, signature);
    }

    function test_unpause_allowsClaims() public {
        vm.prank(owner);
        distributor.pause();

        vm.prank(owner);
        distributor.unpause();

        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertEq(vscToken.balanceOf(player1), amount);
    }

    // ============ Fuzz Tests ============

    function testFuzz_claim_anyValidAmount(uint256 amount) public {
        amount = bound(amount, 1, DAILY_PLAYER_CAP);
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, 0, nonce, expiry);

        vm.prank(player1);
        distributor.claim(amount, 0, nonce, expiry, signature);

        assertEq(vscToken.balanceOf(player1), amount);
    }

    function testFuzz_claim_anyRewardType(uint8 rewardType) public {
        rewardType = uint8(bound(rewardType, 0, 3));
        uint256 amount = 1000 * 1e18;
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 hours;

        bytes memory signature = _createSignature(player1, amount, rewardType, nonce, expiry);

        vm.prank(player1);
        distributor.claim(amount, rewardType, nonce, expiry, signature);

        assertEq(vscToken.balanceOf(player1), amount);
    }
}
