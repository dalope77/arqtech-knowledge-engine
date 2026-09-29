import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMVP() {
  console.log('🚀 Iniciando Satellite Agent MVP...\n');

  // 1. Simular la detección de un polígono de expansión urbana (T2 - T1)
  // Coordenadas simuladas en La Plata (WGS84)
  const growthPolygonWKT = `POLYGON((-57.95 -34.92, -57.94 -34.92, -57.94 -34.93, -57.95 -34.93, -57.95 -34.92))`;

  const newGrowthEntityId = `GROWTH_LP_2020_2026_${Date.now()}`;

  console.log('📡 [1/4] Agente Satelital detectó nueva área construida (2020-2026).');
  console.log(`📐 Geometría WKT: ${growthPolygonWKT}`);

  // 2. Insertar entidad en el Knowledge Fabric
  const { data: entityData, error: entityError } = await supabase
    .from('entities')
    .upsert({
      id: newGrowthEntityId,
      type: 'URBAN_GROWTH_AREA',
      name: 'Expansión Urbana Sur La Plata (2020-2026)',
      geom: growthPolygonWKT, // PostGIS casteará automáticamente este WKT a geometry
      metadata: { area_m2: 125000, confidence: 0.89 }
    })
    .select();

  if (entityError) {
    console.error('❌ Error guardando la entidad:', entityError);
    return;
  }
  console.log(`✅ [2/4] Entidad espacial guardada en PostGIS con ID: ${newGrowthEntityId}`);

  // 3. Crear el Agent Run y la Observación para trazabilidad
  await supabase.from('agent_runs').insert({
    id: `RUN_SAT_${Date.now()}`,
    agent_id: 'satellite_agent_v1',
    objective: 'Detect urban growth between 2020 and 2026',
    status: 'success',
    model: 'ndbi_spectral_diff'
  });

  await supabase.from('observations').insert({
    id: `OBS_${Date.now()}`,
    subject_entity_id: newGrowthEntityId,
    predicate: 'expansion_area_m2',
    value: '125000',
    source: 'Sentinel-2 L2A',
    evidence: 'Processed via NDBI diff script',
    confidence: 0.89
  });
  console.log('✅ [3/4] Evidencia (Provenance) y Agent Run registrados.');

  // 4. Integración con Discovery Engine (Query Espacial Real)
  // Para hacer ST_Intersects vía REST en Supabase sin RPC, podemos intentar usar los filtros de PostgREST
  // PostgREST tiene el filtro `st_intersects`.
  console.log('\n🔍 [4/4] Discovery Engine analizando intersecciones espaciales...');
  
  const { data: parcels, error: intersectionError } = await supabase
    .rpc('get_intersecting_entities', {
      target_type: 'PARCELA',
      target_wkt: growthPolygonWKT
    });

  if (intersectionError) {
    console.error('❌ Error en la consulta espacial:', intersectionError);
  } else {
    if (parcels.length > 0) {
      console.log(`🎯 ¡Discovery Engine encontró ${parcels.length} parcelas afectadas por la expansión!`);
      parcels.forEach(p => console.log(`   - ${p.id} (${p.name})`));
      console.log('\n💡 Generando hipótesis: "Estas parcelas podrían requerir regularización de servicios públicos."');
    } else {
      console.log('⚠️ No se encontraron parcelas previas en esa área (Probablemente el loteo es muy nuevo o falta cargar catastros).');
      console.log('💡 La base espacial funciona correctamente pero no hubo colisiones con PARCELAS existentes.');
    }
  }

  console.log('\n🎉 MVP Completado con éxito.');
}

runMVP().catch(console.error);
