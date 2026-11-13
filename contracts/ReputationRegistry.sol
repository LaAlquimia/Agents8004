// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IERC8004Identity.sol";
import "./interfaces/IERC8004Reputation.sol";

/**
 * @title ReputationRegistry
 * @notice ERC-8004 Agent Reputation Registry
 * Tracks feedback, ratings, and cryptographic proof of authorization to prevent Sybil feedback.
 */
contract ReputationRegistry is IERC8004Reputation {
    IERC8004Identity public immutable identityRegistry;

    // agentId => array of Feedbacks
    mapping(uint256 => Feedback[]) private _feedbacks;

    // To prevent replay of feedback authorizations: authHash => bool
    mapping(bytes32 => bool) private _usedAuthSignatures;

    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "ReputationRegistry: Invalid identity registry");
        identityRegistry = IERC8004Identity(_identityRegistry);
    }

    /**
     * @notice Gives feedback to an agent with cryptographic authorization from the agent.
     * @param agentId The ID of the agent receiving feedback
     * @param score Score between 0 and 100
     * @param tag1 Primary category tag (bytes32)
     * @param tag2 Secondary category tag (bytes32)
     * @param feedbackURI Off-chain metadata URI detailing the feedback
     * @param fileHash Hash of the task, receipt, or deliverables referenced
     * @param feedbackAuth ECDSA signature from the agent operational address or owner
     */
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackURI,
        bytes32 fileHash,
        bytes calldata feedbackAuth
    ) external override {
        require(score <= 100, "ReputationRegistry: Score must be between 0 and 100");
        require(identityRegistry.agentExists(agentId), "ReputationRegistry: Agent does not exist");

        _verifyFeedbackAuth(agentId, fileHash, feedbackAuth);

        uint256 feedbackIndex = _feedbacks[agentId].length;
        _feedbacks[agentId].push(
            Feedback({
                client: msg.sender,
                score: score,
                tag1: tag1,
                tag2: tag2,
                feedbackURI: feedbackURI,
                fileHash: fileHash,
                timestamp: block.timestamp,
                revoked: false
            })
        );

        emit FeedbackGiven(
            agentId,
            msg.sender,
            score,
            tag1,
            tag2,
            feedbackURI,
            fileHash,
            feedbackIndex
        );
    }

    /**
     * @dev Internal helper to verify ECDSA signature and anti-sybil checks.
     */
    function _verifyFeedbackAuth(
        uint256 agentId,
        bytes32 fileHash,
        bytes calldata feedbackAuth
    ) internal {
        // Prevent signature reuse
        bytes32 authHash = keccak256(feedbackAuth);
        require(!_usedAuthSignatures[authHash], "ReputationRegistry: Authorization signature already used");
        _usedAuthSignatures[authHash] = true;

        address owner = identityRegistry.ownerOf(agentId);
        address operationalAddress = identityRegistry.getAgentAddress(agentId);

        // Prevent self-feedback
        require(
            msg.sender != owner && msg.sender != operationalAddress,
            "ReputationRegistry: Cannot give self-feedback"
        );

        // Agent authorizes caller (msg.sender) for task fileHash
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, agentId, fileHash));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, feedbackAuth);

        require(
            recoveredSigner == operationalAddress || recoveredSigner == owner,
            "ReputationRegistry: Invalid feedbackAuth signer"
        );
    }

    /**
     * @notice Revokes a previously submitted feedback. Only the original client can revoke.
     * @param agentId The ID of the agent
     * @param feedbackIndex The index of the feedback entry
     */
    function revokeFeedback(uint256 agentId, uint256 feedbackIndex) external override {
        require(feedbackIndex < _feedbacks[agentId].length, "ReputationRegistry: Feedback index out of bounds");
        Feedback storage fb = _feedbacks[agentId][feedbackIndex];

        require(fb.client == msg.sender, "ReputationRegistry: Only author client can revoke");
        require(!fb.revoked, "ReputationRegistry: Feedback already revoked");

        fb.revoked = true;

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /**
     * @notice Returns total count of feedbacks recorded for an agent.
     * @param agentId The ID of the agent
     */
    function getFeedbackCount(uint256 agentId) external view override returns (uint256) {
        return _feedbacks[agentId].length;
    }

    /**
     * @notice Returns feedback details at given index.
     * @param agentId The ID of the agent
     * @param index The index of the feedback entry
     */
    function getFeedback(uint256 agentId, uint256 index) external view override returns (Feedback memory) {
        require(index < _feedbacks[agentId].length, "ReputationRegistry: Feedback index out of bounds");
        return _feedbacks[agentId][index];
    }

    /**
     * @notice Computes average score for active (non-revoked) feedback.
     * @param agentId The ID of the agent
     * @return Average score (0-100), or 0 if no active feedback
     */
    function getAverageScore(uint256 agentId) external view override returns (uint256) {
        uint256 total = 0;
        uint256 validCount = 0;
        uint256 len = _feedbacks[agentId].length;

        for (uint256 i = 0; i < len; i++) {
            if (!_feedbacks[agentId][i].revoked) {
                total += _feedbacks[agentId][i].score;
                validCount++;
            }
        }

        if (validCount == 0) {
            return 0;
        }

        return total / validCount;
    }
}
