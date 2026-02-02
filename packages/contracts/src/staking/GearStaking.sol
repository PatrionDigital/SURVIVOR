// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GearStaking
 * @notice Manages gear token staking across 6 slots with power calculation
 * @dev Players stake gear tokens to slots to gain stat bonuses
 *
 * Gear Slots:
 * - 0: WEAPON (+% Base Damage)
 * - 1: ARMOR (+% Damage Reduction)
 * - 2: POWER (+% Area of Effect)
 * - 3: GLOVES (+% Attack Speed)
 * - 4: AMULET (+% XP Gain)
 * - 5: BOOTS (+% Movement Speed)
 *
 * Power Calculation:
 * - basePower = sqrt(stakedAmount) * slotMultiplier
 * - maintenanceBonus = basePower * 0.5 (if maintenance active)
 * - totalPower = basePower + maintenanceBonus
 */
contract GearStaking is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint8 public constant NUM_SLOTS = 6;
    uint256 public constant STAKE_FEE_BPS = 500; // 5% fee on stake
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAINTENANCE_BONUS_BPS = 5000; // 50% bonus when maintenance active

    // Tier thresholds (in token units, not wei)
    uint256 public constant TIER_COMMON = 1;
    uint256 public constant TIER_UNCOMMON = 100;
    uint256 public constant TIER_RARE = 1000;
    uint256 public constant TIER_EPIC = 10_000;
    uint256 public constant TIER_LEGENDARY = 100_000;

    // ============ Immutables ============
    // Gear token addresses for each slot
    address[6] public gearTokens;

    // ============ State ============
    // Player => Slot => Staked Amount
    mapping(address => mapping(uint8 => uint256)) public stakedAmounts;

    // Treasury address for fee collection
    address public treasury;

    // Maintenance pool contract (for bonus calculation)
    address public maintenancePool;

    // ============ Structs ============
    struct PlayerStats {
        uint256[6] stakedAmounts;
        uint256[6] slotPowers;
        uint256 totalPower;
        bool maintenanceActive;
    }

    // ============ Events ============
    event TokensStaked(address indexed player, uint8 indexed slot, uint256 amount, uint256 fee);
    event TokensUnstaked(address indexed player, uint8 indexed slot, uint256 amount);
    event PowerUpdated(address indexed player, uint256 totalPower);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event MaintenancePoolUpdated(address indexed oldPool, address indexed newPool);

    // ============ Errors ============
    error InvalidSlot();
    error InsufficientStake();
    error ZeroAmount();
    error ZeroAddress();
    error InvalidGearTokens();

    // ============ Constructor ============
    /**
     * @notice Initialize GearStaking contract
     * @param initialOwner Owner address
     * @param _gearTokens Array of 6 gear token addresses [WEAPON, ARMOR, POWER, GLOVES, AMULET,
     * BOOTS]
     * @param _treasury Treasury address for fee collection
     */
    constructor(address initialOwner, address[6] memory _gearTokens, address _treasury)
        Ownable(initialOwner)
    {
        if (_treasury == address(0)) revert ZeroAddress();

        // Validate all gear tokens are set
        for (uint8 i = 0; i < NUM_SLOTS; i++) {
            if (_gearTokens[i] == address(0)) revert InvalidGearTokens();
            gearTokens[i] = _gearTokens[i];
        }

        treasury = _treasury;
    }

    // ============ External Functions ============

    /**
     * @notice Stake gear tokens to a slot
     * @param slot Slot index (0-5)
     * @param amount Amount of tokens to stake (before fee)
     */
    function stake(uint8 slot, uint256 amount) external nonReentrant whenNotPaused {
        if (slot >= NUM_SLOTS) revert InvalidSlot();
        if (amount == 0) revert ZeroAmount();

        // Calculate fee
        uint256 fee = (amount * STAKE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amount - fee;

        // Transfer tokens from user
        IERC20 token = IERC20(gearTokens[slot]);
        token.safeTransferFrom(msg.sender, address(this), amountAfterFee);

        // Transfer fee to treasury
        if (fee > 0) token.safeTransferFrom(msg.sender, treasury, fee);

        // Update staked amount
        stakedAmounts[msg.sender][slot] += amountAfterFee;

        emit TokensStaked(msg.sender, slot, amountAfterFee, fee);
        emit PowerUpdated(msg.sender, getTotalPower(msg.sender));
    }

    /**
     * @notice Unstake gear tokens from a slot
     * @param slot Slot index (0-5)
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint8 slot, uint256 amount) external nonReentrant whenNotPaused {
        if (slot >= NUM_SLOTS) revert InvalidSlot();
        if (amount == 0) revert ZeroAmount();
        if (stakedAmounts[msg.sender][slot] < amount) revert InsufficientStake();

        // Update staked amount
        stakedAmounts[msg.sender][slot] -= amount;

        // Transfer tokens back to user (no fee on unstake)
        IERC20(gearTokens[slot]).safeTransfer(msg.sender, amount);

        emit TokensUnstaked(msg.sender, slot, amount);
        emit PowerUpdated(msg.sender, getTotalPower(msg.sender));
    }

    /**
     * @notice Set treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Set maintenance pool address
     * @param newPool New maintenance pool address
     */
    function setMaintenancePool(address newPool) external onlyOwner {
        address oldPool = maintenancePool;
        maintenancePool = newPool;
        emit MaintenancePoolUpdated(oldPool, newPool);
    }

    /**
     * @notice Pause staking operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause staking operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get staked amount for a player in a specific slot
     * @param player Player address
     * @param slot Slot index
     * @return Staked amount
     */
    function getStakedAmount(address player, uint8 slot) external view returns (uint256) {
        if (slot >= NUM_SLOTS) revert InvalidSlot();
        return stakedAmounts[player][slot];
    }

    /**
     * @notice Calculate gear power for a specific slot
     * @dev Power = sqrt(stakedAmount) * slotMultiplier (currently 1x for all slots)
     * @param player Player address
     * @param slot Slot index
     * @return Gear power for the slot
     */
    function getGearPower(address player, uint8 slot) public view returns (uint256) {
        if (slot >= NUM_SLOTS) revert InvalidSlot();
        uint256 staked = stakedAmounts[player][slot];
        if (staked == 0) return 0;

        // Power = sqrt(staked) - using Babylonian method for integer sqrt
        // Normalize to 18 decimals for consistency
        return _sqrt(staked);
    }

    /**
     * @notice Calculate total power across all slots
     * @param player Player address
     * @return Total power including maintenance bonus if applicable
     */
    function getTotalPower(address player) public view returns (uint256) {
        uint256 basePower = 0;

        for (uint8 i = 0; i < NUM_SLOTS; i++) {
            basePower += getGearPower(player, i);
        }

        // Apply maintenance bonus if pool is active
        if (_isMaintenanceActive(player)) {
            uint256 bonus = (basePower * MAINTENANCE_BONUS_BPS) / BPS_DENOMINATOR;
            return basePower + bonus;
        }

        return basePower;
    }

    /**
     * @notice Get complete player stats
     * @param player Player address
     * @return stats PlayerStats struct with all staking info
     */
    function getPlayerStats(address player) external view returns (PlayerStats memory stats) {
        for (uint8 i = 0; i < NUM_SLOTS; i++) {
            stats.stakedAmounts[i] = stakedAmounts[player][i];
            stats.slotPowers[i] = getGearPower(player, i);
        }
        stats.maintenanceActive = _isMaintenanceActive(player);
        stats.totalPower = getTotalPower(player);
    }

    /**
     * @notice Get tier based on staked amount
     * @param stakedAmount Amount of tokens staked (in wei)
     * @return Tier level (0=None, 1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary)
     */
    function getTier(uint256 stakedAmount) external pure returns (uint8) {
        // Convert from wei to token units for tier comparison
        uint256 tokenUnits = stakedAmount / 1e18;

        if (tokenUnits >= TIER_LEGENDARY) return 5;
        if (tokenUnits >= TIER_EPIC) return 4;
        if (tokenUnits >= TIER_RARE) return 3;
        if (tokenUnits >= TIER_UNCOMMON) return 2;
        if (tokenUnits >= TIER_COMMON) return 1;
        return 0;
    }

    /**
     * @notice Get total staked value across all slots for a player
     * @param player Player address
     * @return Total staked value
     */
    function getTotalStaked(address player) external view returns (uint256) {
        uint256 total = 0;
        for (uint8 i = 0; i < NUM_SLOTS; i++) {
            total += stakedAmounts[player][i];
        }
        return total;
    }

    // ============ Internal Functions ============

    /**
     * @notice Check if maintenance is active for a player
     * @dev Calls MaintenancePool contract if set
     * @param player Player address
     * @return Whether maintenance bonus is active
     */
    function _isMaintenanceActive(address player) internal view returns (bool) {
        if (maintenancePool == address(0)) return false;

        // Call maintenance pool to check status
        // Interface: getMaintenanceStatus(address) returns (bool)
        (bool success, bytes memory data) = maintenancePool.staticcall(
            abi.encodeWithSignature("getMaintenanceStatus(address)", player)
        );

        if (success && data.length >= 32) return abi.decode(data, (bool));

        return false;
    }

    /**
     * @notice Integer square root using Babylonian method
     * @param x Input value
     * @return y Square root of x
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;

        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
