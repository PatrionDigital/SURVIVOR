// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RewardDistributor
 * @notice Manages gameplay reward emissions with backend-signed claims
 * @dev Supports daily caps, cooldowns, and replay protection via nonces
 */
contract RewardDistributor is Ownable2Step, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Constants ============

    /// @notice Claim cooldown period
    uint256 public constant CLAIM_COOLDOWN = 60 seconds;

    /// @notice Reward type IDs
    uint8 public constant REWARD_GAMEPLAY = 0;
    uint8 public constant REWARD_DAILY_LOGIN = 1;
    uint8 public constant REWARD_ACHIEVEMENT = 2;
    uint8 public constant REWARD_SOCIAL = 3;

    // ============ Immutables ============

    /// @notice VSC token contract
    IERC20 public immutable vscToken;

    // ============ State Variables ============

    /// @notice Authorized signer for reward claims
    address public authorizedSigner;

    /// @notice Daily claim cap per player (default 10,000 VSC)
    uint256 public dailyPlayerCap = 10_000 * 1e18;

    /// @notice Global daily claim cap (default 1,000,000 VSC)
    uint256 public globalDailyCap = 1_000_000 * 1e18;

    /// @notice Mapping of player => nonce => used
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    /// @notice Mapping of player => day => claimed amount
    mapping(address => mapping(uint256 => uint256)) public dailyClaimedByPlayer;

    /// @notice Mapping of day => total claimed globally
    mapping(uint256 => uint256) public globalDailyClaimed;

    /// @notice Mapping of player => last claim timestamp
    mapping(address => uint256) public lastClaimTime;

    // ============ Events ============

    /// @notice Emitted when a reward is claimed
    event RewardClaimed(
        address indexed player,
        uint256 amount,
        uint8 rewardType,
        uint256 nonce
    );

    /// @notice Emitted when the authorized signer is updated
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    /// @notice Emitted when daily caps are updated
    event DailyCapUpdated(uint256 playerCap, uint256 globalCap);

    /// @notice Emitted when tokens are withdrawn (emergency)
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    // ============ Errors ============

    /// @notice Thrown when signature is invalid
    error InvalidSignature();

    /// @notice Thrown when nonce has already been used
    error NonceAlreadyUsed();

    /// @notice Thrown when claim has expired
    error ClaimExpired();

    /// @notice Thrown when daily cap is exceeded
    error DailyCapExceeded();

    /// @notice Thrown when claim cooldown is active
    error CooldownActive();

    /// @notice Thrown when address is zero
    error ZeroAddress();

    /// @notice Thrown when amount is zero
    error ZeroAmount();

    /// @notice Thrown when reward type is invalid
    error InvalidRewardType();

    /// @notice Thrown when transfer fails
    error TransferFailed();

    // ============ Constructor ============

    /**
     * @notice Initializes the RewardDistributor contract
     * @param _owner Contract owner address
     * @param _vscToken VSC token contract address
     * @param _authorizedSigner Initial authorized signer address
     */
    constructor(
        address _owner,
        address _vscToken,
        address _authorizedSigner
    ) Ownable(_owner) {
        if (_vscToken == address(0)) revert ZeroAddress();
        if (_authorizedSigner == address(0)) revert ZeroAddress();

        vscToken = IERC20(_vscToken);
        authorizedSigner = _authorizedSigner;
    }

    // ============ External Functions ============

    /**
     * @notice Claim rewards with a backend-signed message
     * @param amount Amount of VSC to claim
     * @param rewardType Type of reward (0-3)
     * @param nonce Unique nonce for this claim
     * @param expiry Timestamp when claim expires
     * @param signature Backend signature authorizing the claim
     */
    function claim(
        uint256 amount,
        uint8 rewardType,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (rewardType > REWARD_SOCIAL) revert InvalidRewardType();
        if (block.timestamp > expiry) revert ClaimExpired();
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed();

        // Check cooldown (skip for first-time claimers)
        uint256 playerLastClaim = lastClaimTime[msg.sender];
        if (playerLastClaim != 0 && block.timestamp < playerLastClaim + CLAIM_COOLDOWN) {
            revert CooldownActive();
        }

        // Check daily caps
        uint256 today = block.timestamp / 1 days;
        if (dailyClaimedByPlayer[msg.sender][today] + amount > dailyPlayerCap) {
            revert DailyCapExceeded();
        }
        if (globalDailyClaimed[today] + amount > globalDailyCap) {
            revert DailyCapExceeded();
        }

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                rewardType,
                nonce,
                expiry,
                block.chainid,
                address(this)
            )
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);

        if (signer != authorizedSigner) revert InvalidSignature();

        // Update state
        usedNonces[msg.sender][nonce] = true;
        dailyClaimedByPlayer[msg.sender][today] += amount;
        globalDailyClaimed[today] += amount;
        lastClaimTime[msg.sender] = block.timestamp;

        // Transfer tokens
        bool success = vscToken.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit RewardClaimed(msg.sender, amount, rewardType, nonce);
    }

    // ============ View Functions ============

    /**
     * @notice Get total claimed by player today
     * @param player Player address
     * @return Amount claimed today
     */
    function getDailyClaimed(address player) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        return dailyClaimedByPlayer[player][today];
    }

    /**
     * @notice Get total claimed globally today
     * @return Amount claimed globally today
     */
    function getGlobalDailyClaimed() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        return globalDailyClaimed[today];
    }

    /**
     * @notice Check if a nonce has been used
     * @param player Player address
     * @param nonce Nonce to check
     * @return True if nonce has been used
     */
    function isNonceUsed(address player, uint256 nonce) external view returns (bool) {
        return usedNonces[player][nonce];
    }

    /**
     * @notice Get player's last claim timestamp
     * @param player Player address
     * @return Timestamp of last claim
     */
    function getLastClaimTime(address player) external view returns (uint256) {
        return lastClaimTime[player];
    }

    /**
     * @notice Get remaining daily allowance for a player
     * @param player Player address
     * @return Remaining amount player can claim today
     */
    function getRemainingDailyAllowance(address player) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        uint256 claimed = dailyClaimedByPlayer[player][today];
        if (claimed >= dailyPlayerCap) return 0;
        return dailyPlayerCap - claimed;
    }

    /**
     * @notice Get remaining global daily allowance
     * @return Remaining amount that can be claimed globally today
     */
    function getRemainingGlobalAllowance() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        uint256 claimed = globalDailyClaimed[today];
        if (claimed >= globalDailyCap) return 0;
        return globalDailyCap - claimed;
    }

    /**
     * @notice Check if player can claim (cooldown check)
     * @param player Player address
     * @return True if cooldown has elapsed
     */
    function canClaim(address player) external view returns (bool) {
        uint256 playerLastClaim = lastClaimTime[player];
        if (playerLastClaim == 0) return true;
        return block.timestamp >= playerLastClaim + CLAIM_COOLDOWN;
    }

    /**
     * @notice Get contract's VSC balance
     * @return Balance of VSC tokens in this contract
     */
    function getBalance() external view returns (uint256) {
        return vscToken.balanceOf(address(this));
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the authorized signer
     * @param newSigner New signer address
     */
    function setAuthorizedSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();

        address oldSigner = authorizedSigner;
        authorizedSigner = newSigner;

        emit SignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Set daily caps
     * @param playerCap New daily cap per player
     * @param globalCap New global daily cap
     */
    function setDailyCaps(uint256 playerCap, uint256 globalCap) external onlyOwner {
        dailyPlayerCap = playerCap;
        globalDailyCap = globalCap;

        emit DailyCapUpdated(playerCap, globalCap);
    }

    /**
     * @notice Set daily player cap
     * @param cap New daily cap per player
     */
    function setDailyPlayerCap(uint256 cap) external onlyOwner {
        dailyPlayerCap = cap;
        emit DailyCapUpdated(cap, globalDailyCap);
    }

    /**
     * @notice Set global daily cap
     * @param cap New global daily cap
     */
    function setGlobalDailyCap(uint256 cap) external onlyOwner {
        globalDailyCap = cap;
        emit DailyCapUpdated(dailyPlayerCap, cap);
    }

    /**
     * @notice Emergency withdraw tokens
     * @param token Token address to withdraw
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();

        bool success = IERC20(token).transfer(to, amount);
        if (!success) revert TransferFailed();

        emit EmergencyWithdraw(token, to, amount);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
