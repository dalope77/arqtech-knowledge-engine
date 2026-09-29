import { getServiceRoleClient } from '../lib/supabase';
const mockData = require('../budgetMockData.ts');

async function ingestTypologies() {
  console.log('🤖 INGESTION_AGENT (Typologies) initializing...');
  const supabase = getServiceRoleClient();

  const typologies = mockData.MOCK_TYPOLOGIES || [];
  console.log(`Found ${typologies.length} Typologies. Preparing ingestion...`);

  const entities = typologies.map((t: any) => ({
    id: `TIPOLOGIA_${t.id}`,
    type: 'TIPOLOGIA_PROYECTO',
    name: t.name,
    external_id: t.slug,
    metadata: {
      description: t.description,
      development_type: t.development_type_id,
      color: t.color,
      icon: t.icon,
      source: 'budgetMockData'
    }
  }));

  if (entities.length > 0) {
    await supabase.from('entities').upsert(entities, { onConflict: 'id' });
    console.log(`✅ Ingested ${entities.length} TIPOLOGIA_PROYECTO entities.`);
  }

  const observations = typologies.map((t: any) => ({
    id: `OBS_TIPOLOGIA_${t.id}_RENDIMIENTO`,
    subject_entity_id: `TIPOLOGIA_${t.id}`,
    predicate: 'rendimiento_area_vendible',
    object_entity_id: null,
    value: t.sellable_area_pct,
    source: 'budgetMockData',
    confidence: 1.0,
    status: 'verified'
  }));

  if (observations.length > 0) {
    await supabase.from('observations').upsert(observations, { onConflict: 'id' });
    console.log(`✅ Ingested ${observations.length} Typology Observations.`);
  }

  // Log the run
  await supabase.from('agent_runs').insert({
    id: 'RUN_INGEST_TYPOLOGIES_' + Date.now(),
    agent_id: 'INGESTION_AGENT',
    objective: 'Ingesta de Tipologías de Proyecto (Residencial, Flipping, Loteos) y sus rendimientos.',
    status: 'success',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    output: { typologies: entities.length }
  });

  console.log('🎉 Typologies Ingestion Complete!');
}

ingestTypologies().catch(console.error);
