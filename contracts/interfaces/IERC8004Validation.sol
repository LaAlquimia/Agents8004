// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC8004Validation
 * @notice Interfaz oficial del Validation Registry según el estándar ERC-8004 ("Trustless Agents").
 * Proporciona un marco asíncrono para solicitar y registrar verificaciones independientes
 * (zkML, atestaciones TEE, restaking AVS o comités de arbitraje).
 */
interface IERC8004Validation {
    struct Validation {
        bytes32 validationId;
        uint256 agentId;
        address requester;
        address validatorAddress;
        string requestUri;
        bytes32 requestHash;
        uint256 requestTimestamp;
        bool completed;
        uint8 responseScore;
        string responseUri;
        bytes32 responseHash;
        bytes32 tag;
        uint256 responseTimestamp;
    }

    event ValidationRequested(
        bytes32 indexed validationId,
        uint256 indexed agentId,
        address indexed validatorAddress,
        address requester,
        string requestUri,
        bytes32 requestHash
    );

    event ValidationCompleted(
        bytes32 indexed validationId,
        uint256 indexed agentId,
        address indexed validatorAddress,
        uint8 responseScore,
        string responseUri,
        bytes32 responseHash,
        bytes32 tag
    );

    /**
     * @notice Registra una solicitud formal de validación para una tarea o inferencia.
     * @param validatorAddress Dirección del oráculo, validador o contrato verificador designado.
     * @param agentId Identificador del agente evaluado.
     * @param requestUri Puntero a la especificación de datos de entrada para la verificación.
     * @param requestHash Hash unívoco del contexto o estado a verificar.
     * @return validationId Identificador único de la solicitud generada.
     */
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) external returns (bytes32 validationId);

    /**
     * @notice Emite el dictamen oficial de la validación.
     * @dev Solo invocable por el validador designado en la solicitud inicial.
     * @param validationId Identificador único de la validación.
     * @param responseScore Puntuación cuantitativa (0 a 100).
     * @param responseUri Puntero a la prueba criptográfica, atestación o reporte de auditoría.
     * @param responseHash Hash del artefacto de respuesta.
     * @param tag Etiqueta que categoriza el mecanismo de validación (ej. TEE, zkML).
     */
    function validationResponse(
        bytes32 validationId,
        uint8 responseScore,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) external;

    /**
     * @notice Retorna el registro completo de una validación.
     * @param validationId Identificador de la validación.
     */
    function getValidation(bytes32 validationId) external view returns (Validation memory);

    /**
     * @notice Retorna el estado de completitud y puntuación de una validación.
     * @param validationId Identificador de la validación.
     */
    function getValidationStatus(bytes32 validationId)
        external
        view
        returns (bool completed, uint8 responseScore, address validatorAddress);

    /**
     * @notice Retorna todas las validaciones asociadas a un agente.
     * @param agentId Identificador del agente.
     */
    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory);

    /**
     * @notice Retorna todas las validaciones asignadas a un validador.
     * @param validator Dirección del validador.
     */
    function getValidatorValidations(address validator) external view returns (bytes32[] memory);
}
