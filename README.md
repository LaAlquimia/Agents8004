# 🌐 ERC-8004 Trustless Agents: Master Tutorial & Laboratorio Dual (Ethereum Sepolia)

> **Tutorial definitivo y código de producción** para el estándar **ERC-8004** en **Ethereum Sepolia** (`Chain ID: 11155111`).  
> Aprende a crear, certificar y operar Agentes Autónomos con **Identidad Soberana**, **Reputación Anti-Sybil** y **Validación Criptográfica TEE**, tanto en **tu propio laboratorio privado** como en la **red canónica global 8004scan**.

---

## 🧭 ¿Qué es ERC-8004 para alguien que no sabe nada?

Imagina que hoy en día cualquier persona puede crear un bot o una IA en internet, pero enfrentamos tres grandes problemas:
1. **¿Quién es la IA?** (Cualquiera puede hacerse pasar por otro).
2. **¿Es confiable?** (Las reseñas en internet se pueden falsificar con bots).
3. **¿Hizo bien su trabajo o inventó los resultados?** (Las IAs a veces tienen alucinaciones o cometen fraudes).

El estándar **ERC-8004** resuelve esto mediante **3 Pilares On-Chain**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      EL ECOSISTEMA ERC-8004                            │
 ├───────────────────┬────────────────────────────┬───────────────────────┤
 │ 1. EL PASAPORTE   │ 2. LAS ESTRELLAS ANTI-TRAMPA│ 3. EL NOTARIO MATEMÁTICO│
 │ Identity Registry │ Reputation Registry        │ Validation Registry   │
 ├───────────────────┼────────────────────────────┼───────────────────────┤
 │ Un NFT que la IA  │ Sistema de reputación      │ Un nodo TEE (Intel SGX)│
 │ lleva consigo.    │ donde solo quien pagó y    │ o zkML que audita el  │
 │ Contiene su wallet│ recibió el servicio puede  │ código y los cálculos │
 │ y su "Agent Card" │ calificar (firmado ECDSA). │ y firma el certificado│
 └───────────────────┴────────────────────────────┴───────────────────────┘
```

---

## ⚡ Inicio Rápido en 2 Minutos

### 1. Clonar e Instalar Dependencias
Puedes usar **Bun** (recomendado por velocidad) o **Node.js**:
```bash
# Con Bun:
bun install

# O con npm:
npm install
```

### 2. Configurar Variables de Entorno (`.env`)
Crea tu archivo `.env` a partir de `.env.example`:
```bash
cp .env.example .env
```
Asegúrate de configurar tu wallet de Sepolia y RPC:
```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
AGENT_OWNER_PRIVATE_KEY=tu_clave_privada_aqui
```

### 3. Verificar Conexión y Saldo
Ejecuta la herramienta de diagnóstico de saldo:
```bash
bun run check-balance
```

---

## 🔀 Las 2 Rutas del Proyecto

Este repositorio está arquitecturado para soportar los dos mundos de ERC-8004:

```
                            ¿QUÉ RUTA DESEAS EXPLORAR?
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
 🏛️ RUTA 1: LABORATORIO PROPIO                             🌍 RUTA 2: RED GLOBAL 8004SCAN
 ──────────────────────────────                            ───────────────────────────────
 • Tus propios Smart Contracts                             • Contratos Oficiales de la Fundación
 • Control total y lógica a medida                         • Conectado al explorador 8004scan.com
 • Ideal para empresas, tests y demos                      • Visibilidad global y miles de agentes
 • Comando: bun start                                      • Comando: bun run status_global
