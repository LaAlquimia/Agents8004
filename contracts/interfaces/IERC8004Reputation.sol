// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC8004Reputation
 * @notice Interfaz oficial del Reputation Registry según el estándar ERC-8004 ("Trustless Agents").
 * Proporciona un registro inmutable, estructurado y resistente a ataques Sybil para métricas de feedback.
 */
interface IERC8004Reputation {
    struct Feedback {
        address client;
        uint8 score;
        bytes32 tag1;
        bytes32 tag2;
        string feedbackURI;
        bytes32 fileHash;
        uint256 timestamp;
        bool revoked;
    }

    event FeedbackGiven(
        uint256 indexed agentId,
        address indexed client,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string feedbackURI,
        bytes32 fileHash,
        uint256 feedbackIndex
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed client,
        uint256 feedbackIndex
    );

    /**
     * @notice Emite retroalimentación estructurada para un agente con pre-autorización criptográfica feedbackAuth.
     * @param agentId Identificador del agente calificado.
     * @param score Puntuación cuantitativa (0 a 100).
     * @param tag1 Etiqueta primaria de clasificación (bytes32).
     * @param tag2 Etiqueta secundaria de clasificación (bytes32).
     * @param feedbackURI Puntero off-chain a la evidencia y detalles del feedback.
     * @param fileHash Hash del entregable, factura o contexto de ejecución.
     * @param feedbackAuth Firma ECDSA emitida por el agente para autorizar la calificación.
     */
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackURI,
        bytes32 fileHash,
        bytes calldata feedbackAuth
    ) external;

    /**
     * @notice Permite al cliente emisor revocar un feedback previamente enviado.
     * @param agentId Identificador del agente.
     * @param feedbackIndex Índice del feedback en el historial del cliente.
     */
    function revokeFeedback(uint256 agentId, uint256 feedbackIndex) external;

    /**
     * @notice Retorna el número total de feedbacks registrados para un agente.
     * @param agentId Identificador del agente.
     */
    function getFeedbackCount(uint256 agentId) external view returns (uint256);

    /**
     * @notice Retorna el registro de feedback en un índice específico.
     * @param agentId Identificador del agente.
     * @param index Índice del elemento en el arreglo.
     */
    function getFeedback(uint256 agentId, uint256 index) external view returns (Feedback memory);

    /**
     * @notice Calcula la puntuación promedio de los feedbacks activos (no revocados).
     * @param agentId Identificador del agente.
     */
    function getAverageScore(uint256 agentId) external view returns (uint256);
}
