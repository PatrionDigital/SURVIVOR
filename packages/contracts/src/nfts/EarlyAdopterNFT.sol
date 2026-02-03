// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title EarlyAdopterNFT
 * @notice ERC-721 NFT for early community members
 * @dev One NFT per Farcaster FID, minted with backend signature verification
 *
 * Benefits:
 * - 10% gameplay reward bonus
 * - Exclusive profile frames
 * - Transferable
 *
 * Minting:
 * - Backend signs (minter address, FID)
 * - One per FID (unique constraint)
 * - Max supply: 1,000
 */
contract EarlyAdopterNFT is ERC721, Ownable, Pausable {
    // ============ Constants ============

    /// @notice Maximum number of NFTs that can be minted
    uint256 public constant MAX_SUPPLY = 1000;

    // ============ State ============

    /// @notice Backend signer address for mint authorization
    address public immutable signer;

    /// @notice Current token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Mapping from FID to token ID
    mapping(uint256 => uint256) private _fidToToken;

    /// @notice Mapping from token ID to FID
    mapping(uint256 => uint256) private _tokenToFid;

    /// @notice Mapping to track if FID has minted
    mapping(uint256 => bool) private _hasMintedFid;

    // ============ Events ============

    /// @notice Emitted when an NFT is minted
    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 indexed fid);

    // ============ Errors ============

    error InvalidSigner();
    error MaxSupplyReached();
    error AlreadyMinted();
    error InvalidSignature();

    // ============ Constructor ============

    /**
     * @notice Initializes the EarlyAdopterNFT contract
     * @param _signer Address of the backend signer for mint authorization
     */
    constructor(address _signer)
        ERC721("Farcaster Survivors Early Adopter", "FCSEA")
        Ownable(msg.sender)
    {
        if (_signer == address(0)) {
            revert InvalidSigner();
        }
        signer = _signer;
    }

    // ============ External Functions ============

    /**
     * @notice Mint an Early Adopter NFT with backend signature
     * @param fid The Farcaster FID of the minter
     * @param signature Backend signature authorizing the mint
     * @dev Signature must be from authorized signer for (msg.sender, fid)
     */
    function mint(uint256 fid, bytes calldata signature) external whenNotPaused {
        // Check max supply
        if (_tokenIdCounter >= MAX_SUPPLY) revert MaxSupplyReached();

        // Check if FID already minted
        if (_hasMintedFid[fid]) revert AlreadyMinted();

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, fid));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);

        if (recoveredSigner != signer) revert InvalidSignature();

        // Increment token ID (start from 1)
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Mark FID as minted
        _hasMintedFid[fid] = true;

        // Store mappings
        _fidToToken[fid] = tokenId;
        _tokenToFid[tokenId] = fid;

        // Mint NFT
        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, fid);
    }

    /**
     * @notice Pause minting (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause minting (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get total number of NFTs minted
     * @return count Total supply
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Check if a FID has already minted
     * @param fid The Farcaster FID to check
     * @return minted True if FID has minted, false otherwise
     */
    function hasMinted(uint256 fid) external view returns (bool) {
        return _hasMintedFid[fid];
    }

    /**
     * @notice Get the token ID for a given FID
     * @param fid The Farcaster FID
     * @return tokenId The token ID (0 if not minted)
     */
    function tokenOfFid(uint256 fid) external view returns (uint256) {
        return _fidToToken[fid];
    }

    /**
     * @notice Get the FID for a given token ID
     * @param tokenId The token ID
     * @return fid The Farcaster FID (0 if not minted)
     */
    function fidOfToken(uint256 tokenId) external view returns (uint256) {
        return _tokenToFid[tokenId];
    }

    /**
     * @notice Get the token URI for a given token ID
     * @param tokenId The token ID
     * @return uri The token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(
            abi.encodePacked(
                "https://farcastersurvivors.game/api/metadata/early-adopter/", _toString(tokenId)
            )
        );
    }

    // ============ Internal Functions ============

    /**
     * @notice Convert uint256 to string
     * @param value The value to convert
     * @return The string representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
