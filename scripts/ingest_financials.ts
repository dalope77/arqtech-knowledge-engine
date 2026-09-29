import { getServiceRoleClient } from '../lib/supabase';
// Using require to bypass TS module resolution for the commonjs mock file
const mockData = require('../budgetMockData.ts');

async function ingestFinancials() {
  console.log('🤖 INGESTION_AGENT (Financial) initializing...');
  const supabase = getServiceRoleClient();

  const rubros = mockData.MOCK_RUBROS || [];
  const items = mockData.MOCK_ITEMS || [];
  const insumos = mockData.MOCK_INSUMOS || [];

  console.log(`Found ${rubros.length} Rubros, ${items.length} Items, and ${insumos.length} Insumos. Preparing ingestion...`);

  // 1. Ingest RUBROS
  const rubroEntities = rubros.map((r: any) => ({
    id: `RUBRO_${r.id}`,
    type: 'RUBRO_CONSTRUCCION',
    name: r.name,
    external_id: r.code,
    metadata: {
      order_index: r.order_index,
      source: 'budgetMockData'
    }
  }));

  if (rubroEntities.length > 0) {
    await supabase.from('entities').upsert(rubroEntities, { onConflict: 'id' });
    console.log(`✅ Ingested ${rubroEntities.length} RUBRO entities.`);
  }

  // 2. Ingest ITEMS
  const itemEntities = items.map((i: any) => ({
    id: `ITEM_${i.id}`,
    type: 'ITEM_CONSTRUCCION',
    name: i.description,
    external_id: i.code,
    metadata: {
      unit: i.unit,
      order_index: i.order_index,
      development_types: i.development_types || [],
      source: 'budgetMockData'
    }
  }));

  if (itemEntities.length > 0) {
    await supabase.from('entities').upsert(itemEntities, { onConflict: 'id' });
    console.log(`✅ Ingested ${itemEntities.length} ITEM entities.`);
  }

  // 3. Create Relations (ITEM -> pertenece_a -> RUBRO)
  const relations = items.map((i: any) => ({
    id: `REL_ITEM_${i.id}_RUBRO_${i.rubro_id}`,
    from_entity_id: `ITEM_${i.id}`,
    relation_type: 'pertenece_a_rubro',
    to_entity_id: `RUBRO_${i.rubro_id}`,
    confidence: 1.0,
    metadata: { source: 'budgetMockData' }
  }));

  if (relations.length > 0) {
    await supabase.from('relations').upsert(relations, { onConflict: 'id' });
    console.log(`✅ Ingested ${relations.length} ITEM->RUBRO relations.`);
  }

  // 4. Ingest Insumos as Observations on the Items
  const observations = insumos.map((ins: any) => ({
    id: `OBS_INSUMO_${ins.id}`,
    subject_entity_id: `ITEM_${ins.item_id}`,
    predicate: `costo_${ins.type}`,
    object_entity_id: null,
    value: {
      unit_price: ins.unit_price,
      unit: ins.unit,
      yield: ins.yield,
      description: ins.description
    },
    source: 'budgetMockData',
    confidence: 1.0,
    status: 'verified'
  }));

  if (observations.length > 0) {
    await supabase.from('observations').upsert(observations, { onConflict: 'id' });
    console.log(`✅ Ingested ${observations.length} Insumo Observations.`);
  }

  // Log the run
  await supabase.from('agent_runs').insert({
    id: 'RUN_INGEST_FINANCIALS_' + Date.now(),
    agent_id: 'INGESTION_AGENT',
    objective: 'Ingesta de datos de Presupuesto (Rubros, Ítems, Insumos) como entidades financieras.',
    status: 'success',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    output: { 
      rubros: rubroEntities.length,
      items: itemEntities.length,
      observations: observations.length
    }
  });

  console.log('🎉 Financial Ingestion Complete!');
}

ingestFinancials().catch(console.error);
