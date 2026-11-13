require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const rawKey = process.env.PRIVATE_KEY;
  if (!rawKey) {
    console.error("❌ No se encontró PRIVATE_KEY en el archivo .env");
    process.exit(1);
  }

  const pk = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
  const wallet = new ethers.Wallet(pk, provider);

  console.log("==========================================");
  console.log("  Verificación de Billetera en Sepolia");
  console.log("==========================================");
  console.log(`▸ Dirección: ${wallet.address}`);
  console.log(`▸ RPC URL:   ${rpcUrl}`);

  try {
    const net = await provider.getNetwork();
    console.log(`▸ Red:       ${net.name} (ChainID: ${net.chainId})`);

    const balance = await provider.getBalance(wallet.address);
    const eth = ethers.formatEther(balance);
    console.log(`▸ Saldo:     ${eth} Sepolia ETH`);
    console.log(`▸ Explorer:  https://sepolia.etherscan.io/address/${wallet.address}`);

    if (balance === 0n) {
      console.log("\n⚠️  Atención: Tu saldo es 0 ETH. Puedes obtener Sepolia ETH en:");
      console.log("   - https://sepoliafaucet.com");
      console.log("   - https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
    } else {
      console.log("\n✔ Saldo suficiente para desplegar e interactuar con ERC-8004.");
    }
  } catch (err) {
    console.error("Error al conectar con la red:", err.message);
  }
}

main();
