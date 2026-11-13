/**
 * Consulta de Estado en Vivo de un Agente en el Contrato Global Oficial de ERC-8004 (8004scan)
 * Operación 100% de Solo Lectura (0 gas, gratis).
 * Red: Ethereum Sepolia (ChainID: 11155111)
 * Contrato Canónico: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { decodeAgentUri } = require("../src/utils/agentCardUri");

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
  console.log(`${c.bold}${c.cyan}  ESTADO EN VIVO EN 8004SCAN (CONSULTA ON-CHAIN SEPOLIA)${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);

  const CANONICAL_IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Obtener ID del agente
  let agentId = 11287;
  const globalAgentPath = path.join(__dirname, "..", "src", "global-agent.json");
  if (fs.existsSync(globalAgentPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(globalAgentPath, "utf-8"));
      if (data.globalAgentId) agentId = Number(data.globalAgentId);
    } catch (e) {}
  }

  const cliId = process.argv.find(arg => !isNaN(Number(arg)) && Number(arg) > 0);
  if (cliId) {
    agentId = Number(cliId);
  }

  const abi = [
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string)",
    "function getVersion() external view returns (string)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)"
  ];

  const contract = new ethers.Contract(CANONICAL_IDENTITY_REGISTRY, abi, provider);

  console.log(`▸ Red:               Ethereum Sepolia (ChainID: 11155111)`);
  console.log(`▸ Contrato Canónico: ${CANONICAL_IDENTITY_REGISTRY}`);
  console.log(`▸ Consultando ID:    ${c.bold}#${agentId}${c.reset}`);

  try {
    const owner = await contract.ownerOf(agentId);
    const uri = await contract.tokenURI(agentId);
    const decoded = decodeAgentUri(uri);

    console.log(`\n${c.bold}Propiedades On-Chain:${c.reset}`);
    console.log(`  ▸ Dueño (Owner):   ${c.green}${owner}${c.reset}`);
    console.log(`  ▸ Formato URI:     ${uri.startsWith("data:application/json;base64,") ? c.green + "On-Chain Base64 Data URI" + c.reset : uri.slice(0, 50) + "..."}`);

    console.log(`\n${c.bold}Metadatos Resueltos por 8004scan:${c.reset}`);
    if (decoded) {
      console.log(`  ▸ Nombre:          ${c.bold}${decoded.name || "N/A"}${c.reset}`);
      console.log(`  ▸ Descripción:     ${decoded.description || "N/A"}`);
      console.log(`  ▸ Esquema EIP:     ${decoded.type || "N/A"}`);
      console.log(`  ▸ Estado Activo:   ${decoded.active ? c.green + "SÍ" + c.reset : "NO"}`);
      if (decoded.endpoints && decoded.endpoints.length > 0) {
        console.log(`  ▸ Wallet Endpoint: ${decoded.endpoints[0].endpoint}`);
      }
      if (decoded.services && decoded.services.length > 0) {
        console.log(`  ▸ Servicios:       ${decoded.services.map(s => s.name + " (" + s.endpoint + ")").join(", ")}`);
      }
    } else {
      console.log(`  ⚠️ URI no es Base64 o no pudo ser parseado directamente.`);
      console.log(`  Raw URI: ${uri}`);
    }

    console.log(`\n${c.bold}╔══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`  ${c.bold}Enlace Público en 8004scan:${c.reset}`);
    console.log(`  👉 ${c.cyan}https://8004scan.com/agent/${agentId}${c.reset}`);
    console.log(`  ${c.bold}Enlace en Sepolia Etherscan:${c.reset}`);
    console.log(`  👉 ${c.cyan}https://sepolia.etherscan.io/token/${CANONICAL_IDENTITY_REGISTRY}?a=${agentId}${c.reset}`);
    console.log(`${c.bold}╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}\n`);

  } catch (err) {
    console.error(`\n❌ Error al consultar el agente #${agentId}:`, err.message);
  }
}

main();
