// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./interfaces/IERC8004Identity.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-8004 Agent Identity Registry
 * Minting ERC-721 tokens representing autonomous agent identities with operational keys and metadata URIs.
 */
contract IdentityRegistry is ERC721URIStorage, IERC8004Identity {
    uint256 private _nextAgentId = 1;

    // Mapping from agentId to operational agent address
    mapping(uint256 => address) private _agentAddresses;

    constructor() ERC721("ERC8004 Agent Identity", "AGENT") {}

    /**
     * @notice Registers a new agent, minting an ERC-721 identity token to caller.
     * @param agentURI Off-chain metadata URI (e.g. IPFS / HTTPS) describing the agent
     * @param agentAddress Operational wallet address of the agent (defaults to caller if address(0))
     * @return agentId The newly assigned incremental agent ID
     */
    function registerAgent(
        string calldata agentURI,
        address agentAddress
    ) external override returns (uint256 agentId) {
        agentId = _nextAgentId++;

        address effectiveAgentAddress = agentAddress == address(0) ? msg.sender : agentAddress;
        _agentAddresses[agentId] = effectiveAgentAddress;

        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        emit AgentRegistered(agentId, msg.sender, effectiveAgentAddress, agentURI);
    }

    /**
     * @notice Returns the operational address of the agent.
     * @param agentId The ID of the agent
     */
    function getAgentAddress(uint256 agentId) external view override returns (address) {
        _requireOwned(agentId);
        return _agentAddresses[agentId];
    }

    /**
     * @notice Updates the operational address of an agent.
     * @param agentId The ID of the agent
     * @param newAgentAddress The new operational address
     */
    function setAgentAddress(uint256 agentId, address newAgentAddress) external override {
        address owner = ownerOf(agentId);
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender) || getApproved(agentId) == msg.sender,
            "IdentityRegistry: Not authorized"
        );
        require(newAgentAddress != address(0), "IdentityRegistry: Invalid agent address");

        address oldAgentAddress = _agentAddresses[agentId];
        _agentAddresses[agentId] = newAgentAddress;

        emit AgentAddressUpdated(agentId, oldAgentAddress, newAgentAddress);
    }

    /**
     * @notice Updates the metadata URI of an agent.
     * @param agentId The ID of the agent
     * @param newURI The new metadata URI
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external override {
        address owner = ownerOf(agentId);
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender) || getApproved(agentId) == msg.sender,
            "IdentityRegistry: Not authorized"
        );

        string memory oldURI = tokenURI(agentId);
        _setTokenURI(agentId, newURI);

        emit AgentURIUpdated(agentId, oldURI, newURI);
    }

    /**
     * @notice Returns the total count of registered agents.
     */
    function totalAgents() external view override returns (uint256) {
        return _nextAgentId - 1;
    }

    /**
     * @notice Returns whether an agent ID exists.
     * @param agentId The agent ID to check
     */
    function agentExists(uint256 agentId) external view override returns (bool) {
        return _ownerOf(agentId) != address(0);
    }

    /**
     * @dev Overrides supportsInterface for ERC721URIStorage and IERC8004Identity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC8004Identity).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
