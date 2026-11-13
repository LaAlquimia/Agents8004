// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IERC8004Identity
 * @notice Interfaz oficial del Identity Registry según el estándar ERC-8004 ("Trustless Agents").
 * Proporciona un anclaje ERC-721 inmutable para vincular identidades de agentes con
 * especificaciones off-chain (Agent Cards) y direcciones operativas de billeteras.
 */
interface IERC8004Identity is IERC721 {
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        address indexed agentAddress,
        string agentURI
    );

    event AgentAddressUpdated(
        uint256 indexed agentId,
        address indexed oldAgentAddress,
        address indexed newAgentAddress
    );

    event AgentURIUpdated(
        uint256 indexed agentId,
        string oldURI,
        string newURI
    );

    /**
     * @notice Registra un nuevo agente de IA y acuña un token ERC-721 representativo.
     * @param agentURI Puntero de metadatos (ej. IPFS/HTTPS) hacia el Agent Card JSON.
     * @param agentAddress Dirección de billetera de ejecución asociada al agente.
     * @return agentId El identificador numérico único asignado al agente.
     */
    function registerAgent(string calldata agentURI, address agentAddress) external returns (uint256 agentId);

    /**
     * @notice Actualiza el URI de metadatos del agente.
     * @dev Solo invocable por el propietario o un operador autorizado del token.
     * @param agentId Identificador del agente.
     * @param newURI Nuevo puntero de metadatos.
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external;

    /**
     * @notice Actualiza la dirección operativa del agente.
     * @dev Solo invocable por el propietario del token.
     * @param agentId Identificador del agente.
     * @param newAgentAddress Nueva dirección operativa.
     */
    function setAgentAddress(uint256 agentId, address newAgentAddress) external;

    /**
     * @notice Obtiene la dirección operativa actual del agente.
     * @param agentId Identificador del agente.
     * @return Dirección operativa designada.
     */
    function getAgentAddress(uint256 agentId) external view returns (address);

    /**
     * @notice Retorna el número total de agentes registrados.
     */
    function totalAgents() external view returns (uint256);

    /**
     * @notice Retorna si un agentId dado existe.
     */
    function agentExists(uint256 agentId) external view returns (bool);
}
