// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VSCToken
 * @notice Primary currency token for Farcaster Survivors
 * @dev ERC20 token with 100B max supply, burnable, pausable
 */
contract VSCToken is ERC20, ERC20Burnable, ERC20Permit, Ownable2Step, Pausable {
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10 ** 18; // 100B tokens

    // ============ State ============
    mapping(address => bool) public minters;

    // ============ Events ============
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    // ============ Errors ============
    error NotMinter();
    error ExceedsMaxSupply();
    error ZeroAddress();

    // ============ Modifiers ============
    modifier onlyMinter() {
        if (!minters[msg.sender]) revert NotMinter();
        _;
    }

    // ============ Constructor ============
    constructor(address initialOwner)
        ERC20("Survivor Coin", "VSC")
        ERC20Permit("Survivor Coin")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0)) revert ZeroAddress();
    }

    // ============ External Functions ============

    /**
     * @notice Add a new minter
     * @param minter Address to grant minting rights
     */
    function addMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @notice Remove a minter
     * @param minter Address to revoke minting rights
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @notice Mint new tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyMinter whenNotPaused {
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address (minter only)
     * @dev Used by BondingCurve for sell operations
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyMinter whenNotPaused {
        _burn(from, amount);
    }

    /**
     * @notice Pause token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Internal Functions ============

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
