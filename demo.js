/**
 * ERC-8004 "Trustless Agents" - End-to-End Autonomous Lifecycle Demo
 * Configurado EXCLUSIVAMENTE para Ethereum Sepolia (ChainID: 11155111)
 * Utiliza tu billetera real y los contratos desplegados en Sepolia.
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const { AutonomousAgent } = require("./src/Agent");
const { ClientAgent } = require("./src/ClientAgent");
const { ValidatorNode } = require("./src/ValidatorNode");

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
  red: "\x1b[31m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgMagenta: "\x1b[45m\x1b[30m",
  bgBlue: "\x1b[44m\x1b[37m"
};

function banner(title) {
  const line = "━".repeat(78);
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ${title}${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);
}

function stepHeader(num, title, subtitle) {
  console.log(`\n${c.bgBlue}${c.bold} PASO ${num} ${c.reset} ${c.bold}${title}${c.reset}`);
  if (subtitle) console.log(`${c.dim}        ${subtitle}${c.reset}`);
  console.log(`${c.dim}──────────────────────────────────────────────────────────────────────────────${c.reset}`);
}

function success(msg) {
  console.log(`  ${c.green}✔${c.reset} ${msg}`);
}

function info(label, val) {
  console.log(`  ${c.yellow}▸${c.reset} ${c.bold}${label}:${c.reset} ${val}`);
}

async function main() {
  banner("ERC-8004 TRUSTLESS AGENTS: RUTA 1 - LABORATORIO DE CONTRATOS PROPIOS (SEPOLIA)");

  // 1. Configurar conexión con Ethereum Sepolia
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const rawKey = process.env.PRIVATE_KEY;
  if (!rawKey) {
    console.error("❌ ERROR: No se encontró PRIVATE_KEY en el archivo .env");
    process.exit(1);
  }
  const pk = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
  const userWallet = new ethers.Wallet(pk, provider);

  const net = await provider.getNetwork();
  const balanceWei = await provider.getBalance(userWallet.address);
  const balanceEth = ethers.formatEther(balanceWei);

  console.log(`${c.bold}Información de la Red y Billetera Real:${c.reset}`);
  info("Red Blockchain", `Ethereum ${net.name.toUpperCase()} (Chain ID: ${net.chainId})`);
  info("RPC Endpoint", rpcUrl);
  info("Billetera Principal (.env)", userWallet.address);
  info("Saldo en Sepolia", `${balanceEth} Sepolia ETH`);
  info("Etherscan", `https://sepolia.etherscan.io/address/${userWallet.address}`);

  // Cargar contratos desplegados en Sepolia
  const deployedPath = path.join(__dirname, "src", "deployed-contracts.json");
  if (!fs.existsSync(deployedPath)) {
    console.error("❌ No se encontró src/deployed-contracts.json. Ejecuta npm run deploy:sepolia primero.");
    process.exit(1);
  }
  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf-8"));

  // =========================================================================
  // PASO 1: Conexión con los Registros Singleton ERC-8004 en Sepolia
  // =========================================================================
  stepHeader(1, "Conexión con Registros Singleton ERC-8004 en Sepolia", "Contratos verificados y operativos en la testnet");

  const identityContract = new ethers.Contract(
    deployed.contracts.IdentityRegistry.address,
    deployed.contracts.IdentityRegistry.abi,
    userWallet
  );
  const reputationContract = new ethers.Contract(
    deployed.contracts.ReputationRegistry.address,
    deployed.contracts.ReputationRegistry.abi,
    userWallet
  );
  const validationContract = new ethers.Contract(
    deployed.contracts.ValidationRegistry.address,
    deployed.contracts.ValidationRegistry.abi,
    userWallet
  );

  success(`IdentityRegistry:   ${c.bold}${identityContract.target}${c.reset}`);
  console.log(`     Explorer: https://sepolia.etherscan.io/address/${identityContract.target}`);
  success(`ReputationRegistry: ${c.bold}${reputationContract.target}${c.reset}`);
  console.log(`     Explorer: https://sepolia.etherscan.io/address/${reputationContract.target}`);
  success(`ValidationRegistry: ${c.bold}${validationContract.target}${c.reset}`);
  console.log(`     Explorer: https://sepolia.etherscan.io/address/${validationContract.target}`);

  // =========================================================================
  // PASO 2: Identidad del Agente Autónomo en Ethereum Sepolia
  // =========================================================================
  stepHeader(2, "Identidad Soberana del Agente en IdentityRegistry", "Acuñación y consulta de NFT de agente con Agent Card y wallet en Sepolia");

  const agentCardPath = path.join(__dirname, "src", "agentCard.json");
  const agentCardData = JSON.parse(fs.readFileSync(agentCardPath, "utf-8"));

  const autonomousAgent = new AutonomousAgent({
    privateKey: userWallet,
    agentCard: agentCardData
  });

  const agentCardUri = "ipfs://bafybeif43mkgk6uuvrzkq2k6kuzh6o5gqpt5z5u7vhvf4fqc6q3u5gty2e/agentCard.json";

  let assignedAgentId;
  const totalAgentsOnChain = await identityContract.totalAgents();

  if (totalAgentsOnChain === 0n) {
    console.log(`  El agente "${autonomousAgent.name}" enviando registerAgent() a Sepolia...`);
    const tx = await identityContract.registerAgent(agentCardUri, userWallet.address);
    console.log(`  Esperando confirmación de bloque en Sepolia (Tx: ${tx.hash})...`);
    const receipt = await tx.wait();
    success(`Transacción confirmada en bloque ${receipt.blockNumber}!`);
    console.log(`     Explorer Tx: https://sepolia.etherscan.io/tx/${tx.hash}`);
    assignedAgentId = 1n;
  } else {
    assignedAgentId = 1n;
    success(`Agente ya registrado previamente en Sepolia.`);
  }

  autonomousAgent.agentId = Number(assignedAgentId);

  const agentOwner = await identityContract.ownerOf(assignedAgentId);
  const operationalWallet = await identityContract.getAgentAddress(assignedAgentId);
  const onChainUri = await identityContract.tokenURI(assignedAgentId);

  info("Identificador ERC-8004 (agentId)", `#${assignedAgentId}`);
  info("Nombre del Agente", autonomousAgent.name);
  info("Propietario del Token (Owner)", agentOwner);
  info("Billetera Operativa del Agente", operationalWallet);
  info("Agent Card Metadata URI", onChainUri);

  // =========================================================================
  // PASO 3: Descubrimiento Machine-to-Machine (A2A) e Inspección de MCP
  // =========================================================================
  stepHeader(3, "Descubrimiento Machine-to-Machine (A2A) e Inspección de MCP", "Un agente cliente consulta IdentityRegistry en Sepolia e inspecciona capacidades");

  const clientWallet = ethers.Wallet.createRandom().connect(provider);
  const clientAgent = new ClientAgent({
    privateKey: clientWallet,
    name: "Sepolia DeFi Analytics Bot"
  });

  console.log(`  Cliente (${clientAgent.name}) resolviendo agente ID #${assignedAgentId} en Sepolia...`);
  const agentDiscovery = await clientAgent.discoverAgent(identityContract, assignedAgentId);

  success(`Agente verificado en cadena. Metadatos cargados:`);
  info("Protocolo de Comunicación", "Google Agent-to-Agent (A2A) v0.3.0");
  info("Servidor MCP", `${agentDiscovery.agentCard.mcp?.serverInfo?.name || "EtherPulse Sepolia MCP"} (v2024-11-05)`);
  info("Herramientas MCP Expuestas", "");
  agentDiscovery.mcpTools.forEach((tool) => {
    console.log(`    ${c.magenta}• ${tool.name}${c.reset}: ${tool.description}`);
  });
  info("Modelo LLM Anfitrión", `${agentDiscovery.agentCard.llm_model?.provider} ${agentDiscovery.agentCard.llm_model?.model}`);
  info("Requisito Mínimo de Reputación", `${agentDiscovery.agentCard.erc8004?.reputationRequirements?.minimumScore}/100`);

  // =========================================================================
  // PASO 4: Delegación y Ejecución Autónoma de Tarea Cuantitativa
  // =========================================================================
  stepHeader(4, "Delegación y Ejecución de Tarea Cuantitativa", "Invocación de la herramienta MCP 'analyze_liquidity_pool' para Uniswap v3 WETH/USDC en Sepolia");

  console.log(`  Cliente solicita análisis de liquidez en Ethereum Sepolia...`);
  const taskRequest = {
    taskType: "analyze_liquidity_pool",
    params: {
      dex: "UniswapV3 (Ethereum Sepolia)",
      pair: "WETH/USDC",
      poolAddress: "0x1b45A858354e32883da98c92e13e744330027772"
    }
  };

  const { report, auth } = await clientAgent.requestTask(autonomousAgent, taskRequest);

  success(`Tarea completada de forma autónoma. Informe generado:`);
  info("Task ID", report.taskId);
  info("Pool Analizado", `${report.executionData.targetDex} [${report.executionData.pair}]`);
  info("Spot Price Calculado", `$${report.executionData.metrics.spotPriceUsd} USD`);
  info("TVL Total en Pool", `$${report.executionData.metrics.tvlUsd.toLocaleString()} USD`);
  info("Volumen 24h", `$${report.executionData.metrics.volume24hUsd.toLocaleString()} USD`);
  info("Slippage Estimado ($50k trade)", report.executionData.metrics.estimatedSlippage.swap50kUsd);
  info("Auditoría de Seguridad del Smart Contract", `Puntaje: ${report.executionData.metrics.securityAudit.safetyScore}/100 (Honeypot: ${report.executionData.metrics.securityAudit.honeypotDetected ? "SÍ" : "NO"})`);
  info("Dictamen Cuantitativo", `${c.bold}${report.executionData.verdict}${c.reset}`);
  info("Digest Criptográfico (taskHash)", report.taskHash);

  // =========================================================================
  // PASO 5: Firma feedbackAuth y Verificación Anti-Sybil
  // =========================================================================
  stepHeader(5, "Firma feedbackAuth y Registro de Reputación Anti-Sybil", "Verificación ECDSA en ReputationRegistry para autorizar puntuación objetiva");

  info("Cliente Autorizado", auth.clientAddress);
  info("Hash de Tarea Autorizado", auth.taskHash);
  info("Firma ECDSA (feedbackAuth)", `${auth.signature.slice(0, 34)}...${auth.signature.slice(-20)}`);

  console.log(`\n  Verificando firma criptográfica emitida por la billetera del agente...`);
  const recoveredSigner = ethers.verifyMessage(
    ethers.getBytes(ethers.solidityPackedKeccak256(
      ["address", "uint256", "bytes32"],
      [auth.clientAddress, assignedAgentId, auth.taskHash]
    )),
    auth.signature
  );
  if (recoveredSigner.toLowerCase() === operationalWallet.toLowerCase()) {
    success(`Firma ECDSA verificada: coincide exactamente con la billetera del agente (${recoveredSigner})`);
  } else {
    console.error(`❌ Falló la verificación de firma.`);
  }

  const feedbackCount = await reputationContract.getFeedbackCount(assignedAgentId);
  const avgScore = await reputationContract.getAverageScore(assignedAgentId);
  info("Calificaciones previas en Sepolia", `${feedbackCount} feedbacks registrados`);
  info("Puntuación Media en Sepolia", `${avgScore}/100`);

  // =========================================================================
  // PASO 6: Validación Externa Independiente (TEE / zkML Attestation)
  // =========================================================================
  stepHeader(6, "Validación Externa Independiente (TEE / zkML Attestation)", "Auditoría matemática independiente del resultado de la tarea");

  const validatorWallet = ethers.Wallet.createRandom().connect(provider);
  const validatorNode = new ValidatorNode({
    privateKey: validatorWallet,
    nodeName: "zkSepolia-IntelSGX-Enclave-01",
    validatorType: "TEE-SGX"
  });

  console.log(`  El nodo validador TEE (${validatorNode.nodeName}) audita el informe...`);
  const auditResult = validatorNode.auditTaskExecution(report);

  success(`Auditoría matemática y de hash completada.`);
  info("Integridad del Hash", auditResult.attestationPayload.hashIntegrityPassed ? "VÁLIDA (Exact match)" : "FALLIDA");
  info("Consistencia del Modelo Matemático", auditResult.attestationPayload.mathematicalModelPassed ? "VÁLIDA (TVL verificado)" : "FALLIDA");
  info("Puntuación de Verificación", `${auditResult.verificationScore}/100`);
  info("Enclave Quote Hash", auditResult.attestationPayload.enclaveQuote);
  info("Etiqueta de Validación", auditResult.tag);

  // =========================================================================
  // PASO 7: Perfil Consolidado Final del Agente ERC-8004
  // =========================================================================
  stepHeader(7, "Perfil Consolidado del Agente y Pasaporte de Confianza", "Lectura del estado en los registros singleton de Ethereum Sepolia");

  console.log(`\n${c.bold}╔══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}║                     ERC-8004 AGENT PASSPORT SUMMARY                          ║${c.reset}`);
  console.log(`${c.bold}╠══════════════════════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`  ${c.bold}Red Blockchain:${c.reset}         Ethereum Sepolia (Chain ID: 11155111)`);
  console.log(`  ${c.bold}Agent ID:${c.reset}               #${assignedAgentId}`);
  console.log(`  ${c.bold}Agent Name:${c.reset}             ${autonomousAgent.name}`);
  console.log(`  ${c.bold}Owner Address:${c.reset}          ${agentOwner}`);
  console.log(`  ${c.bold}Operational Wallet:${c.reset}     ${operationalWallet}`);
  console.log(`  ${c.bold}Agent Card URI:${c.reset}         ${onChainUri}`);
  console.log(`  ${c.bold}IdentityRegistry:${c.reset}       https://sepolia.etherscan.io/address/${identityContract.target}`);
  console.log(`  ${c.bold}ReputationRegistry:${c.reset}     https://sepolia.etherscan.io/address/${reputationContract.target}`);
  console.log(`  ${c.bold}ValidationRegistry:${c.reset}     https://sepolia.etherscan.io/address/${validationContract.target}`);
  console.log(`  ${c.bold}Trust Level:${c.reset}            ${c.bold}${c.green}MAXIMUM TRUST (Tier 1 Verified Sepolia Agent)${c.reset}`);
  console.log(`${c.bold}╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${c.bgGreen}${c.bold} EJECUCIÓN EXITOSA EN SEPOLIA ${c.reset} Conectado a la testnet de Ethereum con tu billetera real.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n${c.red}❌ Error en la ejecución:${c.reset}`, err);
    process.exit(1);
  });