```

---

## 🏛️ RUTA 1: Laboratorio Privado (Tus Propios Smart Contracts)

En esta ruta eres el dueño absoluto del protocolo. Tienes 3 contratos Solidity en `contracts/`:
- `IdentityRegistry.sol`: Acuña el NFT de identidad y asocia la wallet operativa del agente.
- `ReputationRegistry.sol`: Gestiona el feedback firmado criptográficamente (`feedbackAuth`) para evitar calificaciones falsas (ataques Sybil).
- `ValidationRegistry.sol`: Permite a enclaves seguros (TEE / Intel SGX) o zkML certificar que el informe del agente es 100% matemáticamente correcto.

### 1. Ejecutar las 27 Pruebas Unitarias
Verifica la integridad de los contratos, firmas ECDSA y decodificación de metadatos en memoria:
```bash
bun test
# o: npm test
```
*Pasan 27 tests de 27.*

### 2. Desplegar tus Contratos en Sepolia (Opcional)
Si quieres tus propios contratos en testnet:
```bash
bun run deploy:own
```
*(Ya dejamos un despliegue verificado en Sepolia: Identity `0xbd96E...`, Reputation `0xcEC7D...`, Validation `0xadd2C...`)*.

### 3. Ejecutar la Simulación End-to-End
Corre el flujo autónomo completo entre dos agentes y un validador:
```bash
bun start
# o: node demo.js
```

#### Lo que sucede en pantalla (Paso a Paso):
1. **Paso 1:** Se despliegan/conectan los 3 registros singleton.
2. **Paso 2:** El Agente *EtherPulse Sepolia Analyst* acuña su NFT de Identidad (#1).
3. **Paso 3:** Un Agente Cliente descubre al analista mediante el protocolo A2A y lee sus herramientas MCP (Model Context Protocol).
4. **Paso 4:** El Cliente le pide analizar la liquidez de Uniswap v3 en Sepolia. El agente calcula TVL, slippage y genera un digest criptográfico (`taskHash`).
5. **Paso 5:** El Cliente califica con 98/100 autorizando la transacción mediante firma criptográfica ECDSA.
6. **Paso 6:** El validador TEE audita el hash del informe, verifica que no hubo manipulación y emite una atestación `TEE-ATTESTED` con score 100/100.
7. **Paso 7:** Se imprime el **Pasaporte de Confianza Consolidado** del agente.

---

## 🌍 RUTA 2: Ecosistema Canónico Global (8004scan.com) & Model Context Protocol (MCP)

En esta ruta interactúas con los contratos inteligentes oficiales desplegados por la comunidad y la fundación ERC-8004 en **29 cadenas de bloques distintas** usando la misma dirección (`CREATE2`), y pones en funcionamiento un **Servidor MCP real** que cualquier LLM o agente externo puede consumir:

| Contrato Canónico | Dirección en Ethereum Sepolia |
| :--- | :--- |
| **Canonical Identity Registry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| **Canonical Reputation Registry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

---

### 📝 1. Cómo Registrar un Agente en el Global Registry Paso a Paso

El registro en el contrato canónico singleton vincula la clave de tu agente con su identidad NFT soberana en Sepolia:

```
 ┌──────────────────────┐      ┌─────────────────────────┐      ┌───────────────────────────────┐
 │ 1. src/agentCard.json│ ───► │ 2. Base64 Data URI      │ ───► │ 3. register(agentURI)         │
 │ Metadatos + Tools MCP│      │ data:application/json...│      │ Contrato 0x8004A818... Sepolia│
 └──────────────────────┘      └─────────────────────────┘      └──────────────┬────────────────┘
                                                                               │
                                                                               ▼
                                                                ┌───────────────────────────────┐
                                                                │ 4. NFT Acuñado: Agent #11287  │
                                                                │ Visible en 8004scan.com/11287 │
                                                                └───────────────────────────────┘
```

#### Paso 1: Configurar la Wallet y Fondos
En tu archivo `.env`:
```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=tu_clave_privada_con_sepolia_eth
```

#### Paso 2: Ejecutar el Registro Global
Ejecuta el script automatizado:
```bash
bun run registry_global
```
*¿Qué hace internamente el script?*
1. Lee [`src/agentCard.json`](./src/agentCard.json).
2. Codifica el JSON en una cadena Data URI Base64 estándar (`#registration-v1`).
3. Invoca la función canónica `register(string agentURI)` en `0x8004A818BFB912233c491871b3d84c89A494BD9e`.
4. Extrae el `tokenId` acuñado del evento `Transfer(0x0, to, tokenId)`.
5. Guarda el registro en `src/global-agent.json` con protecciones anti-doble gasto para no gastar gas innecesariamente.

---

### 🔍 2. El Secreto del Agent Card: ¿Por qué `{}` en 8004scan y cómo se solucionó?

#### Diagnóstico del Error `{}`
Al registrar un agente con una URL de IPFS tradicional como `ipfs://bafybeif...`, las pasarelas públicas de 8004scan sufren de *timeouts* (404) si el archivo no está activamente anclado (*pinned*) en servidores dedicados. Cuando el explorador no puede descargar el archivo en pocos segundos, devuelve un objeto vacío `{}`.

