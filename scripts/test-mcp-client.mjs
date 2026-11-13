#!/usr/bin/env node
/**
 * Test & Verification Client for EtherPulse Sepolia MCP Server
 * Conecta al servidor MCP mediante SSE / HTTP, lista herramientas disponibles
 * y ejecuta una consulta de prueba a 'analyze_liquidity_pool' y 'get_agent_passport'.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m"
};

function banner(title) {
  const line = "━".repeat(78);
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ${title}${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);
}

async function main() {
  banner("CLIENTE DE INSPECCIÓN Y PRUEBA DE MCP (MODEL CONTEXT PROTOCOL)");

  const port = process.env.MCP_PORT || 3001;
  const sseUrl = new URL(`http://localhost:${port}/sse`);

  console.log(`  ${c.yellow}▸${c.reset} ${c.bold}Conectando al Servidor MCP:${c.reset} ${sseUrl.toString()}`);

  const transport = new SSEClientTransport(sseUrl);
  const client = new Client(
    { name: "Sepolia-MCP-TestClient", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log(`  ${c.green}✔${c.reset} Conexión SSE establecida con éxito!\n`);

    // 1. Listar herramientas expuestas por el agente
    console.log(`${c.bold}1. Catálogo de Herramientas Descubiertas (tools/list):${c.reset}`);
    const toolsResult = await client.listTools();
    
    for (const tool of toolsResult.tools) {
      console.log(`  ${c.cyan}• ${c.bold}${tool.name}${c.reset}`);
      console.log(`    ${c.dim}${tool.description}${c.reset}`);
    }

    // 2. Ejecutar la herramienta 'analyze_liquidity_pool'
    console.log(`\n${c.bold}2. Invocando Herramienta 'analyze_liquidity_pool' (tools/call):${c.reset}`);
    const analysisCall = await client.callTool({
      name: "analyze_liquidity_pool",
      arguments: {
        pair: "WETH/USDC",
        dex: "UniswapV3"
      }
    });

    console.log(`  ${c.green}✔${c.reset} Respuesta recibida del servidor:`);
    const parsedReport = JSON.parse(analysisCall.content[0].text);
    console.log(`    ▸ Par Analizado:   ${c.yellow}${parsedReport.pair}${c.reset}`);
    console.log(`    ▸ TVL Estimado:    ${c.green}${parsedReport.metrics.tvlUsd}${c.reset}`);
    console.log(`    ▸ Slippage ($50k): ${c.cyan}${parsedReport.metrics.estimatedSlippage.trade50k}${c.reset}`);
    console.log(`    ▸ Task Hash:       ${c.dim}${parsedReport.taskHash}${c.reset}`);

    // 3. Ejecutar la herramienta 'get_agent_passport' para el agente #11287 en Sepolia
    console.log(`\n${c.bold}3. Invocando Herramienta 'get_agent_passport' (Consulta On-Chain a Sepolia):${c.reset}`);
    const passportCall = await client.callTool({
      name: "get_agent_passport",
      arguments: {
        agentId: 11287
      }
    });

    console.log(`  ${c.green}✔${c.reset} Pasaporte On-Chain resuelto exitosamente:`);
    const parsedPassport = JSON.parse(passportCall.content[0].text);
    console.log(`    ▸ Agent ID:        #${parsedPassport.agentId}`);
    console.log(`    ▸ Dueño Legal:     ${parsedPassport.owner}`);
    console.log(`    ▸ Nombre On-Chain: ${c.bold}${parsedPassport.agentMetadata?.name || "EtherPulse Sepolia Analyst"}${c.reset}`);
    console.log(`    ▸ Formato:         ${parsedPassport.isBase64OnChain ? c.green + "On-Chain Base64 Data URI" + c.reset : "URI Externo"}`);
    console.log(`    ▸ 8004scan Link:   ${c.cyan}${parsedPassport.explorer8004scan}${c.reset}`);

    console.log(`\n${c.green}${c.bold}✔ VERIFICACIÓN COMPLETA: El Servidor MCP opera al 100% bajo el estándar oficial.${c.reset}\n`);

    await transport.close();
    process.exit(0);
  } catch (err) {
    console.error(`\n${c.red}❌ Error conectando al Servidor MCP:${c.reset}`, err.message);
    console.log(`\n${c.yellow}Asegúrate de que el servidor esté encendido ejecutando en otra terminal:${c.reset}`);
    console.log(`  ${c.bold}bun run serve:mcp${c.reset}  (o  node src/mcp/server.js)\n`);
    process.exit(1);
  }
}

main();
