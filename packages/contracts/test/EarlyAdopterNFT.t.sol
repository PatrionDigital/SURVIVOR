// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { EarlyAdopterNFT } from "../src/nfts/EarlyAdopterNFT.sol";

contract EarlyAdopterNFTTest is Test {
    EarlyAdopterNFT public nft;

    address public owner = address(this);
    address public signer;
    uint256 public signerPrivateKey;
    address public player1 = address(0x1);
    address public player2 = address(0x2);

    uint256 constant MAX_SUPPLY = 1000;
    uint256 constant FID1 = 12_345;
    uint256 constant FID2 = 67_890;

    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 indexed fid);

    function setUp() public {
        // Create signer keypair
        signerPrivateKey = 0xA11CE;
        signer = vm.addr(signerPrivateKey);

        // Deploy NFT contract
        nft = new EarlyAdopterNFT(signer);
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(nft.signer(), signer);
        assertEq(nft.MAX_SUPPLY(), MAX_SUPPLY);
        assertEq(nft.totalSupply(), 0);
    }

    function test_Constructor_InvalidSigner() public {
        vm.expectRevert(EarlyAdopterNFT.InvalidSigner.selector);
        new EarlyAdopterNFT(address(0));
    }

    // ============ Minting Tests ============

    function test_Mint_Success() public {
        // Create signature
        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        vm.expectEmit(true, true, true, true);
        emit NFTMinted(player1, 1, FID1);
        nft.mint(FID1, signature);

        // Check NFT was minted
        assertEq(nft.ownerOf(1), player1);
        assertEq(nft.balanceOf(player1), 1);
        assertEq(nft.totalSupply(), 1);

        // Check FID mappings
        assertTrue(nft.hasMinted(FID1));
        assertEq(nft.tokenOfFid(FID1), 1);
        assertEq(nft.fidOfToken(1), FID1);
    }

    function test_Mint_MultiplePlayers() public {
        // Player 1 mints
        bytes32 messageHash1 = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash1 =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash1));
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(signerPrivateKey, ethSignedMessageHash1);
        bytes memory signature1 = abi.encodePacked(r1, s1, v1);

        vm.prank(player1);
        nft.mint(FID1, signature1);

        // Player 2 mints
        bytes32 messageHash2 = keccak256(abi.encodePacked(player2, FID2));
        bytes32 ethSignedMessageHash2 =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash2));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(signerPrivateKey, ethSignedMessageHash2);
        bytes memory signature2 = abi.encodePacked(r2, s2, v2);

        vm.prank(player2);
        nft.mint(FID2, signature2);

        assertEq(nft.totalSupply(), 2);
        assertEq(nft.ownerOf(1), player1);
        assertEq(nft.ownerOf(2), player2);
    }

    function test_Mint_InvalidSignature() public {
        // Create signature for wrong address
        bytes32 messageHash = keccak256(abi.encodePacked(player2, FID1)); // player2 instead of
        // player1
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        vm.expectRevert(EarlyAdopterNFT.InvalidSignature.selector);
        nft.mint(FID1, signature);
    }

    function test_Mint_WrongSigner() public {
        // Sign with wrong private key
        uint256 wrongKey = 0xBAD;
        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        vm.expectRevert(EarlyAdopterNFT.InvalidSignature.selector);
        nft.mint(FID1, signature);
    }

    function test_Mint_AlreadyMinted() public {
        // First mint
        bytes32 messageHash1 = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash1 =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash1));
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(signerPrivateKey, ethSignedMessageHash1);
        bytes memory signature1 = abi.encodePacked(r1, s1, v1);

        vm.prank(player1);
        nft.mint(FID1, signature1);

        // Try to mint again with same FID (different player)
        bytes32 messageHash2 = keccak256(abi.encodePacked(player2, FID1)); // Same FID
        bytes32 ethSignedMessageHash2 =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash2));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(signerPrivateKey, ethSignedMessageHash2);
        bytes memory signature2 = abi.encodePacked(r2, s2, v2);

        vm.prank(player2);
        vm.expectRevert(EarlyAdopterNFT.AlreadyMinted.selector);
        nft.mint(FID1, signature2);
    }

    function test_Mint_MaxSupplyReached() public {
        // Mint MAX_SUPPLY tokens
        for (uint256 i = 0; i < MAX_SUPPLY; i++) {
            address minter = address(uint160(i + 100));
            uint256 fid = i + 1;

            bytes32 messageHash = keccak256(abi.encodePacked(minter, fid));
            bytes32 ethSignedMessageHash =
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
            bytes memory signature = abi.encodePacked(r, s, v);

            vm.prank(minter);
            nft.mint(fid, signature);
        }

        assertEq(nft.totalSupply(), MAX_SUPPLY);

        // Try to mint one more
        uint256 extraFid = MAX_SUPPLY + 1;
        address extraMinter = address(0x9999);
        bytes32 extraMessageHash = keccak256(abi.encodePacked(extraMinter, extraFid));
        bytes32 extraEthSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", extraMessageHash));
        (uint8 extraV, bytes32 extraR, bytes32 extraS) =
            vm.sign(signerPrivateKey, extraEthSignedMessageHash);
        bytes memory extraSignature = abi.encodePacked(extraR, extraS, extraV);

        vm.prank(extraMinter);
        vm.expectRevert(EarlyAdopterNFT.MaxSupplyReached.selector);
        nft.mint(extraFid, extraSignature);
    }

    // ============ View Function Tests ============

    function test_HasMinted() public {
        assertFalse(nft.hasMinted(FID1));

        // Mint
        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        nft.mint(FID1, signature);

        assertTrue(nft.hasMinted(FID1));
    }

    function test_TokenOfFid() public {
        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        nft.mint(FID1, signature);

        assertEq(nft.tokenOfFid(FID1), 1);
    }

    function test_FidOfToken() public {
        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        nft.mint(FID1, signature);

        assertEq(nft.fidOfToken(1), FID1);
    }

    // ============ Transferability Tests ============

    function test_Transfer() public {
        // Mint to player1
        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        nft.mint(FID1, signature);

        // Transfer to player2
        vm.prank(player1);
        nft.transferFrom(player1, player2, 1);

        assertEq(nft.ownerOf(1), player2);
        assertEq(nft.balanceOf(player1), 0);
        assertEq(nft.balanceOf(player2), 1);

        // FID mapping should remain unchanged
        assertEq(nft.fidOfToken(1), FID1);
        assertEq(nft.tokenOfFid(FID1), 1);
    }

    // ============ Pausable Tests ============

    function test_Pause() public {
        nft.pause();

        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        vm.expectRevert();
        nft.mint(FID1, signature);
    }

    function test_Unpause() public {
        nft.pause();
        nft.unpause();

        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        nft.mint(FID1, signature);

        assertEq(nft.totalSupply(), 1);
    }

    function test_Pause_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        nft.pause();
    }

    function test_Unpause_OnlyOwner() public {
        nft.pause();

        vm.prank(player1);
        vm.expectRevert();
        nft.unpause();
    }

    // ============ ERC721 Tests ============

    function test_ERC721_Name() public view {
        assertEq(nft.name(), "Farcaster Survivors Early Adopter");
    }

    function test_ERC721_Symbol() public view {
        assertEq(nft.symbol(), "FCSEA");
    }

    function test_ERC721_TokenURI() public {
        // Mint token
        bytes32 messageHash = keccak256(abi.encodePacked(player1, FID1));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(player1);
        nft.mint(FID1, signature);

        string memory uri = nft.tokenURI(1);
        assertGt(bytes(uri).length, 0);
    }

    function test_ERC721_SupportsInterface() public view {
        // ERC721
        assertTrue(nft.supportsInterface(0x80ac58cd));
        // ERC721Metadata
        assertTrue(nft.supportsInterface(0x5b5e139f));
    }
}
