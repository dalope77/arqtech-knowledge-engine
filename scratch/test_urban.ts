import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { UrbanAgent } from '../lib/agents/urban_agent';

async function testUrban() {
  const agent = new UrbanAgent();
  const res = await agent.execute({
    runId: 'test-urban',
    objective: 'Test WFS nomenclature',
    input: { query: 'partido 55 y partida 123' }
  });
  console.log(JSON.stringify(res, null, 2));
}
testUrban();
