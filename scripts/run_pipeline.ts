import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runPhase(name: string, scriptPath: string) {
  console.log(`\n======================================================`);
  console.log(`⏳ INICIANDO: ${name}`);
  try {
    const { stdout, stderr } = await execAsync(`npx tsx --env-file=.env.local ${scriptPath}`);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (e: any) {
    console.error(`❌ Error en ${name}:`, e.message);
  }
}

async function main() {
  console.log('🚀 === ORQUESTADOR DEL PIPELINE INICIADO === 🚀');
  await runPhase('Fase 2: Generación de Contexto (LLM)', 'scripts/generate_context.ts');
  await runPhase('Fases 3 y 4: Validación Espacial y OSM', 'scripts/validate_spatial.ts');
  await runPhase('Fase 5: Relevamiento de Mercado Inmobiliario', 'scripts/market_enrichment.ts');
  await runPhase('Fases 6 y 7: Consolidación y Línea de Tiempo', 'scripts/consolidate_pipeline.ts');
  console.log('\n✅ === PIPELINE FINALIZADO === ✅');
}

main().catch(console.error);
