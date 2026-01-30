// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GearToken
 * @notice Template ERC20 token for gear types in Farcaster Survivors
 * @dev Deployed 6 times for: WEAPON, ARMOR, POWER, GLOVES, AMULET, BOOTS
 *      Only the bonding curve can mint/burn tokens
 */
contract GearToken is ERC20, Ownable2Step, Pausable {
    // ============ State ============
    address public bondingCurve;

    // ============ Events ============
    event BondingCurveSet(address indexed oldBondingCurve, address indexed newBondingCurve);

    // ============ Errors ============
    error NotBondingCurve();
    error ZeroAddress();

    // ============ Modifiers ============
    modifier onlyBondingCurve() {
        if (msg.sender != bondingCurve) revert NotBondingCurve();
        _;
    }

    // ============ Constructor ============
    /**
     * @notice Initialize gear token
     * @param name_ Token name (e.g., "Weapon")
     * @param symbol_ Token symbol (e.g., "WEAPON")
     * @param initialOwner Address of the initial owner
     */
    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC20(name_, symbol_)
        Ownable(initialOwner)
    {
        // Note: Ownable validates initialOwner != address(0)
    }

    // ============ External Functions ============

    /**
     * @notice Set the bonding curve address
     * @dev Only owner can set. Can be changed after initial set.
     * @param newBondingCurve Address of the bonding curve contract
     */
    function setBondingCurve(address newBondingCurve) external onlyOwner {
        if (newBondingCurve == address(0)) revert ZeroAddress();
        address oldBondingCurve = bondingCurve;
        bondingCurve = newBondingCurve;
        emit BondingCurveSet(oldBondingCurve, newBondingCurve);
    }

    /**
     * @notice Mint tokens to an address
     * @dev Only bonding curve can mint
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyBondingCurve whenNotPaused {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address
     * @dev Only bonding curve can burn
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyBondingCurve whenNotPaused {
        _burn(from, amount);
    }

    /**
     * @notice Pause token transfers and minting/burning
     * @dev Only owner can pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token transfers and minting/burning
     * @dev Only owner can unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Internal Functions ============

    /**
     * @notice Override _update to enforce pause
     * @dev Blocks all transfers when paused
     */
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
