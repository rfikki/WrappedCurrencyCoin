// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Author: @rfikki - wrapping currency coin contract
// This contract allows users to wrap and unwrap CurrencyCoin into a new token called WrappedCurrencyCoin (WCC).
// Importing OpenZeppelin's ERC20 and Ownable contracts for standard token functionality and ownership control

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for interacting with the CurrencyCoin contract
interface CurrencyCoin {
    // Returns the balance of a specific address in the CurrencyCoin contract
    function coinBalanceOf(address _owner) external returns (uint256);

    // Sends a specified amount of CurrencyCoin to a receiver
    function sendCoin(uint256 _amount, address _receiver) external;
}

// DropBox contract allows users to collect coins from it
// It is owned by the user who creates it
contract DropBox is Ownable {
    // Constructor sets the owner of the DropBox to the address that deploys it
    constructor(address _owner) {
        transferOwnership(_owner);
    }

    // Function to collect a specified value of coins from the DropBox
    // Only the owner of the DropBox can call this function
    function collect(uint256 value, CurrencyCoin ccInt) public onlyOwner {
        // Calls the CurrencyCoin contract to send coins to the owner
        ccInt.sendCoin(value, owner());
    }
}

// WrappedCurrencyCoin contract implements an ERC20 token that wraps CurrencyCoin
contract WrappedCurrencyCoin is ERC20 {
    // Events to log important actions for transparency and traceability
    event DropBoxCreated(address indexed owner); // Emitted when a DropBox is created
    event Wrapped(uint256 indexed value, address indexed owner); // Emitted when coins are wrapped
    event Unwrapped(uint256 indexed value, address indexed owner); // Emitted when coins are unwrapped

    // Address of the CurrencyCoin contract (hardcoded for now)
    address public immutable ccAddr;

    // Instance of the CurrencyCoin contract
    CurrencyCoin public immutable ccInt;

    // Mapping to store the DropBox address for each user
    mapping(address => address) public dropBoxes;

    // Constructor initializes the ERC20 token with a name and symbol
    // It also sets the CurrencyCoin contract address
    constructor(address _ccAddr) ERC20("Wrapped CurrencyCoin", "WCC") {
        require(_ccAddr != address(0), "Invalid CurrencyCoin address");
        ccAddr = _ccAddr;
        ccInt = CurrencyCoin(ccAddr);
    }

    // Function to create a DropBox for the caller
    function createDropBox() public {
        // Ensure the caller does not already have a DropBox
        require(dropBoxes[msg.sender] == address(0), "Drop box already exists");

        // Create a new DropBox and associate it with the caller
        dropBoxes[msg.sender] = address(new DropBox(msg.sender));

        // Emit an event to log the creation of the DropBox
        emit DropBoxCreated(msg.sender);
    }

    // Function to wrap CurrencyCoin into WCC tokens
    function wrap(uint256 value) public {
        // Get the caller's DropBox address
        address dropBox = dropBoxes[msg.sender];

        // Ensure the caller has created a DropBox
        require(dropBox != address(0), "You must create a drop box first");

        // Ensure the DropBox has enough CurrencyCoin to wrap
        require(ccInt.coinBalanceOf(dropBox) >= value, "Not enough coins in drop box");

        // Collect the specified value of CurrencyCoin from the DropBox
        DropBox(dropBox).collect(value, ccInt);

        // Mint the equivalent amount of WCC tokens to the caller
        _mint(msg.sender, value);

        // Emit an event to log the wrapping action
        emit Wrapped(value, msg.sender);
    }

    // Function to unwrap WCC tokens back into CurrencyCoin
    function unwrap(uint256 value) public {
        // Ensure the caller has enough WCC tokens to unwrap
        require(balanceOf(msg.sender) >= value, "Not enough coins to unwrap");

        // Send the equivalent amount of CurrencyCoin to the caller
        ccInt.sendCoin(value, msg.sender);

        // Burn the specified amount of WCC tokens from the caller
        _burn(msg.sender, value);

        // Emit an event to log the unwrapping action
        emit Unwrapped(value, msg.sender);
    }

    // Overrides the decimals function to set the token's decimals to 0
    // This makes WCC tokens non-divisible
    function decimals() public pure override returns (uint8) {
        return 0;
    }
}