#### Solución de Ingeniería: On-Chain Data URI Base64
Convertimos la tarjeta de agente en un URI de datos autosuficiente:
```text
data:application/json;base64,eyIkc2NoZW1hIjoiaHR0cHM6Ly9laXBzLmV0aGVyZXVt...
```
- **100% On-Chain y Permanente:** La metadata vive en los bloques de Ethereum Sepolia.
- **Cero Dependencias:** 8004scan, billeteras y LLMs resuelven la información en $O(1)$ sin fallos de red.
- **Actualizable en Caliente:** Para cambiar cualquier campo (nombre, descripción, herramientas), editas `src/agentCard.json` y ejecutas:
  ```bash
  bun run update_card
  ```
  *(Consume únicamente ~79,000 unidades de gas invocando `setAgentURI(11287, dataURI)`)*.

---

### 🔌 3. Cómo Conectar la MCP (Model Context Protocol) al Agente

El estándar **Model Context Protocol (MCP)** de Anthropic permite que cualquier modelo de lenguaje (Claude, Cursor, Antigravity, o un agente DeFi) descubra y ejecute herramientas expuestas por tu agente.

En ERC-8004, la conexión se realiza publicando dos secciones dentro de [`src/agentCard.json`](./src/agentCard.json):

#### A. El Endpoint del Servicio MCP
```json
"services": [
  {
    "name": "MCP",
    "endpoint": "http://localhost:3001/sse",
    "version": "2024-11-05"
  }
]
```

#### B. El Catálogo de Herramientas (`mcp.tools`)
Cada herramienta se declara con su nombre, descripción humana y esquema de parámetros (`inputSchema`):
```json
"mcp": {
  "protocolVersion": "2024-11-05",
  "transport": {
    "type": "sse",
    "url": "http://localhost:3001/sse"
  },
  "tools": [
    {
      "name": "analyze_liquidity_pool",
      "description": "Analiza la profundidad de liquidez, slippage y reservas para pares en Uniswap v3 en Sepolia.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "pair": { "type": "string", "default": "WETH/USDC" },
          "dex": { "type": "string", "default": "UniswapV3" }
        }
      }
    },
    {
      "name": "verify_contract_safety",
      "description": "Auditoría estática rápida de seguridad on-chain para smart contracts en Sepolia.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "targetContract": { "type": "string" }
        },
        "required": ["targetContract"]
      }
    },
    {
      "name": "get_sepolia_token_metrics",
      "description": "Métricas cuantitativas y suministro de tokens ERC-20 en Sepolia.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "tokenAddress": { "type": "string" },
          "timeframe": { "type": "string", "enum": ["1h", "24h", "7d", "30d"] }
        },
        "required": ["tokenAddress"]
      }
    },
    {
      "name": "get_agent_passport",
      "description": "Consulta on-chain en tiempo real del pasaporte, identidad y dueño en 8004scan.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentId": { "type": "number", "default": 11287 }
        }
      }
    }
  ]
}
```

---

### 🚀 4. Cómo Servir la MCP (Infraestructura y Ejecución Real)

En este repositorio implementamos un **servidor MCP de grado de producción** en [`src/mcp/server.mjs`](./src/mcp/server.mjs) utilizando la librería oficial `@modelcontextprotocol/sdk`.

#### Modo 1: Servidor Web HTTP con Server-Sent Events (SSE)
Para servir herramientas en la red local o exponerlas públicamente a agentes en internet:
```bash
bun run serve:mcp
# o: node src/mcp/server.mjs
```
El servidor escucha en el puerto `3001` y expone:
- `GET /sse`: Abre el canal bidireccional Server-Sent Events (SSE) para clientes MCP.
- `POST /messages`: Procesa las peticiones del protocolo JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`).
- `GET /health`: Estado del servidor, tiempo activo y detalles del agente en Sepolia.
- `GET /tools`: Previsualización REST rápida para probar en el navegador.

#### Modo 2: Canal STDIO (Para Claude Desktop / Cursor / Antigravity)
Si deseas que tu propio Claude Desktop o Cursor utilice las herramientas financieras del agente directamente:
```bash
bun run serve:mcp:stdio
# o: node src/mcp/server.mjs --stdio
```

*Configuración para Claude Desktop (`claude_desktop_config.json`):*
```json
{
  "mcpServers": {
    "etherpulse-sepolia": {
      "command": "node",
      "args": ["/ruta/absoluta/a/Agents8004/src/mcp/server.mjs", "--stdio"],
      "env": {
        "SEPOLIA_RPC_URL": "https://ethereum-sepolia-rpc.publicnode.com"
      }
    }
  }
}
```

---

### 🧪 5. Cómo Inspeccionar y Probar el Servidor MCP

Para verificar que el servidor responde fielmente al estándar oficial, hemos creado un cliente de prueba automatizado:

1. **Abre una terminal y enciende el servidor:**
   ```bash
   bun run serve:mcp
   ```

2. **En otra terminal, ejecuta el cliente inspector:**
   ```bash
   bun run test:mcp
   ```

#### Lo que verás en pantalla:
```text
  ▸ Conectando al Servidor MCP: http://localhost:3001/sse
  ✔ Conexión SSE establecida con éxito!

