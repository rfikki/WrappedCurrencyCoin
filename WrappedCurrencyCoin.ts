// Author: @rfikki

import { expect } from "chai";
import { ethers } from "hardhat";
import { WrappedCurrencyCoin, CurrencyCoin } from "../typechain-types";

describe("WrappedCurrencyCoin", function () {
  let wrappedCurrencyCoin: WrappedCurrencyCoin; // Instance of the WrappedCurrencyCoin contract
  let mockCurrencyCoin: CurrencyCoin; // Mock instance of the CurrencyCoin contract
  let owner: any; // Owner of the contract (deployer)
  let addr1: any; // Another user for testing

  // Deploy contracts before running the tests
  before(async () => {
    [owner, addr1] = await ethers.getSigners(); // Get the list of signers (accounts)

    // Deploy a mock CurrencyCoin contract to simulate CurrencyCoin behavior
    const mockCurrencyCoinFactory = await ethers.getContractFactory("MockCurrencyCoin");
    mockCurrencyCoin = (await mockCurrencyCoinFactory.deploy()) as CurrencyCoin;
    await mockCurrencyCoin.waitForDeployment(); // Wait for the deployment to complete

    // Deploy the WrappedCurrencyCoin contract with the mock CurrencyCoin address
    const wrappedCurrencyCoinFactory = await ethers.getContractFactory("WrappedCurrencyCoin");
    wrappedCurrencyCoin = (await wrappedCurrencyCoinFactory.deploy(mockCurrencyCoin.target)) as WrappedCurrencyCoin;
    await wrappedCurrencyCoin.waitForDeployment(); // Wait for the deployment to complete
  });

  // Test the deployment of the WrappedCurrencyCoin contract
  describe("Deployment", function () {
    it("Should set the correct CurrencyCoin address", async function () {
      // Verify that the CurrencyCoin address is correctly set in the WrappedCurrencyCoin contract
      expect(await wrappedCurrencyCoin.ccAddr()).to.equal(mockCurrencyCoin.target);
    });
  });

  // Test the DropBox functionality
  describe("DropBox Functionality", function () {
    it("Should allow a user to create a DropBox", async function () {
      // Call the createDropBox function from addr1
      await wrappedCurrencyCoin.connect(addr1).createDropBox();

      // Verify that a DropBox address is created for addr1
      const dropBoxAddress = await wrappedCurrencyCoin.dropBoxes(addr1.address);
      expect(dropBoxAddress).to.not.equal(ethers.constants.AddressZero); // Ensure the address is not zero
    });

    it("Should not allow a user to create multiple DropBoxes", async function () {
      // Attempt to create another DropBox for addr1 and expect it to fail
      await expect(wrappedCurrencyCoin.connect(addr1).createDropBox()).to.be.revertedWith("Drop box already exists");
    });
  });

  // Test the wrapping and unwrapping functionality
  describe("Wrapping and Unwrapping", function () {
    before(async () => {
      // Simulate funding the DropBox with CurrencyCoin
      const dropBoxAddress = await wrappedCurrencyCoin.dropBoxes(addr1.address);
      await mockCurrencyCoin.mint(dropBoxAddress, 100); // Mint 100 CurrencyCoins to the DropBox
    });

    it("Should wrap CurrencyCoin into WCC tokens", async function () {
      // Call the wrap function to wrap 50 CurrencyCoins into WCC tokens
      await wrappedCurrencyCoin.connect(addr1).wrap(50);

      // Verify that addr1 now has 50 WCC tokens
      expect(await wrappedCurrencyCoin.balanceOf(addr1.address)).to.equal(50);
    });

    it("Should not allow wrapping more than available in DropBox", async function () {
      // Attempt to wrap 100 CurrencyCoins (more than available) and expect it to fail
      await expect(wrappedCurrencyCoin.connect(addr1).wrap(100)).to.be.revertedWith("Not enough coins in drop box");
    });

    it("Should unwrap WCC tokens back into CurrencyCoin", async function () {
      // Call the unwrap function to unwrap 20 WCC tokens back into CurrencyCoin
      await wrappedCurrencyCoin.connect(addr1).unwrap(20);

      // Verify that addr1 now has 30 WCC tokens remaining
      expect(await wrappedCurrencyCoin.balanceOf(addr1.address)).to.equal(30);

      // Verify that addr1 received 20 CurrencyCoins
      expect(await mockCurrencyCoin.balanceOf(addr1.address)).to.equal(20);
    });

    it("Should not allow unwrapping more WCC tokens than owned", async function () {
      // Attempt to unwrap 50 WCC tokens (more than owned) and expect it to fail
      await expect(wrappedCurrencyCoin.connect(addr1).unwrap(50)).to.be.revertedWith("Not enough coins to unwrap");
    });
  });
});
