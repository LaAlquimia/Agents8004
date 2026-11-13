const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC-8004 Trustless Agents Suite", function () {
  let identityRegistry;
  let reputationRegistry;
  let validationRegistry;

  let owner;
  let agentOperational;
  let client1;
  let client2;
  let validator1;
  let validator2;
  let stranger;

  const agentURI = "ipfs://QmAgentMetadataHash123/agent.json";
  const updatedURI = "ipfs://QmAgentMetadataHashUpdated/agent.json";

  beforeEach(async function () {
    [
      owner,
      agentOperational,
      client1,
      client2,
      validator1,
      validator2,
      stranger,
    ] = await ethers.getSigners();

    // Deploy IdentityRegistry
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();

    // Deploy ReputationRegistry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy(await identityRegistry.getAddress());
    await reputationRegistry.waitForDeployment();

    // Deploy ValidationRegistry
    const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
    validationRegistry = await ValidationRegistry.deploy(await identityRegistry.getAddress());
    await validationRegistry.waitForDeployment();
  });

  describe("IdentityRegistry", function () {
    it("Should start with 0 total agents", async function () {
      expect(await identityRegistry.totalAgents()).to.equal(0);
    });

    it("Should register an agent and mint ERC-721 token correctly", async function () {
      const tx = await identityRegistry.connect(owner).registerAgent(agentURI, agentOperational.address);
      const receipt = await tx.wait();

      expect(await identityRegistry.totalAgents()).to.equal(1);
      expect(await identityRegistry.agentExists(1)).to.be.true;
      expect(await identityRegistry.ownerOf(1)).to.equal(owner.address);
      expect(await identityRegistry.getAgentAddress(1)).to.equal(agentOperational.address);
      expect(await identityRegistry.tokenURI(1)).to.equal(agentURI);

      await expect(tx)
        .to.emit(identityRegistry, "AgentRegistered")
        .withArgs(1, owner.address, agentOperational.address, agentURI);
    });

    it("Should default operational address to msg.sender if address(0) is provided", async function () {
      await identityRegistry.connect(owner).registerAgent(agentURI, ethers.ZeroAddress);
      expect(await identityRegistry.getAgentAddress(1)).to.equal(owner.address);
    });

    it("Should allow agent owner to update operational address", async function () {
      await identityRegistry.connect(owner).registerAgent(agentURI, agentOperational.address);

      await expect(identityRegistry.connect(owner).setAgentAddress(1, stranger.address))
        .to.emit(identityRegistry, "AgentAddressUpdated")
        .withArgs(1, agentOperational.address, stranger.address);

      expect(await identityRegistry.getAgentAddress(1)).to.equal(stranger.address);
    });

    it("Should revert if unauthorized account tries to set agent address", async function () {
      await identityRegistry.connect(owner).registerAgent(agentURI, agentOperational.address);

      await expect(
        identityRegistry.connect(stranger).setAgentAddress(1, stranger.address)
      ).to.be.revertedWith("IdentityRegistry: Not authorized");
    });

    it("Should allow agent owner to update agent URI", async function () {
      await identityRegistry.connect(owner).registerAgent(agentURI, agentOperational.address);

      await expect(identityRegistry.connect(owner).setAgentURI(1, updatedURI))
        .to.emit(identityRegistry, "AgentURIUpdated")
        .withArgs(1, agentURI, updatedURI);

      expect(await identityRegistry.tokenURI(1)).to.equal(updatedURI);
    });

    it("Should support IERC8004Identity and ERC721 interfaces", async function () {
      // ERC721 interface ID: 0x80ac58cd
      expect(await identityRegistry.supportsInterface("0x80ac58cd")).to.be.true;
    });
  });

  describe("ReputationRegistry", function () {
    let agentId;
    const fileHash = ethers.keccak256(ethers.toUtf8Bytes("TaskReceipt_#001"));
    const tag1 = ethers.encodeBytes32String("CODING");
    const tag2 = ethers.encodeBytes32String("SOLIDITY");
    const feedbackURI = "ipfs://QmFeedbackDetails/report.json";

    beforeEach(async function () {
      // Register Agent 1
      await identityRegistry.connect(owner).registerAgent(agentURI, agentOperational.address);
      agentId = 1;
    });

    async function generateAuthSignature(signer, clientAddress, id, fHash) {
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "bytes32"],
        [clientAddress, id, fHash]
      );
      return await signer.signMessage(ethers.getBytes(messageHash));
    }

    it("Should accept valid feedback authorized by agent operational wallet", async function () {
      const feedbackAuth = await generateAuthSignature(agentOperational, client1.address, agentId, fileHash);

      const tx = await reputationRegistry.connect(client1).giveFeedback(
        agentId,
        95,
        tag1,
        tag2,
        feedbackURI,
        fileHash,
        feedbackAuth
      );

      await expect(tx)
        .to.emit(reputationRegistry, "FeedbackGiven")
        .withArgs(agentId, client1.address, 95, tag1, tag2, feedbackURI, fileHash, 0);

      expect(await reputationRegistry.getFeedbackCount(agentId)).to.equal(1);
      const fb = await reputationRegistry.getFeedback(agentId, 0);
      expect(fb.client).to.equal(client1.address);
      expect(fb.score).to.equal(95);
      expect(fb.tag1).to.equal(tag1);
      expect(fb.tag2).to.equal(tag2);
      expect(fb.feedbackURI).to.equal(feedbackURI);
      expect(fb.fileHash).to.equal(fileHash);
      expect(fb.revoked).to.be.false;
      expect(await reputationRegistry.getAverageScore(agentId)).to.equal(95);
    });

    it("Should accept feedback authorized by agent owner", async function () {
      const feedbackAuth = await generateAuthSignature(owner, client1.address, agentId, fileHash);

      await expect(
        reputationRegistry.connect(client1).giveFeedback(
          agentId,
          88,
          tag1,
          tag2,
          feedbackURI,
          fileHash,
          feedbackAuth
        )
      ).to.emit(reputationRegistry, "FeedbackGiven");
    });

    it("Should reject feedback with score > 100", async function () {
      const feedbackAuth = await generateAuthSignature(agentOperational, client1.address, agentId, fileHash);

      await expect(
        reputationRegistry.connect(client1).giveFeedback(
          agentId,
          101,
          tag1,
          tag2,
          feedbackURI,
          fileHash,
          feedbackAuth
        )
      ).to.be.revertedWith("ReputationRegistry: Score must be between 0 and 100");
    });

    it("Should prevent self-feedback from owner or operational wallet", async function () {
      const auth1 = await generateAuthSignature(agentOperational, owner.address, agentId, fileHash);
      await expect(
        reputationRegistry.connect(owner).giveFeedback(
          agentId,
          100,
          tag1,
          tag2,
          feedbackURI,
          fileHash,
          auth1
        )
      ).to.be.revertedWith("ReputationRegistry: Cannot give self-feedback");

      const fileHash2 = ethers.keccak256(ethers.toUtf8Bytes("TaskReceipt_#002"));
      const auth2 = await generateAuthSignature(agentOperational, agentOperational.address, agentId, fileHash2);
      await expect(
        reputationRegistry.connect(agentOperational).giveFeedback(
          agentId,
          100,
          tag1,
          tag2,
          feedbackURI,
          fileHash2,
          auth2
        )
      ).to.be.revertedWith("ReputationRegistry: Cannot give self-feedback");
    });

    it("Should reject invalid or forged authorization signatures", async function () {
      // Signed by stranger instead of agent operational or owner
      const forgedAuth = await generateAuthSignature(stranger, client1.address, agentId, fileHash);

      await expect(
        reputationRegistry.connect(client1).giveFeedback(
          agentId,
          85,
          tag1,
          tag2,
          feedbackURI,
          fileHash,
          forgedAuth
        )
      ).to.be.revertedWith("ReputationRegistry: Invalid feedbackAuth signer");
    });

    it("Should prevent authorization signature replay", async function () {
      const feedbackAuth = await generateAuthSignature(agentOperational, client1.address, agentId, fileHash);

      // First submission succeeds
      await reputationRegistry.connect(client1).giveFeedback(
        agentId,
        90,
        tag1,
        tag2,
        feedbackURI,
        fileHash,
        feedbackAuth
      );

      // Replay fails
      await expect(
        reputationRegistry.connect(client1).giveFeedback(
          agentId,
          90,
          tag1,
          tag2,
          feedbackURI,
          fileHash,
          feedbackAuth
        )
      ).to.be.revertedWith("ReputationRegistry: Authorization signature already used");
    });

    it("Should allow client to revoke their feedback and update average score", async function () {
      const fileHash1 = ethers.keccak256(ethers.toUtf8Bytes("TaskReceipt_#001"));
      const fileHash2 = ethers.keccak256(ethers.toUtf8Bytes("TaskReceipt_#002"));

      const auth1 = await generateAuthSignature(agentOperational, client1.address, agentId, fileHash1);
      const auth2 = await generateAuthSignature(agentOperational, client2.address, agentId, fileHash2);

      await reputationRegistry.connect(client1).giveFeedback(
        agentId,
        100,
        tag1,
        tag2,
        feedbackURI,
        fileHash1,
        auth1
      );

      await reputationRegistry.connect(client2).giveFeedback(
        agentId,
        60,
        tag1,
        tag2,
        feedbackURI,
        fileHash2,
        auth2
      );

      // Average = (100 + 60) / 2 = 80
      expect(await reputationRegistry.getAverageScore(agentId)).to.equal(80);

      // Client 2 revokes their feedback (index 1)
      await expect(reputationRegistry.connect(client2).revokeFeedback(agentId, 1))
        .to.emit(reputationRegistry, "FeedbackRevoked")
        .withArgs(agentId, client2.address, 1);

      // Now average should only include client 1's feedback = 100
      expect(await reputationRegistry.getAverageScore(agentId)).to.equal(100);

      const fb = await reputationRegistry.getFeedback(agentId, 1);
      expect(fb.revoked).to.be.true;
    });

    it("Should reject revocation from someone other than original client", async function () {
      const auth = await generateAuthSignature(agentOperational, client1.address, agentId, fileHash);
      await reputationRegistry.connect(client1).giveFeedback(
        agentId,
        90,
        tag1,
        tag2,
        feedbackURI,
        fileHash,
        auth
      );

      await expect(
        reputationRegistry.connect(stranger).revokeFeedback(agentId, 0)
      ).to.be.revertedWith("ReputationRegistry: Only author client can revoke");
    });

    it("Should reject double revocation", async function () {
      const auth = await generateAuthSignature(agentOperational, client1.address, agentId, fileHash);
      await reputationRegistry.connect(client1).giveFeedback(
        agentId,
        90,
        tag1,
        tag2,
        feedbackURI,
        fileHash,
        auth
      );

      await reputationRegistry.connect(client1).revokeFeedback(agentId, 0);

      await expect(
        reputationRegistry.connect(client1).revokeFeedback(agentId, 0)
      ).to.be.revertedWith("ReputationRegistry: Feedback already revoked");
    });
  });

  describe("ValidationRegistry", function () {
    let agentId;
    const requestUri = "ipfs://QmValidationWorkload/spec.json";
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("WorkloadPayload"));
    const responseUri = "ipfs://QmValidationProof/zkProof.json";
    const responseHash = ethers.keccak256(ethers.toUtf8Bytes("ProofHashResult"));
    const tag = ethers.encodeBytes32String("ZKML_VERIFIED");

    beforeEach(async function () {
      await identityRegistry.connect(owner).registerAgent(agentURI, agentOperational.address);
      agentId = 1;
    });

    it("Should allow agent owner to request validation", async function () {
      const tx = await validationRegistry.connect(owner).validationRequest(
        validator1.address,
        agentId,
        requestUri,
        requestHash
      );

      const receipt = await tx.wait();
      const logs = receipt.logs;
      expect(logs.length).to.be.greaterThan(0);

      const agentValidations = await validationRegistry.getAgentValidations(agentId);
      expect(agentValidations.length).to.equal(1);
      const validationId = agentValidations[0];

      const validatorValidations = await validationRegistry.getValidatorValidations(validator1.address);
      expect(validatorValidations.length).to.equal(1);
      expect(validatorValidations[0]).to.equal(validationId);

      const [completed, score, assignedValidator] = await validationRegistry.getValidationStatus(validationId);
      expect(completed).to.be.false;
      expect(score).to.equal(0);
      expect(assignedValidator).to.equal(validator1.address);
    });

    it("Should allow agent operational wallet to request validation", async function () {
      await expect(
        validationRegistry.connect(agentOperational).validationRequest(
          validator1.address,
          agentId,
          requestUri,
          requestHash
        )
      ).to.emit(validationRegistry, "ValidationRequested");
    });

    it("Should revert if unauthorized account requests validation", async function () {
      await expect(
        validationRegistry.connect(stranger).validationRequest(
          validator1.address,
          agentId,
          requestUri,
          requestHash
        )
      ).to.be.revertedWith("ValidationRegistry: Caller not authorized for agent");
    });

    it("Should allow designated validator to submit validation response", async function () {
      const tx = await validationRegistry.connect(owner).validationRequest(
        validator1.address,
        agentId,
        requestUri,
        requestHash
      );
      const agentValidations = await validationRegistry.getAgentValidations(agentId);
      const validationId = agentValidations[0];

      await expect(
        validationRegistry.connect(validator1).validationResponse(
          validationId,
          98,
          responseUri,
          responseHash,
          tag
        )
      )
        .to.emit(validationRegistry, "ValidationCompleted")
        .withArgs(
          validationId,
          agentId,
          validator1.address,
          98,
          responseUri,
          responseHash,
          tag
        );

      const [completed, score, validatorAddress] = await validationRegistry.getValidationStatus(validationId);
      expect(completed).to.be.true;
      expect(score).to.equal(98);
      expect(validatorAddress).to.equal(validator1.address);

      const val = await validationRegistry.getValidation(validationId);
      expect(val.completed).to.be.true;
      expect(val.responseScore).to.equal(98);
      expect(val.responseUri).to.equal(responseUri);
      expect(val.responseHash).to.equal(responseHash);
      expect(val.tag).to.equal(tag);
      expect(val.responseTimestamp).to.be.greaterThan(0);
    });

    it("Should reject response from non-designated validator", async function () {
      await validationRegistry.connect(owner).validationRequest(
        validator1.address,
        agentId,
        requestUri,
        requestHash
      );
      const agentValidations = await validationRegistry.getAgentValidations(agentId);
      const validationId = agentValidations[0];

      await expect(
        validationRegistry.connect(validator2).validationResponse(
          validationId,
          90,
          responseUri,
          responseHash,
          tag
        )
      ).to.be.revertedWith("ValidationRegistry: Only designated validator can respond");
    });

    it("Should reject response if validation is already completed", async function () {
      await validationRegistry.connect(owner).validationRequest(
        validator1.address,
        agentId,
        requestUri,
        requestHash
      );
      const agentValidations = await validationRegistry.getAgentValidations(agentId);
      const validationId = agentValidations[0];

      await validationRegistry.connect(validator1).validationResponse(
        validationId,
        90,
        responseUri,
        responseHash,
        tag
      );

      await expect(
        validationRegistry.connect(validator1).validationResponse(
          validationId,
          95,
          responseUri,
          responseHash,
          tag
        )
      ).to.be.revertedWith("ValidationRegistry: Validation already completed");
    });

    it("Should reject response with score > 100", async function () {
      await validationRegistry.connect(owner).validationRequest(
        validator1.address,
        agentId,
        requestUri,
        requestHash
      );
      const agentValidations = await validationRegistry.getAgentValidations(agentId);
      const validationId = agentValidations[0];

      await expect(
        validationRegistry.connect(validator1).validationResponse(
          validationId,
          105,
          responseUri,
          responseHash,
          tag
        )
      ).to.be.revertedWith("ValidationRegistry: Score must be between 0 and 100");
    });
  });

  describe("End-to-End Autonomous Agent Lifecycle", function () {
    it("Complete flow: register -> task validation -> client feedback", async function () {
      // 1. Register AI Agent
      const regTx = await identityRegistry.connect(owner).registerAgent(
        "ipfs://QmAgentPassport/v1.json",
        agentOperational.address
      );
      await regTx.wait();
      const agentId = 1;

      // 2. Request zkML validation for task execution
      const taskHash = ethers.keccak256(ethers.toUtf8Bytes("MachineLearningInference#42"));
      const valTx = await validationRegistry.connect(agentOperational).validationRequest(
        validator1.address,
        agentId,
        "ipfs://QmInferenceTask/task.json",
        taskHash
      );
      await valTx.wait();
      const [validationId] = await validationRegistry.getAgentValidations(agentId);

      // 3. Validator issues attestation
      await validationRegistry.connect(validator1).validationResponse(
        validationId,
        100,
        "ipfs://QmZkProofArtifacts/proof.json",
        taskHash,
        ethers.encodeBytes32String("TEE_SGX")
      );

      const [isValCompleted, valScore] = await validationRegistry.getValidationStatus(validationId);
      expect(isValCompleted).to.be.true;
      expect(valScore).to.equal(100);

      // 4. Agent signs authorization for client to submit rating
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "bytes32"],
        [client1.address, agentId, taskHash]
      );
      const feedbackAuth = await agentOperational.signMessage(ethers.getBytes(messageHash));

      // 5. Client submits feedback
      await reputationRegistry.connect(client1).giveFeedback(
        agentId,
        96,
        ethers.encodeBytes32String("INFERENCE"),
        ethers.encodeBytes32String("LATENCY"),
        "ipfs://QmClientReview/review.json",
        taskHash,
        feedbackAuth
      );

      expect(await reputationRegistry.getAverageScore(agentId)).to.equal(96);
      const feedback = await reputationRegistry.getFeedback(agentId, 0);
      expect(feedback.client).to.equal(client1.address);
      expect(feedback.score).to.equal(96);
      expect(feedback.fileHash).to.equal(taskHash);
    });
  });

  describe("Integration with src/ Agent, ClientAgent, and ValidatorNode", function () {
    const { AutonomousAgent } = require("../src/Agent");
    const { ClientAgent } = require("../src/ClientAgent");
    const { ValidatorNode } = require("../src/ValidatorNode");

    it("Coordinates full lifecycle using AutonomousAgent, ClientAgent, and ValidatorNode", async function () {
      // 1. Initialize Agents with signers
      const agent = new AutonomousAgent({ privateKey: agentOperational });
      const client = new ClientAgent({ privateKey: client1 });
      const validator = new ValidatorNode({ privateKey: validator1, validatorType: "TEE-SGX" });

      // Connect wallets to provider
      agent.connect(ethers.provider);
      client.connect(ethers.provider);
      validator.connect(ethers.provider);

      // Fund operational wallets if needed (already funded on local hardhat)
      // 2. AutonomousAgent registers itself on IdentityRegistry
      const registeredId = await agent.register(identityRegistry);
      expect(registeredId).to.equal(1);
      expect(agent.agentId).to.equal(1);

      // 3. ClientAgent discovers the agent
      const profile = await client.discoverAgent(identityRegistry, registeredId);
      expect(profile.agentId).to.equal(1);
      expect(profile.operationalAddress).to.equal(agentOperational.address);

      // 4. AutonomousAgent executes a task
      const taskReport = await agent.executeTask({
        taskType: "analyze_liquidity_pool",
        params: { pair: "WETH/USDC", dex: "Aerodrome" }
      });
      expect(taskReport.status).to.equal("COMPLETED");
      expect(taskReport.taskHash).to.be.properHex(64);

      // 5. Agent requests validation from ValidatorNode
      const valTx = await validationRegistry.connect(agentOperational).validationRequest(
        validator.address,
        registeredId,
        "ipfs://QmValidationData/task.json",
        taskReport.taskHash
      );
      await valTx.wait();
      const [validationId] = await validationRegistry.getAgentValidations(registeredId);

      // 6. ValidatorNode audits task execution and submits response
      const auditResult = validator.auditTaskExecution(taskReport);
      expect(auditResult.verificationScore).to.be.at.least(90);

      const responseReceipt = await validator.submitValidationResponse(
        validationRegistry,
        validationId,
        auditResult
      );
      expect(responseReceipt.score).to.be.at.least(90);

      const [isValCompleted, valScore] = await validationRegistry.getValidationStatus(validationId);
      expect(isValCompleted).to.be.true;
      expect(valScore).to.equal(auditResult.verificationScore);

      // 7. AutonomousAgent generates cryptographic feedbackAuth for ClientAgent
      const feedbackAuth = await agent.generateFeedbackAuth(
        client.address,
        registeredId,
        taskReport.taskHash
      );

      // 8. ClientAgent submits feedback
      const feedbackReceipt = await client.giveFeedback(reputationRegistry, {
        agentId: registeredId,
        score: 99,
        tag1: "defi",
        tag2: "aerodrome",
        feedbackUri: "ipfs://QmReview/feedback.json",
        fileHash: taskReport.taskHash,
        feedbackAuth
      });
      expect(feedbackReceipt.score).to.equal(99);

      // Verify on-chain reputation state
      expect(await reputationRegistry.getAverageScore(registeredId)).to.equal(99);
      expect(await reputationRegistry.getFeedbackCount(registeredId)).to.equal(1);
    });

    it("Encodes and decodes on-chain Base64 Data URI accurately", function () {
      const { encodeAgentCardToDataUri, decodeAgentUri } = require("../src/utils/agentCardUri");
      const sampleCard = {
        name: "Test Sepolia Agent",
        description: "Test description",
        active: true
      };
      const dataUri = encodeAgentCardToDataUri(sampleCard, {
        chainId: 11155111,
        agentId: 42
      });
      expect(dataUri).to.be.a("string");
      expect(dataUri.startsWith("data:application/json;base64,")).to.be.true;

      const decoded = decodeAgentUri(dataUri);
      expect(decoded).to.not.be.null;
      expect(decoded.name).to.equal("Test Sepolia Agent");
      expect(decoded.registrations[0].agentId).to.equal(42);
      expect(decoded.type).to.equal("https://eips.ethereum.org/EIPS/eip-8004#registration-v1");
    });

    it("ClientAgent decodes on-chain Data URI directly during discoverAgent()", async function () {
      const { encodeAgentCardToDataUri } = require("../src/utils/agentCardUri");
      const testCard = {
        name: "OnChain Decoded Agent",
        description: "Metadata parsed straight from tokenURI",
        services: [{ name: "MCP", endpoint: "https://agent.test/mcp" }]
      };
      const onChainDataUri = encodeAgentCardToDataUri(testCard, { chainId: 11155111, agentId: 1 });
      
      const regTx = await identityRegistry.connect(owner).registerAgent(onChainDataUri, agentOperational.address);
      await regTx.wait();
      
      const client = new ClientAgent({ privateKey: client1 });
      const discovered = await client.discoverAgent(identityRegistry, 1);
      expect(discovered.agentId).to.equal(1);
      expect(discovered.agentCard.name).to.equal("OnChain Decoded Agent");
      expect(discovered.tokenUri.startsWith("data:application/json;base64,")).to.be.true;
    });
  });
});