1. Catálogo de Herramientas Descubiertas (tools/list):
  • analyze_liquidity_pool
    Analiza la profundidad de liquidez, impermanent loss y reservas en Uniswap v3 Sepolia.
  • verify_contract_safety
    Auditoría estática on-chain de seguridad para smart contracts en Sepolia.
  • get_sepolia_token_metrics
    Obtiene métricas cuantitativas y suministro de tokens ERC-20 en Sepolia.
  • get_agent_passport
    Consulta on-chain en tiempo real del pasaporte en 8004scan.

2. Invocando Herramienta 'analyze_liquidity_pool' (tools/call):
  ✔ Respuesta recibida del servidor:
    ▸ Par Analizado:   WETH/USDC
    ▸ TVL Estimado:    $51,726,810.7 USD
    ▸ Slippage ($50k): 0.045%
    ▸ Task Hash:       0xfe6093...

3. Invocando Herramienta 'get_agent_passport' (Consulta On-Chain a Sepolia):
  ✔ Pasaporte On-Chain resuelto exitosamente:
    ▸ Agent ID:        #11287
    ▸ Dueño Legal:     0x000000000000000000000000...
    ▸ Nombre On-Chain: EtherPulse Sepolia Analyst
    ▸ Formato:         On-Chain Base64 Data URI
    ▸ 8004scan Link:   https://8004scan.com/agent/11287

