/**
 * Registro de Agente en el Contrato Global Oficial de ERC-8004 (8004scan)
 * Red: Ethereum Sepolia (ChainID: 11155111)
 * Contrato Canónico IdentityRegistry: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { encodeAgentCardToDataUri } = require("../src/utils/agentCardUri");

// Terminal styling utilities
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m"
};

function banner(title) {
  const line = "━".repeat(78);
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ${title}${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);
}

function success(msg) {
  console.log(`  ${c.green}✔${c.reset} ${msg}`);
}

function info(label, val) {
  console.log(`  ${c.yellow}▸${c.reset} ${c.bold}${label}:${c.reset} ${val}`);
}

async function main() {
  banner("REGISTRO GLOBAL DE AGENTE EN ERC-8004 CANÓNICO (8004SCAN)");

  const CANONICAL_IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const CANONICAL_REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";

  // 1. Configurar conexión con Sepolia
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const rawKey = process.env.PRIVATE_KEY;
  if (!rawKey) {
    console.error("❌ ERROR: No se encontró PRIVATE_KEY en el archivo .env");
    process.exit(1);
  }
  const pk = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
  const wallet = new ethers.Wallet(pk, provider);

  const net = await provider.getNetwork();
  const balanceWei = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balanceWei);

  console.log(`${c.bold}Información de la Cuenta:${c.reset}`);
  info("Red Blockchain", `Ethereum ${net.name.toUpperCase()} (ChainID: ${net.chainId})`);
  info("RPC Endpoint", rpcUrl);
  info("Billetera del Agente (.env)", wallet.address);
  info("Saldo en Sepolia", `${balanceEth} Sepolia ETH`);
  info("Identity Registry Canónico", CANONICAL_IDENTITY_REGISTRY);

  if (balanceWei === 0n) {
    console.error("\n❌ ERROR: Tu saldo es 0 ETH. Necesitas fondos en Sepolia para registrar el agente.");
    process.exit(1);
  }

  // 2. Protección anti-doble gasto: verificar si ya existe registro previo
  const globalAgentPath = path.join(__dirname, "..", "src", "global-agent.json");
  const forceNew = process.argv.includes("--new") || process.argv.includes("-f");

  if (fs.existsSync(globalAgentPath) && !forceNew) {
    try {
      const existing = JSON.parse(fs.readFileSync(globalAgentPath, "utf-8"));
      if (existing.globalAgentId && existing.owner && existing.owner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log(`\n${c.yellow}⚠️  AVISO DE PROTECCIÓN DE SALDO:${c.reset}`);
        console.log(`  Ya tienes registrado el ${c.bold}Agent #${existing.globalAgentId}${c.reset} con esta billetera.`);
        console.log(`  • Para actualizar sus metadatos sin gastar gas en un nuevo NFT, ejecuta: ${c.bold}${c.cyan}bun update_card${c.reset}`);
        console.log(`  • Para consultar su estado en vivo en 8004scan, ejecuta: ${c.bold}${c.cyan}bun status_global${c.reset}`);
        console.log(`  • Si deseas registrar un agente adicional de todas formas, ejecuta: ${c.bold}bun registry_global --new${c.reset}\n`);
        return;
      }
    } catch (e) {}
  }

  // 3. Cargar Agent Card y generar Data URI Base64 estándar
  const agentCardPath = path.join(__dirname, "..", "src", "agentCard.json");
  const agentCard = JSON.parse(fs.readFileSync(agentCardPath, "utf-8"));

  const agentCardUri = encodeAgentCardToDataUri(agentCard, {
    chainId: Number(net.chainId),
    registryAddress: CANONICAL_IDENTITY_REGISTRY,
    walletAddress: wallet.address
  });

  console.log(`\n${c.bold}Datos del Agente a Registrar:${c.reset}`);
  info("Nombre del Agente", agentCard.name);
  info("Descripción", agentCard.description);
  info("Formato de Metadatos", "On-Chain Base64 Data URI (Resuelve sin dependencias de IPFS)");

  // 4. ABI e Interacción con el Contrato Canónico
  const canonicalAbi = [
    "function register(string agentURI) external returns (uint256)",
    "function getVersion() external view returns (string)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string)",
    "function totalAgents() external view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ];

  const contract = new ethers.Contract(CANONICAL_IDENTITY_REGISTRY, canonicalAbi, wallet);

  let version = "2.0.0";
  try {
    version = await contract.getVersion();
  } catch (e) {}
  info("Versión del Protocolo ERC-8004", version);

  console.log(`\n${c.bold}Enviando transacción de registro a Ethereum Sepolia...${c.reset}`);
  const tx = await contract.register(agentCardUri);
  console.log(`  ${c.dim}Tx Hash:${c.reset} ${c.cyan}${tx.hash}${c.reset}`);
  console.log(`  Esperando confirmación en la blockchain de Sepolia...`);

  const receipt = await tx.wait();
  success(`Transacción confirmada en el bloque ${receipt.blockNumber}!`);

  // Extraer tokenId del evento Transfer
  let globalAgentId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      if (parsed && parsed.name === "Transfer") {
        globalAgentId = parsed.args.tokenId.toString();
        break;
      }
    } catch (e) {}
  }

  // 5. Guardar ficha en src/global-agent.json
  const resultData = {
    network: "sepolia",
    chainId: Number(net.chainId),
    globalAgentId: globalAgentId || "Desconocido",
    name: agentCard.name,
    owner: wallet.address,
    agentCardUri: "data:application/json;base64,...",
    registerTxHash: tx.hash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date().toISOString(),
    contracts: {
      IdentityRegistry: CANONICAL_IDENTITY_REGISTRY,
      ReputationRegistry: CANONICAL_REPUTATION_REGISTRY
    },
    explorerUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
    scanUrl: `https://8004scan.com/agent/${globalAgentId}`
  };

  fs.writeFileSync(globalAgentPath, JSON.stringify(resultData, null, 2));

  console.log(`\n${c.bold}╔══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}║              ¡AGENTE REGISTRADO EXITOSAMENTE EN 8004SCAN!                    ║${c.reset}`);
  console.log(`${c.bold}╠══════════════════════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`  ${c.bold}Agent ID Global:${c.reset}        ${c.green}#${globalAgentId || "Registrado"}${c.reset}`);
  console.log(`  ${c.bold}Nombre:${c.reset}                 ${agentCard.name}`);
  console.log(`  ${c.bold}Dueño (Owner):${c.reset}          ${wallet.address}`);
  console.log(`  ${c.bold}Contrato Global:${c.reset}        ${CANONICAL_IDENTITY_REGISTRY}`);
  console.log(`  ${c.bold}Transacción Sepolia:${c.reset}    https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log(`  ${c.bold}Ver en 8004scan:${c.reset}        ${c.cyan}https://8004scan.com/agent/${globalAgentId || ""}${c.reset}`);
  console.log(`${c.bold}╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}\n`);

  success(`Ficha del agente global guardada en src/global-agent.json`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n${c.red}❌ Error en el registro global:${c.reset}`, err);
    process.exit(1);
  });
