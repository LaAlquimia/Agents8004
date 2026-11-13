/**
 * Utilidades para codificar y decodificar metadatos de Agent Card
 * según la especificación EIP-8004 (#registration-v1) y formato On-Chain Base64 Data URI.
 */

const { ethers } = require("ethers");

/**
 * Codifica un objeto Agent Card a un Data URI Base64 compatible con EIP-8004 y 8004scan.
 * 
 * @param {Object} cardJson - Contenido base de src/agentCard.json
 * @param {Object} context - Parámetros de contexto
 * @param {number|string} [context.chainId=11155111] - ID de la cadena
 * @param {string} [context.registryAddress] - Dirección del Identity Registry
 * @param {string} [context.walletAddress] - Dirección de la billetera del agente
 * @param {number|string} [context.agentId] - ID del agente si ya existe
 * @returns {string} Data URI en formato "data:application/json;base64,..."
 */
function encodeAgentCardToDataUri(cardJson, context = {}) {
  const chainId = context.chainId || cardJson.erc8004?.chainId || 11155111;
  const registryAddress = context.registryAddress || "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const walletAddress = context.walletAddress || cardJson.erc8004?.agentAddress || ethers.ZeroAddress;
  const agentId = context.agentId !== undefined && context.agentId !== null ? Number(context.agentId) : undefined;

  const registrations = [
    {
      agentRegistry: `eip155:${chainId}:${registryAddress}`,
      ...(agentId !== undefined ? { agentId } : {})
    }
  ];

  const payload = {
    type: cardJson.type || "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: cardJson.name || "EtherPulse Sepolia Analyst",
    description: cardJson.description || "Autonomous quantitative DeFi analysis agent on Ethereum Sepolia.",
    image: cardJson.image || "https://raw.githubusercontent.com/ethereum/ethereum-org-website/master/src/assets/assets/eth-diamond-purple.png",
    services: cardJson.services || [
      { name: "MCP", endpoint: "https://sepolia-agent.etherpulse.io/mcp/sse" },
      { name: "A2A", endpoint: "https://sepolia-agent.etherpulse.io/rpc/v1" }
    ],
    endpoints: cardJson.endpoints || [
      { name: "agentWallet", endpoint: `eip155:${chainId}:${walletAddress}` }
    ],
    registrations,
    supportedTrust: cardJson.supportedTrust || ["reputation", "crypto-economic"],
    active: cardJson.active !== undefined ? cardJson.active : true,
    x402Support: cardJson.x402Support !== undefined ? cardJson.x402Support : false
  };

  const jsonString = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonString, "utf-8").toString("base64");
  return `data:application/json;base64,${base64Data}`;
}

/**
 * Decodifica un URI de agente (Data URI base64, JSON string o URL).
 * 
 * @param {string} uri - URI obtenido on-chain via tokenURI()
 * @returns {Object|null} Objeto JSON decodificado o null si no se puede parsear
 */
function decodeAgentUri(uri) {
  if (!uri || typeof uri !== "string") return null;

  if (uri.startsWith("data:application/json;base64,")) {
    try {
      const base64 = uri.replace("data:application/json;base64,", "").trim();
      const jsonText = Buffer.from(base64, "base64").toString("utf-8");
      return JSON.parse(jsonText);
    } catch (e) {
      return null;
    }
  }

  if (uri.startsWith("data:application/json;utf8,") || uri.startsWith("data:application/json,")) {
    try {
      const raw = uri.split(",").slice(1).join(",");
      return JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      return null;
    }
  }

  if (uri.startsWith("{") && uri.endsWith("}")) {
    try {
      return JSON.parse(uri);
    } catch (e) {
      return null;
    }
  }

  return null;
}

module.exports = {
  encodeAgentCardToDataUri,
  decodeAgentUri
};
