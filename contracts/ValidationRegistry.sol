// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC8004Identity.sol";
import "./interfaces/IERC8004Validation.sol";

/**
 * @title ValidationRegistry
 * @notice ERC-8004 Agent Validation Registry
 * Manages verifiable task validation requests and independent validator responses.
 */
contract ValidationRegistry is IERC8004Validation {
    IERC8004Identity public immutable identityRegistry;

    uint256 private _requestNonce;

    // validationId => Validation
    mapping(bytes32 => Validation) private _validations;

    // agentId => array of validationIds
    mapping(uint256 => bytes32[]) private _agentValidations;

    // validatorAddress => array of validationIds
    mapping(address => bytes32[]) private _validatorValidations;

    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "ValidationRegistry: Invalid identity registry");
        identityRegistry = IERC8004Identity(_identityRegistry);
    }

    /**
     * @notice Requests independent validation of an agent's task or output.
     * @param validatorAddress The address of the designated validator
     * @param agentId The ID of the agent requesting validation
     * @param requestUri Off-chain metadata URI describing the validation workload / proof request
     * @param requestHash Commitment hash of the task data or state to be validated
     * @return validationId Unique identifier for this validation request
     */
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) external override returns (bytes32 validationId) {
        require(validatorAddress != address(0), "ValidationRegistry: Invalid validator");
        require(identityRegistry.agentExists(agentId), "ValidationRegistry: Agent does not exist");

        address owner = identityRegistry.ownerOf(agentId);
        address operationalAddress = identityRegistry.getAgentAddress(agentId);

        // Caller must be agent owner, operational address, or approved operator
        require(
            msg.sender == owner ||
            msg.sender == operationalAddress ||
            identityRegistry.isApprovedForAll(owner, msg.sender) ||
            identityRegistry.getApproved(agentId) == msg.sender,
            "ValidationRegistry: Caller not authorized for agent"
        );

        validationId = keccak256(
            abi.encodePacked(
                block.chainid,
                agentId,
                validatorAddress,
                requestHash,
                _requestNonce++
            )
        );

        _validations[validationId] = Validation({
            validationId: validationId,
            agentId: agentId,
            requester: msg.sender,
            validatorAddress: validatorAddress,
            requestUri: requestUri,
            requestHash: requestHash,
            requestTimestamp: block.timestamp,
            completed: false,
            responseScore: 0,
            responseUri: "",
            responseHash: bytes32(0),
            tag: bytes32(0),
            responseTimestamp: 0
        });

        _agentValidations[agentId].push(validationId);
        _validatorValidations[validatorAddress].push(validationId);

        emit ValidationRequested(
            validationId,
            agentId,
            validatorAddress,
            msg.sender,
            requestUri,
            requestHash
        );
    }

    /**
     * @notice Submits validation response by the designated validator.
     * @param validationId Unique identifier of the validation request
     * @param responseScore Assessment score between 0 and 100
     * @param responseUri Off-chain URI pointing to execution trace, attestation, or ZK proof
     * @param responseHash Cryptographic hash of the validation response artifact
     * @param tag Tag categorizing the validation mechanism (e.g. TEE, zkML, STAKE)
     */
    function validationResponse(
        bytes32 validationId,
        uint8 responseScore,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) external override {
        Validation storage val = _validations[validationId];

        require(val.requester != address(0), "ValidationRegistry: Request does not exist");
        require(msg.sender == val.validatorAddress, "ValidationRegistry: Only designated validator can respond");
        require(!val.completed, "ValidationRegistry: Validation already completed");
        require(responseScore <= 100, "ValidationRegistry: Score must be between 0 and 100");

        val.completed = true;
        val.responseScore = responseScore;
        val.responseUri = responseUri;
        val.responseHash = responseHash;
        val.tag = tag;
        val.responseTimestamp = block.timestamp;

        emit ValidationCompleted(
            validationId,
            val.agentId,
            msg.sender,
            responseScore,
            responseUri,
            responseHash,
            tag
        );
    }

    /**
     * @notice Returns full validation struct for a validation ID.
     */
    function getValidation(bytes32 validationId) external view override returns (Validation memory) {
        require(_validations[validationId].requester != address(0), "ValidationRegistry: Request does not exist");
        return _validations[validationId];
    }

    /**
     * @notice Returns completion status and score for a validation ID.
     */
    function getValidationStatus(bytes32 validationId)
        external
        view
        override
        returns (bool completed, uint8 responseScore, address validatorAddress)
    {
        Validation storage val = _validations[validationId];
        require(val.requester != address(0), "ValidationRegistry: Request does not exist");
        return (val.completed, val.responseScore, val.validatorAddress);
    }

    /**
     * @notice Returns all validation IDs associated with an agent.
     */
    function getAgentValidations(uint256 agentId) external view override returns (bytes32[] memory) {
        return _agentValidations[agentId];
    }

    /**
     * @notice Returns all validation IDs assigned to a validator.
     */
    function getValidatorValidations(address validator) external view override returns (bytes32[] memory) {
        return _validatorValidations[validator];
    }
}
