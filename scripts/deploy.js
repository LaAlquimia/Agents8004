const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);

  console.log("==================================================");
  console.log("Deploying ERC-8004 Trustless Agents on Sepolia");
  console.log("==================================================");
  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer Address: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.error("❌ ERROR: El saldo de la cuenta es 0 ETH. Necesitas fondos en Sepolia para desplegar.");
    process.exit(1);
  }

  // 1. Deploy IdentityRegistry
  console.log("1. Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log(`   ✔ IdentityRegistry desplegado en: ${identityAddress}`);
  if (chainId === 11155111) {
    console.log(`     Explorer: https://sepolia.etherscan.io/address/${identityAddress}`);
  }

  // 2. Deploy ReputationRegistry
  console.log("\n2. Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(identityAddress);
  await reputationRegistry.waitForDeployment();
  const reputationAddress = await reputationRegistry.getAddress();
  console.log(`   ✔ ReputationRegistry desplegado en: ${reputationAddress}`);
  if (chainId === 11155111) {
    console.log(`     Explorer: https://sepolia.etherscan.io/address/${reputationAddress}`);
  }

  // 3. Deploy ValidationRegistry
  console.log("\n3. Deploying ValidationRegistry...");
  const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
  const validationRegistry = await ValidationRegistry.deploy(identityAddress);
  await validationRegistry.waitForDeployment();
  const validationAddress = await validationRegistry.getAddress();
  console.log(`   ✔ ValidationRegistry desplegado en: ${validationAddress}`);
  if (chainId === 11155111) {
    console.log(`     Explorer: https://sepolia.etherscan.io/address/${validationAddress}`);
  }

  // Extract ABIs
  const identityArtifact = require("../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json");
  const reputationArtifact = require("../artifacts/contracts/ReputationRegistry.sol/ReputationRegistry.json");
  const validationArtifact = require("../artifacts/contracts/ValidationRegistry.sol/ValidationRegistry.json");

  const deploymentData = {
    network: {
      name: network.name,
      chainId: chainId,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      IdentityRegistry: {
        address: identityAddress,
        abi: identityArtifact.abi,
      },
      ReputationRegistry: {
        address: reputationAddress,
        abi: reputationArtifact.abi,
      },
      ValidationRegistry: {
        address: validationAddress,
        abi: validationArtifact.abi,
      },
    },
  };

  const srcDir = path.join(__dirname, "..", "src");
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  const outputPath = path.join(srcDir, "deployed-contracts.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));

  console.log("\n==================================================");
  console.log(`Manifiesto de despliegue guardado en:\n${outputPath}`);
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
