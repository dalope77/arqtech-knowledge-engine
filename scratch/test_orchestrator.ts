import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { OrchestratorAgent } from '../lib/agents/orchestrator_agent';

async function testOrchestrator() {
  const orchestrator = new OrchestratorAgent();
  
  console.log("Testing Orchestrator with nomenclature...");
  const res = await orchestrator.execute({
    runId: 'test-run-123',
    objective: 'Test WFS nomenclature routing',
    input: { query: 'Quiero construir en el partido 55 y partida 123. Qué FOS y FOT tiene y qué recomiendas?' }
  });
  
  console.log("\n--- RESULT ---");
  console.log(JSON.stringify(res, null, 2));
}

testOrchestrator();
