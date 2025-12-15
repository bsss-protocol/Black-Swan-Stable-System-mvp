const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting BSSS deployment...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Sepolia测试网地址
  const SEPOLIA_ADDRESSES = {
    CHAINLINK_ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  };
  
  // 部署BSSS合约
  console.log("\n1. Deploying BSSS MVP contract...");
  const BSSSMVP = await hre.ethers.getContractFactory("BSSSMVP");
  const bsss = await BSSSMVP.deploy(
    SEPOLIA_ADDRESSES.CHAINLINK_ETH_USD,
    SEPOLIA_ADDRESSES.USDC
  );
  
  await bsss.waitForDeployment();
  const bsssAddress = await bsss.getAddress();
  console.log("✅ BSSS MVP deployed to:", bsssAddress);
  
  // 保存部署信息
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      BSSSMVP: bsssAddress,
      ChainlinkOracle: SEPOLIA_ADDRESSES.CHAINLINK_ETH_USD,
      USDC: SEPOLIA_ADDRESSES.USDC
    },
    deployer: deployer.address
  };
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📁 Deployment info saved to:", deploymentFile);
  
  // 验证合约（需要Etherscan API密钥）
  if (hre.network.name === "sepolia") {
    console.log("\n2. Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: bsssAddress,
        constructorArguments: [
          SEPOLIA_ADDRESSES.CHAINLINK_ETH_USD,
          SEPOLIA_ADDRESSES.USDC
        ],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 Deployment complete!");
  console.log("==================================");
  console.log("📋 Contract Addresses:");
  console.log("   BSSS MVP:", bsssAddress);
  console.log("   Chainlink:", SEPOLIA_ADDRESSES.CHAINLINK_ETH_USD);
  console.log("   USDC:", SEPOLIA_ADDRESSES.USDC);
  console.log("==================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});