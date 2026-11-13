const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { decodeAgentUri } = require("./utils/agentCardUri");

/**
 * ClientAgent
 * Represents a consumer agent or human client in Ethereum Sepolia / EVM.
 * Discovers agents via IdentityRegistry, delegates tasks, and records
 * cryptographically verified feedback in the ReputationRegistry.
 */
class ClientAgent {
  /**
   * @param {Object} options
   * @param {string|ethers.Wallet} [options.privateKey] - Private key or Wallet instance
   * @param {ethers.Provider} [options.provider] - Ethers provider
   * @param {string} [options.name] - Name of the client agent
   */
  constructor(options = {}) {
    const { privateKey, provider, name = "Sepolia Client Consumer" } = options;

    this.provider = provider || (privateKey && privateKey.provider ? privateKey.provider : null);

    if (privateKey && typeof privateKey.sendTransaction === "function") {
      this.wallet = privateKey;
    } else if (typeof privateKey === "string" && privateKey.startsWith("0x")) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    } else {
      this.wallet = ethers.Wallet.createRandom(this.provider);
    }

    this.address = this.wallet.address;
    this.name = name;
  }

  /**
   * Connects this client to a provider
   * @param {ethers.Provider} provider 
   */
  connect(provider) {
    this.provider = provider;
    this.wallet = this.wallet.connect(provider);
    return this;
  }

  /**
   * Discovers an agent by querying the ERC-8004 IdentityRegistry.
   * Reads on-chain identity, operational address, and tokenURI (Agent Card).
   * Decodes on-chain Base64 Data URI if available.
   * 
   * @param {ethers.Contract} identityContract - IdentityRegistry contract instance
   * @param {number|string} agentId - The agent ID to inspect
   * @returns {Promise<Object>} - Consolidated agent profile and capabilities
   */
  async discoverAgent(identityContract, agentId) {
    const id = BigInt(agentId);
    const owner = await identityContract.ownerOf(id);

    let operationalAddress;
    if (typeof identityContract.getAgentAddress === "function") {
      operationalAddress = await identityContract.getAgentAddress(id);
    } else if (typeof identityContract.getAgentWallet === "function") {
      operationalAddress = await identityContract.getAgentWallet(id);
    } else {
      operationalAddress = owner;
    }

    const tokenUri = await identityContract.tokenURI(id);

    // 1. Intentar decodificar directamente si es un Data URI On-Chain
    let agentCard = decodeAgentUri(tokenUri);

    // 2. Si no es Data URI o no se pudo decodificar, recurrir a archivo local
    if (!agentCard) {
      const localCardPath = path.join(__dirname, "agentCard.json");
      if (fs.existsSync(localCardPath)) {
        try {
          agentCard = JSON.parse(fs.readFileSync(localCardPath, "utf-8"));
        } catch (e) {
          // Ignorar error de parseo local
        }
      }
    }

    // 3. Respaldo mínimo si no hay metadata
    if (!agentCard) {
      agentCard = {
        name: "Autonomous Agent #" + id.toString(),
        tokenUri,
        operationalAddress
      };
    }

    return {
      agentId: Number(id),
      owner,
      operationalAddress,
      tokenUri,
      agentCard,
      mcpTools: agentCard.mcp?.tools || [],
      capabilities: agentCard.capabilities || [],
      pricing: agentCard.erc8004?.paymentRequirements || null
    };
  }

  /**
   * Dispatches a task to an autonomous agent and receives execution result + feedbackAuth.
   * 
   * @param {AutonomousAgent} agentInstance - Instance of AutonomousAgent
   * @param {Object} taskDetails - Parameters for the task
   * @returns {Promise<Object>} - Contains task report and cryptographic feedbackAuth
   */
  async requestTask(agentInstance, taskDetails) {
    // 1. Agent executes task autonomously
    const report = await agentInstance.executeTask(taskDetails);

    // 2. Agent issues cryptographic feedback authorization for this client & task
    const auth = await agentInstance.generateFeedbackAuth(
      this.address,
      agentInstance.agentId,
      report.taskHash
    );

    return {
      report,
      auth
    };
  }

  /**
   * Submits feedback to the ReputationRegistry for an agent.
   * Requires valid feedbackAuth from the agent's operational key.
   * 
   * @param {ethers.Contract} reputationContract - ReputationRegistry contract instance
   * @param {Object} feedbackParams - Feedback details
   * @param {number|string} feedbackParams.agentId - Agent ID
   * @param {number} feedbackParams.score - Score (0 to 100)
   * @param {string} [feedbackParams.tag1="defi"] - Category tag 1
   * @param {string} [feedbackParams.tag2="fast"] - Category tag 2
   * @param {string} [feedbackParams.feedbackUri] - Offchain feedback URI
   * @param {string} feedbackParams.fileHash - Hash of the task deliverable
   * @param {string} feedbackParams.feedbackAuth - Cryptographic signature from the agent
   * @returns {Promise<Object>} - Transaction receipt and confirmed score
   */
  async giveFeedback(reputationContract, feedbackParams) {
    const {
      agentId,
      score,
      tag1 = "defi",
      tag2 = "fast",
      feedbackUri = "",
      fileHash,
      feedbackAuth
    } = feedbackParams;

    const contractWithSigner = reputationContract.connect(this.wallet);

    // Encode tags to bytes32
    const bTag1 = ethers.encodeBytes32String(tag1.slice(0, 31));
    const bTag2 = ethers.encodeBytes32String(tag2.slice(0, 31));

    const authSig = (feedbackAuth && typeof feedbackAuth === "object" && feedbackAuth.signature)
      ? feedbackAuth.signature
      : feedbackAuth;

    const tx = await contractWithSigner.giveFeedback(
      agentId,
      score,
      bTag1,
      bTag2,
      feedbackUri,
      fileHash,
      authSig
    );

    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      receipt,
      agentId,
      score,
      tag1,
      tag2
    };
  }
}

module.exports = { ClientAgent };
ClientAgent.default = ClientAgent;
