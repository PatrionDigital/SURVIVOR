// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Interface for VSCToken with burn function
 */
interface IVSCToken is IERC20 {
    function burn(address from, uint256 amount) external;
}

/**
 * @title GlobalUpgradeNFT
 * @notice ERC-1155 contract for permanent stat upgrade NFTs
 * @dev Players mint upgrades by burning VSC tokens. Cost increases progressively per player.
 *
 * 7 Upgrade Types:
 * 1. Max Health (+5% per level)
 * 2. Base Damage (+5% per level)
 * 3. Move Speed (+5% per level)
 * 4. XP Gain (+5% per level)
 * 5. Pickup Range (+10% per level)
 * 6. Revival (+1 extra life per level)
 * 7. Starting Weapon (+1 slot per level)
 *
 * Cost Formula: baseCost * (1 + (ownedCount * escalationMultiplier))
 * - baseCost = 1,000 VSC
 * - escalationMultiplier = 0.5 (50%)
 * - Max 10 per type per player
 */
contract GlobalUpgradeNFT is ERC1155, Ownable, Pausable {
    // ============ Immutables ============

    /// @notice The VSC token used for minting upgrades
    IVSCToken public immutable vscToken;

    /// @notice Base cost for the first upgrade (1,000 VSC)
    uint256 public constant BASE_COST = 1000 ether;

    /// @notice Escalation multiplier as basis points (50 = 0.5 = 50%)
    uint256 public constant ESCALATION_MULTIPLIER = 50;

    /// @notice Maximum upgrades per type per player
    uint256 public constant MAX_PER_TYPE = 10;

    /// @notice Total number of upgrade types
    uint256 public constant UPGRADE_TYPES = 7;

    // ============ Events ============

    /// @notice Emitted when a player mints an upgrade
    event UpgradeMinted(address indexed player, uint256 indexed upgradeType, uint256 cost);

    // ============ Errors ============

    error InvalidToken();
    error InvalidUpgradeType();
    error MaxUpgradesReached();

    // ============ Constructor ============

    /**
     * @notice Initializes the GlobalUpgradeNFT contract
     * @param _vscToken Address of the VSC token contract
     */
    constructor(address _vscToken)
        ERC1155("https://farcastersurvivors.game/api/metadata/upgrade/{id}")
        Ownable(msg.sender)
    {
        if (_vscToken == address(0)) revert InvalidToken();
        vscToken = IVSCToken(_vscToken);
    }

    // ============ External Functions ============

    /**
     * @notice Mint an upgrade by burning VSC tokens
     * @param upgradeType The type of upgrade to mint (1-7)
     * @dev Cost increases progressively based on owned count
     */
    function mint(uint256 upgradeType) external whenNotPaused {
        // Validate upgrade type
        if (upgradeType == 0 || upgradeType > UPGRADE_TYPES) revert InvalidUpgradeType();

        // Check max upgrades
        uint256 currentCount = balanceOf(msg.sender, upgradeType);
        if (currentCount >= MAX_PER_TYPE) revert MaxUpgradesReached();

        // Calculate cost
        uint256 cost = getMintCost(msg.sender, upgradeType);

        // Burn VSC from player
        // Note: Player must have approved this contract first
        // This contract must be added as a minter in VSCToken
        vscToken.burn(msg.sender, cost);

        // Mint the upgrade NFT
        _mint(msg.sender, upgradeType, 1, "");

        emit UpgradeMinted(msg.sender, upgradeType, cost);
    }

    /**
     * @notice Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Calculate the cost to mint the next upgrade of a given type
     * @param player Address of the player
     * @param upgradeType The type of upgrade (1-7)
     * @return cost The cost in VSC tokens
     * @dev Formula: baseCost * (1 + (ownedCount * escalationMultiplier))
     *      Example: 1st = 1000, 2nd = 1500, 3rd = 2000, etc.
     */
    function getMintCost(address player, uint256 upgradeType) public view returns (uint256) {
        if (upgradeType == 0 || upgradeType > UPGRADE_TYPES) revert InvalidUpgradeType();

        uint256 ownedCount = balanceOf(player, upgradeType);

        // cost = baseCost * (100 + ownedCount * escalationMultiplier) / 100
        // This avoids floating point math while maintaining precision
        return (BASE_COST * (100 + ownedCount * ESCALATION_MULTIPLIER)) / 100;
    }

    /**
     * @notice Get the number of upgrades owned by a player for a specific type
     * @param player Address of the player
     * @param upgradeType The type of upgrade (1-7)
     * @return count Number of upgrades owned
     */
    function getUpgradeCount(address player, uint256 upgradeType) external view returns (uint256) {
        return balanceOf(player, upgradeType);
    }

    /**
     * @notice Get all upgrade counts for a player
     * @param player Address of the player
     * @return upgrades Array of upgrade counts [0-6] for types [1-7]
     */
    function getAllUpgrades(address player) external view returns (uint256[7] memory upgrades) {
        for (uint256 i = 0; i < UPGRADE_TYPES; i++) {
            upgrades[i] = balanceOf(player, i + 1);
        }
        return upgrades;
    }
}
