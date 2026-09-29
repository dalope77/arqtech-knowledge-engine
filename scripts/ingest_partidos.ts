import fs from 'fs';
import { getServiceRoleClient } from '../lib/supabase';

async function ingestPartidos() {
  console.log('🤖 INGESTION_AGENT initializing...');
  const supabase = getServiceRoleClient();

  const filePath = 'C:/00_Web/arqtech2/arqtech/partidos_arba.json';
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const partidos = JSON.parse(rawData);

  console.log(`Found ${partidos.length} Partidos (ARBA). Preparing bulk ingestion...`);

  const entities = partidos.map((p: any) => ({
    id: `PARTIDO_ARBA_${p.code}`,
    type: 'PARTIDO',
    name: p.name,
    external_id: p.code,
    metadata: {
      slug: p.slug,
      source: 'partidos_arba.json',
      arba_code: p.code
    }
  }));

  // Bulk Insert
  const { error } = await supabase.from('entities').upsert(entities, { onConflict: 'id' });

  if (error) {
    console.error('Failed to ingest partidos:', error);
  } else {
    console.log(`✅ Ingested ${entities.length} PARTIDO entities successfully.`);

    // Log the run
    await supabase.from('agent_runs').insert({
      id: 'RUN_INGEST_PARTIDOS_' + Date.now(),
      agent_id: 'INGESTION_AGENT',
      objective: 'Ingesta del listado oficial de Partidos (ARBA) como Entidades Geopolíticas.',
      status: 'success',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      output: { entities_created: entities.length }
    });
  }
}

ingestPartidos().catch(console.error);
