// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MaintenancePool
 * @notice Handles maintenance deposits and weekly decay for gear staking bonuses
 * @dev Players deposit $VSC to maintain gear power bonuses
 *
 * Mechanics:
 * - Players deposit $VSC to their maintenance pool
 * - Pool decays at 1% per week
 * - When pool >= threshold, gear gets +50% bonus power
 * - Threshold = sum of all staked gear values × maintenance multiplier
 */
contract MaintenancePool is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant WEEKLY_DECAY_BPS = 100; // 1% per week
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant SECONDS_PER_WEEK = 7 days;

    // ============ Immutables ============
    IERC20 public immutable vscToken;

    // ============ State ============
    // GearStaking contract reference
    address public gearStaking;

    // Maintenance multiplier (e.g., 1000 = 10% of staked value required)
    uint256 public maintenanceMultiplierBps = 1000; // 10%

    // Player maintenance data
    struct MaintenanceData {
        uint256 balance;
        uint256 lastUpdateTime;
    }

    mapping(address => MaintenanceData) public maintenanceData;

    // ============ Events ============
    event MaintenanceDeposited(address indexed player, uint256 amount, uint256 newBalance);
    event MaintenanceWithdrawn(address indexed player, uint256 amount, uint256 newBalance);
    event DecayApplied(address indexed player, uint256 decayAmount, uint256 newBalance);
    event MaintenanceStatusChanged(address indexed player, bool active);
    event GearStakingUpdated(address indexed oldStaking, address indexed newStaking);
    event MaintenanceMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);

    // ============ Errors ============
    error InsufficientBalance();
    error ZeroAmount();
    error ZeroAddress();

    // ============ Constructor ============
    /**
     * @notice Initialize MaintenancePool contract
     * @param initialOwner Owner address
     * @param _vscToken VSC token address
     */
    constructor(
        address initialOwner,
        address _vscToken
    ) Ownable(initialOwner) {
        if (_vscToken == address(0)) revert ZeroAddress();
        vscToken = IERC20(_vscToken);
    }

    // ============ External Functions ============

    /**
     * @notice Deposit VSC tokens to maintenance pool
     * @param amount Amount of VSC to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        // Apply decay before deposit
        _applyDecay(msg.sender);

        // Transfer tokens from user
        vscToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update balance
        maintenanceData[msg.sender].balance += amount;
        maintenanceData[msg.sender].lastUpdateTime = block.timestamp;

        emit MaintenanceDeposited(msg.sender, amount, maintenanceData[msg.sender].balance);

        // Check if status changed
        _emitStatusIfChanged(msg.sender);
    }

    /**
     * @notice Withdraw VSC tokens from maintenance pool
     * @param amount Amount of VSC to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        // Apply decay before withdrawal
        _applyDecay(msg.sender);

        if (maintenanceData[msg.sender].balance < amount) revert InsufficientBalance();

        // Update balance
        maintenanceData[msg.sender].balance -= amount;

        // Transfer tokens to user
        vscToken.safeTransfer(msg.sender, amount);

        emit MaintenanceWithdrawn(msg.sender, amount, maintenanceData[msg.sender].balance);

        // Check if status changed
        _emitStatusIfChanged(msg.sender);
    }

    /**
     * @notice Force apply decay for a player (can be called by anyone)
     * @param player Player address
     */
    function applyDecay(address player) external {
        _applyDecay(player);
    }

    /**
     * @notice Set GearStaking contract address
     * @param newGearStaking New GearStaking address
     */
    function setGearStaking(address newGearStaking) external onlyOwner {
        address oldStaking = gearStaking;
        gearStaking = newGearStaking;
        emit GearStakingUpdated(oldStaking, newGearStaking);
    }

    /**
     * @notice Set maintenance multiplier
     * @param newMultiplierBps New multiplier in basis points
     */
    function setMaintenanceMultiplier(uint256 newMultiplierBps) external onlyOwner {
        uint256 oldMultiplier = maintenanceMultiplierBps;
        maintenanceMultiplierBps = newMultiplierBps;
        emit MaintenanceMultiplierUpdated(oldMultiplier, newMultiplierBps);
    }

    /**
     * @notice Pause maintenance operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause maintenance operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get current pool balance after decay
     * @param player Player address
     * @return Current balance after decay
     */
    function getPoolBalance(address player) public view returns (uint256) {
        MaintenanceData storage data = maintenanceData[player];
        if (data.balance == 0) return 0;

        uint256 pendingDecay = _calculateDecay(player);
        return data.balance > pendingDecay ? data.balance - pendingDecay : 0;
    }

    /**
     * @notice Get maintenance threshold for a player
     * @dev Threshold = total staked value * maintenance multiplier
     * @param player Player address
     * @return Threshold amount
     */
    function getThreshold(address player) public view returns (uint256) {
        if (gearStaking == address(0)) return 0;

        // Call GearStaking to get total staked
        (bool success, bytes memory data) = gearStaking.staticcall(
            abi.encodeWithSignature("getTotalStaked(address)", player)
        );

        if (!success || data.length < 32) return 0;

        uint256 totalStaked = abi.decode(data, (uint256));
        return (totalStaked * maintenanceMultiplierBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Check if maintenance is active for a player
     * @param player Player address
     * @return Whether maintenance bonus is active
     */
    function getMaintenanceStatus(address player) external view returns (bool) {
        uint256 balance = getPoolBalance(player);
        uint256 threshold = getThreshold(player);

        // Active if balance >= threshold and threshold > 0
        return threshold > 0 && balance >= threshold;
    }

    /**
     * @notice Get pending decay amount
     * @param player Player address
     * @return Amount of tokens that will be decayed
     */
    function getPendingDecay(address player) external view returns (uint256) {
        return _calculateDecay(player);
    }

    /**
     * @notice Get raw maintenance data without decay applied
     * @param player Player address
     * @return balance Raw balance
     * @return lastUpdateTime Last update timestamp
     */
    function getRawMaintenanceData(address player) external view returns (uint256 balance, uint256 lastUpdateTime) {
        MaintenanceData storage data = maintenanceData[player];
        return (data.balance, data.lastUpdateTime);
    }

    /**
     * @notice Get maintenance percentage (balance / threshold * 100)
     * @param player Player address
     * @return Percentage (0-100+, can exceed 100)
     */
    function getMaintenancePercentage(address player) external view returns (uint256) {
        uint256 threshold = getThreshold(player);
        if (threshold == 0) return 0;

        uint256 balance = getPoolBalance(player);
        return (balance * 100) / threshold;
    }

    // ============ Internal Functions ============

    /**
     * @notice Apply accumulated decay to a player's balance
     * @param player Player address
     */
    function _applyDecay(address player) internal {
        uint256 decayAmount = _calculateDecay(player);
        if (decayAmount == 0) return;

        MaintenanceData storage data = maintenanceData[player];

        // Apply decay (floor at 0)
        if (decayAmount >= data.balance) {
            decayAmount = data.balance;
            data.balance = 0;
        } else {
            data.balance -= decayAmount;
        }

        data.lastUpdateTime = block.timestamp;

        emit DecayApplied(player, decayAmount, data.balance);
    }

    /**
     * @notice Calculate decay amount based on time elapsed
     * @param player Player address
     * @return Decay amount
     */
    function _calculateDecay(address player) internal view returns (uint256) {
        MaintenanceData storage data = maintenanceData[player];
        if (data.balance == 0 || data.lastUpdateTime == 0) return 0;

        uint256 timeElapsed = block.timestamp - data.lastUpdateTime;
        if (timeElapsed == 0) return 0;

        // Calculate weekly decay rate applied over time
        // decay = balance * (weeklyDecayRate / 100) * (timeElapsed / secondsPerWeek)
        // decay = balance * WEEKLY_DECAY_BPS * timeElapsed / (BPS_DENOMINATOR * SECONDS_PER_WEEK)
        uint256 decay = (data.balance * WEEKLY_DECAY_BPS * timeElapsed) / (BPS_DENOMINATOR * SECONDS_PER_WEEK);

        return decay;
    }

    /**
     * @notice Emit status change event if maintenance status changed
     * @param player Player address
     */
    function _emitStatusIfChanged(address player) internal {
        uint256 balance = maintenanceData[player].balance;
        uint256 threshold = getThreshold(player);

        bool isActive = threshold > 0 && balance >= threshold;
        emit MaintenanceStatusChanged(player, isActive);
    }
}