✔ VERIFICACIÓN COMPLETA: El Servidor MCP opera al 100% bajo el estándar oficial.
```

---

### 🤖 Nuestro Agente Oficial en Sepolia
- **Agent ID:** `#11287`
- **Ficha en Vivo en el Explorador:** [https://8004scan.com/agent/11287](https://8004scan.com/agent/11287)
- **Transacción de Metadata On-Chain:** [`0xa546c752b6c7f5a806e4e32a6950351d23b9e27d4d142708c9bc6b88b76cfe9f`](https://sepolia.etherscan.io/tx/0xa546c752b6c7f5a806e4e32a6950351d23b9e27d4d142708c9bc6b88b76cfe9f) (Bloque: 12071414)
- **Consulta en Vivo a Sepolia (0 gas):**
  ```bash
  bun run status_global
  ```

---

## ⚖️ Tabla Comparativa: Laboratorio Propio vs Red Global

| Aspecto | 🏛️ Laboratorio Propio (`demo.js`) | 🌍 Red Canónica Global (`8004scan`) |
| :--- | :--- | :--- |
| **Identidad** | Contrato `IdentityRegistry.sol` local | Proxy Canónico `0x8004A818...` (v2.0.0) |
| **Reputación** | Contrato `ReputationRegistry.sol` local | Proxy Canónico `0x8004B663...` |
| **Validación** | Contrato `ValidationRegistry.sol` (TEE SGX/zkML) | Módulos de validación por consenso / Staking |
| **Función de Registro** | `registerAgent(string agentURI, address opWallet)` | `register(string agentURI)` |
| **Explorador Público** | Consola local / Etherscan privado | [8004scan.com/agent/11287](https://8004scan.com/agent/11287) |
| **Almacenamiento Metadata** | IPFS o Base64 Data URI | **Data URI Base64 On-Chain** |
| **Casos de Uso** | Entornos bancarios, pruebas, lógica custom | Servicios abiertos, descubrimiento A2A global |

---

## 🎨 Presentación de Diapositivas Interactiva

Hemos preparado una presentación web moderna de **12 diapositivas interactivas** adaptada para formato de Clase Magistral / Taller Universitario:

```bash
bun run slides
```
Abre tu navegador en `http://localhost:3000` (o abre directamente [`slides/index.html`](./slides/index.html)).

### Contenido de las 12 Diapositivas:
1. **Portada & Objetivos:** Introducción al estándar ERC-8004 + MCP.
2. **El Problema:** La Paradoja de las IAs sin Identidad ni Reputación.
3. **La Tríada Arquitectónica:** Identity, Reputation y Validation Registries.
4. **Separación de Poderes:** Owner (Legal/DAO) vs Operational Hot Wallet.
5. **Reputación & Validación:** Candado `feedbackAuth` y Enclaves TEE / zkML.
6. **El Registro Global:** Cómo registrar un agente en el contrato canónico de 8004scan.
7. **El Secreto del Base64:** Diagnóstico del error `{}` en IPFS y solución Data URI on-chain.
8. **Cómo Conectar la MCP:** Definición de esquemas JSON, endpoints y herramientas en la Agent Card.
9. **Cómo Servir la MCP:** Arquitectura del servidor `src/mcp/server.mjs` (SSE y STDIO).
10. **Inspección en Vivo:** Verificación de herramientas con el cliente `test:mcp`.
11. **Laboratorio Privado:** Simulación end-to-end de 7 pasos (`demo.js`).
12. **Guía Práctica:** Arsenal de comandos organizados por bloques para los estudiantes.

---

## 📁 Estructura del Repositorio

```text
Agents8004/
├── contracts/                  # Smart Contracts Solidity (Ruta Laboratorio)
│   ├── IdentityRegistry.sol    # Registro de identidades NFT
│   ├── ReputationRegistry.sol  # Sistema de reputación con firmas ECDSA
│   └── ValidationRegistry.sol  # Registro de atestaciones TEE y zkML
├── src/                        # Código del Agente Autónomo & MCP
│   ├── Agent.js                # Clase principal del Agente (Orquestador MCP y Uniswap)
│   ├── ClientAgent.js          # Agente cliente que consume servicios y califica
│   ├── ValidatorNode.js        # Nodo auditor TEE / zkML
│   ├── agentCard.json          # Ficha del Agente (Single Source of Truth)
│   ├── mcp/
│   │   └── server.mjs          # Servidor MCP Oficial (Model Context Protocol SSE/STDIO)
│   └── utils/
│       └── agentCardUri.js     # Codificador/Decodificador Data URI Base64
├── scripts/                    # Scripts de Automatización en Sepolia
│   ├── register-global.js      # Registro en contrato canónico 0x8004A...
│   ├── update-card.js          # Actualización de metadata Base64 on-chain
│   ├── status-global.js        # Lector en tiempo real (0 gas) de 8004scan
│   ├── test-mcp-client.mjs     # Cliente inspector y verificador de herramientas MCP
│   ├── deploy.js               # Despliegue de contratos propios en Sepolia
│   └── check-balance.js        # Verificador de saldo y conexión RPC
├── slides/                     # Presentación Interactiva de la Clase
│   └── index.html              # 12 diapositivas interactivas para proyectar en clase
├── test/                       # 27 Tests Unitarios Automatizados
│   └── erc8004.test.js
├── docs/                       # Especificación Técnica Profunda
│   └── ERC-8004-SPEC-AND-GUIDE.md
├── demo.js                     # Demostración del Laboratorio Propio
├── package.json                # Scripts npm / bun
└── hardhat.config.js           # Configuración de compilador y red Sepolia
```

---

## 📜 Resumen de Comandos

| Comando | Acción |
| :--- | :--- |
| `bun run serve:mcp` | **Enciende el Servidor MCP en red (HTTP + SSE en puerto 3001).** |
| `bun run test:mcp` | **Ejecuta el cliente inspector que prueba las 4 herramientas MCP.** |
| `bun run serve:mcp:stdio` | Lanza el servidor MCP en modo STDIO para Claude Desktop o Cursor. |
| `bun run status_global` | Inspecciona el Agente Global #11287 en 8004scan (0 gas). |
| `bun run update_card` | Sube cambios en `src/agentCard.json` a la blockchain canónica. |
| `bun run registry_global` | Registra un nuevo agente en el contrato canónico global. |
| `bun test` | Ejecuta las 27 pruebas unitarias en Hardhat. |
| `bun start` | Ejecuta la simulación completa del laboratorio de 7 pasos. |
| `bun run check-balance` | Verifica tu saldo en Sepolia y direcciones de contratos. |
| `bun run deploy:own` | Despliega tus propios contratos ERC-8004 en Sepolia. |
| `bun run slides` | Lanza la presentación interactiva de 12 diapositivas. |

---

## 🛡️ Licencia
Distribuido bajo la Licencia **MIT**. Libre para usar, modificar y desplegar en redes de producción o pruebas.
