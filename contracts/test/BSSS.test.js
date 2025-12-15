const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BSSS MVP Contract", function () {
  let BSSSMVP;
  let bsss;
  let owner;
  let user1;
  let user2;
  
  // Mock地址
  const mockPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const mockUSDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    BSSSMVP = await ethers.getContractFactory("BSSSMVP");
    bsss = await BSSSMVP.deploy(mockPriceFeed, mockUSDC);
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await bsss.owner()).to.equal(owner.address);
    });
    
    it("Should set correct defense ratio", async function () {
      expect(await bsss.DEFENSE_RATIO()).to.equal(8000);
    });
  });
  
  describe("Deposit", function () {
    it("Should allow users to deposit USDC", async function () {
      // 在测试中，我们使用Mock USDC
      // 这里简化为直接调用deposit函数
      const depositAmount = ethers.parseUnits("100", 6);
      
      // 注意：需要实际测试时实现Mock USDC
      console.log("Deposit test requires Mock USDC implementation");
    });
    
    it("Should revert if defense line is already triggered", async function () {
      // 设置防御线已触发状态
      await bsss.emergencyStop(true);
      
      await expect(
        bsss.connect(user1).depositUSDC(100)
      ).to.be.revertedWith("Defense line already triggered");
    });
  });
  
  describe("Price Functions", function () {
    it("Should return defense line price", async function () {
      const defensePrice = await bsss.getDefenseLinePrice();
      expect(defensePrice).to.be.gt(0);
    });
  });
});