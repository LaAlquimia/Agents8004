/**
 * Actualiza la Agent Card URI de un agente existente en el Identity Registry Canónico de 8004scan
 * Lee la información actualizada desde src/agentCard.json y la codifica en On-Chain Base64 Data URI.
 * Red: Ethereum Sepolia (ChainID: 11155111)
 * Contrato Canónico: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { encodeAgentCardToDataUri } = require("../src/utils/agentCardUri");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m"
};

async function main() {
  const line = "━".repeat(78);
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ACTUALIZADOR DE METADATOS EN 8004SCAN (ON-CHAIN DATA URI)${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);

  const CANONICAL_IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const rawKey = process.env.PRIVATE_KEY;
  if (!rawKey) {
    console.error("❌ ERROR: No se encontró PRIVATE_KEY en el archivo .env");
    process.exit(1);
  }
  const pk = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
  const wallet = new ethers.Wallet(pk, provider);

  // Leer global-agent.json para saber el ID del agente
  const globalAgentPath = path.join(__dirname, "..", "src", "global-agent.json");
  let agentId = 11287;
  let globalData = {};

  if (fs.existsSync(globalAgentPath)) {
    try {
      globalData = JSON.parse(fs.readFileSync(globalAgentPath, "utf-8"));
      if (globalData.globalAgentId) agentId = Number(globalData.globalAgentId);
    } catch (e) {}
  }

  // Permitir pasar un ID explícito por línea de comandos: bun update_card 11287
  const cliId = process.argv.find(arg => !isNaN(Number(arg)) && Number(arg) > 0);
  if (cliId) {
    agentId = Number(cliId);
  }

  const abi = [
    "function setAgentURI(uint256 tokenId, string newURI) external",
    "function tokenURI(uint256 tokenId) external view returns (string)",
    "function ownerOf(uint256 tokenId) external view returns (address)"
  ];

  const contract = new ethers.Contract(CANONICAL_IDENTITY_REGISTRY, abi, wallet);

  console.log(`▸ Agente ID:         ${c.bold}#${agentId}${c.reset}`);
  console.log(`▸ Billetera (Owner): ${wallet.address}`);
  console.log(`▸ Contrato Canónico: ${CANONICAL_IDENTITY_REGISTRY}`);

  // Verificar autoridad de propietario
  const currentOwner = await contract.ownerOf(agentId);
  if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error(`❌ Tu billetera (${wallet.address}) no es la dueña del agente #${agentId} (Dueño actual: ${currentOwner}).`);
    process.exit(1);
  }

  // Leer datos actualizados desde src/agentCard.json
  const agentCardPath = path.join(__dirname, "..", "src", "agentCard.json");
  const agentCard = JSON.parse(fs.readFileSync(agentCardPath, "utf-8"));

  const dataUri = encodeAgentCardToDataUri(agentCard, {
    chainId: 11155111,
    registryAddress: CANONICAL_IDENTITY_REGISTRY,
    walletAddress: wallet.address,
    agentId: agentId
  });

  console.log(`\n${c.bold}Datos a Sincronizar desde src/agentCard.json:${c.reset}`);
  console.log(`  ▸ Nombre:      ${agentCard.name}`);
  console.log(`  ▸ Descripción: ${agentCard.description}`);
  console.log(`  ▸ Formato:     On-Chain Base64 Data URI (${dataUri.length} bytes)`);

  console.log(`\n${c.bold}Enviando setAgentURI() a Ethereum Sepolia...${c.reset}`);
  const tx = await contract.setAgentURI(agentId, dataUri);
  console.log(`  Tx Hash: ${c.cyan}${tx.hash}${c.reset}`);
  console.log(`  Esperando confirmación en Sepolia...`);

  const receipt = await tx.wait();
  console.log(`  ${c.green}✔ Transacción confirmada en bloque ${receipt.blockNumber}!${c.reset}`);

  // Actualizar manifiesto global-agent.json
  globalData.network = "sepolia";
  globalData.chainId = 11155111;
  globalData.globalAgentId = String(agentId);
  globalData.name = agentCard.name;
  globalData.owner = wallet.address;
  globalData.updateMetadataTxHash = tx.hash;
  globalData.updateBlockNumber = receipt.blockNumber;
  globalData.lastUpdated = new Date().toISOString();
  globalData.scanUrl = `https://8004scan.com/agent/${agentId}`;

  fs.writeFileSync(globalAgentPath, JSON.stringify(globalData, null, 2));

  console.log(`\n  ${c.bold}Comprueba en vivo en 8004scan:${c.reset}`);
  console.log(`  👉 ${c.cyan}https://8004scan.com/agent/${agentId}${c.reset}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error al actualizar metadatos:", err.message);
    process.exit(1);
  });
