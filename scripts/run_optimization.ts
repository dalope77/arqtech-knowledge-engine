import { OptimizationAgent } from '../lib/agents/optimization_agent';

async function main() {
  console.log('🚀 Iniciando OPTIMIZATION_AGENT para revisión de telemetría y propuestas rechazadas...');
  
  const agent = new OptimizationAgent();
  
  const runId = `run-opt-${Date.now()}`;
  
  const result = await agent.execute({
    runId,
    objective: 'Revisar métricas de fallo y generar propuesta de optimización de arquitectura/prompts.',
    input: {}
  });

  if (result.status === 'success') {
    console.log('\n✅ Análisis Completado.');
    console.log(result.output?.details || result.output?.conclusion);
    if (result.output?.artifact_id) {
      console.log(`\n📄 Reporte generado como Artifact: ${result.output.artifact_id}`);
    }
  } else {
    console.error('\n❌ Fallo en el análisis:', result.error);
  }
  
  process.exit(0);
}

main().catch(console.error);
