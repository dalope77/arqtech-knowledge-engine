import { VisualIngestionAgent } from '../lib/agents/visual_ingestion_agent';
import { AgentContext } from '../lib/agents/index';

async function runTest() {
  console.log('--- Iniciando Prueba del Ruteador Visual ---');
  
  const agent = new VisualIngestionAgent();
  
  const context: AgentContext = {
    runId: `test-run-${Date.now()}`,
    objective: 'Test visual ingestion routing',
    input: {
      imageUrl: 'https://storage.arqtech.com/docs/plano_municipal_1.jpg',
      documentId: 'doc_123',
      pageNumber: 1
    }
  };

  const result = await agent.execute(context);
  
  console.log('\n--- RESULTADO FINAL DE LA INGESTA ---');
  console.log(JSON.stringify(result.output, null, 2));
}

runTest().catch(console.error);
