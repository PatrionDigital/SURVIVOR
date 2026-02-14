// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { VSCToken } from "../../src/tokens/VSCToken.sol";
import { RewardDistributor } from "../../src/rewards/RewardDistributor.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title RewardFlowIntegration
 * @notice Integration tests for reward signing backend service with RewardDistributor contract
 * @dev Tests that backend-signed rewards can be claimed on-chain
 */
contract RewardFlowIntegration is Test {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    VSCToken public vscToken;
    RewardDistributor public rewardDistributor;

    // Test accounts
    address public owner;
    address public signer;
    uint256 public signerPrivateKey;
    address public player1;
    address public player2;

    // Test constants
    uint256 constant INITIAL_VSC = 1_000_000 ether;
    uint256 constant REWARD_AMOUNT = 100 ether;

    function setUp() public {
        // Create test accounts
        owner = makeAddr("owner");
        (signer, signerPrivateKey) = makeAddrAndKey("signer");
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");

        // Deploy contracts
        vm.startPrank(owner);
        vscToken = new VSCToken(owner);
        rewardDistributor = new RewardDistributor(owner, address(vscToken), signer);
        vm.stopPrank();

        // Fund reward distributor
        vm.prank(owner);
        vscToken.addMinter(owner);
        vm.prank(owner);
        vscToken.mint(address(rewardDistributor), INITIAL_VSC);
    }

    /**
     * @notice Helper function to create signature matching backend format
     * @dev Matches rewardSigner.ts signRewardClaim() encoding:
     *      keccak256(encodePacked(player, amount, rewardType, nonce, expiry, chainId, contractAddress))
     */
    function createBackendSignature(
        address player,
        uint256 amount,
        uint8 rewardType,
        uint256 nonce,
        uint256 expiry
    )
        internal
        view
        returns (bytes memory)
    {
        bytes32 messageHash = keccak256(
            abi.encodePacked(player, amount, rewardType, nonce, expiry, block.chainid, address(rewardDistributor))
        );

        // Convert to EIP-191 eth_sign format
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Sign with private key - vm.sign does NOT add EIP-191 prefix, so we sign the ethSignedMessageHash
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);

        return abi.encodePacked(r, s, v);
    }

    // ============ Test 1: Backend-signed claim succeeds ============

    function test_BackendSignedClaimSucceeds() public {
        uint256 nonce = 12345;
        uint256 expiry = block.timestamp + 1 hours;
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();

        bytes memory signature = createBackendSignature(player1, REWARD_AMOUNT, rewardType, nonce, expiry);

        vm.prank(player1);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce, expiry, signature);

        assertEq(vscToken.balanceOf(player1), REWARD_AMOUNT, "Player should receive reward");
        assertTrue(rewardDistributor.isNonceUsed(player1, nonce), "Nonce should be marked used");
    }

    // ============ Test 2: Invalid signature rejected ============

    function test_InvalidSignature_WrongSigner() public {
        uint256 nonce = 12345;
        uint256 expiry = block.timestamp + 1 hours;
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();

        // Sign with wrong private key
        uint256 wrongPrivateKey = 0xBAD;
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                player1, REWARD_AMOUNT, uint8(rewardType), nonce, expiry, block.chainid, address(rewardDistributor)
            )
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, ethSignedMessageHash);
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.InvalidSignature.selector);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce, expiry, wrongSignature);
    }

    function test_InvalidSignature_TamperedAmount() public {
        uint256 nonce = 12345;
        uint256 expiry = block.timestamp + 1 hours;
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();
        uint256 signedAmount = 100 ether;
        uint256 claimedAmount = 1000 ether; // Try to claim more

        bytes memory signature = createBackendSignature(player1, signedAmount, uint8(rewardType), nonce, expiry);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.InvalidSignature.selector);
        rewardDistributor.claim(claimedAmount, rewardType, nonce, expiry, signature); // Different amount
    }

    function test_InvalidSignature_WrongChainId() public {
        uint256 nonce = 12345;
        uint256 expiry = block.timestamp + 1 hours;
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();

        // Sign with different chain ID
        bytes32 messageHash = keccak256(
            abi.encodePacked(player1, REWARD_AMOUNT, uint8(rewardType), nonce, expiry, uint256(1), address(rewardDistributor)) // chainId 1 instead of 31337
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory wrongChainSignature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.InvalidSignature.selector);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce, expiry, wrongChainSignature);
    }

    // ============ Test 3: Nonce replay rejected ============

    function test_NonceReplayRejected() public {
        uint256 nonce = 12345;
        uint256 expiry = block.timestamp + 1 hours;
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();

        bytes memory signature =
            createBackendSignature(player1, REWARD_AMOUNT, uint8(rewardType), nonce, expiry);

        // First claim succeeds
        vm.prank(player1);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce, expiry, signature);

        // Second claim with same signature fails
        vm.prank(player1);
        vm.expectRevert(RewardDistributor.NonceAlreadyUsed.selector);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce, expiry, signature);
    }

    // ============ Test 4: Expired signature rejected ============

    function test_ExpiredSignatureRejected() public {
        uint256 nonce = 12345;
        uint256 expiry = block.timestamp + 1 hours;
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();

        bytes memory signature =
            createBackendSignature(player1, REWARD_AMOUNT, uint8(rewardType), nonce, expiry);

        // Warp time past expiry
        vm.warp(block.timestamp + 2 hours);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.ClaimExpired.selector);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce, expiry, signature);
    }

    // ============ Test 5: Daily cap enforcement ============

    function test_DailyPlayerCapEnforcement() public {
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();
        uint256 playerCap = rewardDistributor.dailyPlayerCap();

        // Claim up to cap
        uint256 nonce1 = 12345;
        uint256 expiry1 = block.timestamp + 1 hours;
        bytes memory signature1 =
            createBackendSignature(player1, playerCap, uint8(rewardType), nonce1, expiry1);

        vm.prank(player1);
        rewardDistributor.claim(playerCap, rewardType, nonce1, expiry1, signature1);

        // Warp past cooldown
        vm.warp(block.timestamp + 61);

        // Try to claim more - should fail
        uint256 nonce2 = 123456;
        uint256 expiry2 = block.timestamp + 1 hours;
        bytes memory signature2 = createBackendSignature(player1, 1 ether, rewardType, nonce2, expiry2);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.DailyCapExceeded.selector);
        rewardDistributor.claim(1 ether, rewardType, nonce2, expiry2, signature2);
    }

    function test_GlobalDailyCapEnforcement() public {
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();
        uint256 globalCap = rewardDistributor.globalDailyCap();
        uint256 amountPerClaim = globalCap / 2;

        // Increase player cap to allow testing global cap
        vm.prank(owner);
        rewardDistributor.setDailyCaps(globalCap, globalCap);

        // Player1 claims half the global cap
        uint256 nonce1 = 12345;
        uint256 expiry1 = block.timestamp + 1 hours;
        bytes memory signature1 =
            createBackendSignature(player1, amountPerClaim, uint8(rewardType), nonce1, expiry1);

        vm.prank(player1);
        rewardDistributor.claim(amountPerClaim, rewardType, nonce1, expiry1, signature1);

        // Player2 claims the other half
        uint256 nonce2 = 123456;
        uint256 expiry2 = block.timestamp + 1 hours;
        bytes memory signature2 =
            createBackendSignature(player2, amountPerClaim, uint8(rewardType), nonce2, expiry2);

        vm.prank(player2);
        rewardDistributor.claim(amountPerClaim, rewardType, nonce2, expiry2, signature2);

        // Warp past player1's cooldown
        vm.warp(block.timestamp + 61);

        // Player1 tries to claim more - should fail global cap
        uint256 nonce3 = 1234567;
        uint256 expiry3 = block.timestamp + 1 hours;
        bytes memory signature3 = createBackendSignature(player1, 1 ether, rewardType, nonce3, expiry3);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.DailyCapExceeded.selector);
        rewardDistributor.claim(1 ether, rewardType, nonce3, expiry3, signature3);
    }

    // ============ Test 6: Concurrent claims ============

    function test_ConcurrentClaims_NoRaceCondition() public {
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();
        uint256 nonce1 = 12345;
        uint256 expiry1 = block.timestamp + 1 hours;
        bytes memory signature1 =
            createBackendSignature(player1, REWARD_AMOUNT, uint8(rewardType), nonce1, expiry1);

        uint256 nonce2 = 123456;
        uint256 expiry2 = block.timestamp + 1 hours;
        bytes memory signature2 =
            createBackendSignature(player2, REWARD_AMOUNT, uint8(rewardType), nonce2, expiry2);

        // Both players claim in same block (simulated concurrency)
        vm.prank(player1);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce1, expiry1, signature1);

        vm.prank(player2);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce2, expiry2, signature2);

        // Both should succeed with correct balances
        assertEq(vscToken.balanceOf(player1), REWARD_AMOUNT, "Player1 should receive reward");
        assertEq(vscToken.balanceOf(player2), REWARD_AMOUNT, "Player2 should receive reward");

        // Nonces should be independent per player
        assertTrue(rewardDistributor.isNonceUsed(player1, nonce1), "Player1 nonce used");
        assertTrue(rewardDistributor.isNonceUsed(player2, nonce2), "Player2 nonce used");
        assertFalse(rewardDistributor.isNonceUsed(player1, nonce2), "Player1 should not have player2's nonce");
        assertFalse(rewardDistributor.isNonceUsed(player2, nonce1), "Player2 should not have player1's nonce");
    }

    // ============ Additional Test: Multiple reward types ============

    function test_MultipleRewardTypes() public {
        uint8 gameplayReward = rewardDistributor.REWARD_GAMEPLAY();
        uint8 dailyLoginReward = rewardDistributor.REWARD_DAILY_LOGIN();

        // Gameplay reward
        uint256 nonce1 = 1;
        uint256 expiry1 = block.timestamp + 1 hours;
        bytes memory sig1 = createBackendSignature(player1, 100 ether, gameplayReward, nonce1, expiry1);

        vm.prank(player1);
        rewardDistributor.claim(100 ether, gameplayReward, nonce1, expiry1, sig1);

        // Warp past cooldown
        vm.warp(block.timestamp + 61);

        // Daily login reward
        uint256 nonce2 = 2;
        uint256 expiry2 = block.timestamp + 1 hours;
        bytes memory sig2 = createBackendSignature(player1, 50 ether, dailyLoginReward, nonce2, expiry2);

        vm.prank(player1);
        rewardDistributor.claim(50 ether, dailyLoginReward, nonce2, expiry2, sig2);

        assertEq(vscToken.balanceOf(player1), 150 ether, "Player should receive both rewards");
    }

    // ============ Additional Test: Cooldown enforcement ============

    function test_CooldownEnforcement() public {
        uint8 rewardType = rewardDistributor.REWARD_GAMEPLAY();
        uint256 cooldown = rewardDistributor.CLAIM_COOLDOWN();

        // First claim
        uint256 nonce1 = 1;
        uint256 expiry1 = block.timestamp + 1 hours;
        bytes memory sig1 = createBackendSignature(player1, REWARD_AMOUNT, rewardType, nonce1, expiry1);

        vm.prank(player1);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce1, expiry1, sig1);

        // Try to claim immediately - should fail
        uint256 nonce2 = 2;
        uint256 expiry2 = block.timestamp + 1 hours;
        bytes memory sig2 = createBackendSignature(player1, REWARD_AMOUNT, uint8(rewardType), nonce2, expiry2);

        vm.prank(player1);
        vm.expectRevert(RewardDistributor.CooldownActive.selector);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce2, expiry2, sig2);

        // Warp past cooldown
        vm.warp(block.timestamp + cooldown + 1);

        // Now it should succeed
        vm.prank(player1);
        rewardDistributor.claim(REWARD_AMOUNT, rewardType, nonce2, expiry2, sig2);

        assertEq(vscToken.balanceOf(player1), REWARD_AMOUNT * 2, "Player should receive second reward");
    }
}
