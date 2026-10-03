import { getServiceRoleClient } from '../lib/supabase';

/**
 * ArqTech - Phase 3 & 4: Spatial Validation (OSM & Internal DB)
 * 
 * 1. Toma las parcelas con estado 'CONTEXTO_GENERADO'.
 * 2. Verifica si la parcela se superpone espacialmente con otras entidades (ej. RENABAP).
 * 3. Consulta la infraestructura cercana en OpenStreetMap (Overpass API).
 * 4. Genera Claims/Observations determinísticamente y actualiza el estado.
 */

async function main() {
  const supabase = getServiceRoleClient();
  console.log('🚀 Iniciando Fase 3/4: Validación Espacial y Documental...');

  // 1. Obtener parcelas listas para validación espacial
  const { data: entities, error } = await supabase
    .from('entities')
    .select('*')
    .eq('type', 'PARCELA')
    .contains('metadata', { pipeline_status: 'CONTEXTO_GENERADO' });

  if (error) {
    console.error('Error buscando parcelas:', error);
    return;
  }

  if (!entities || entities.length === 0) {
    console.log('✅ No hay parcelas pendientes de validación espacial.');
    return;
  }

  for (const entity of entities) {
    console.log(`\n======================================================`);
    console.log(`🔎 Validando parcela: ${entity.name}`);

    // Necesitamos el BBOX o el punto para buscar en OSM / DB
    const wkt = entity.geom;
    if (!wkt) {
      console.log(`⚠️ La entidad ${entity.id} no tiene geometría (WKT). Saltando...`);
      continue;
    }

    // 2. Validación Interna: Intersección con Entidades Previas (ej. Barrios populares)
    // Asumiendo que usamos la RPC 'get_entities_in_bbox' o una query espacial directa
    console.log(`📡 Consultando base de datos interna para evitar duplicados o detectar solapamientos...`);
    let hasRenabapOverlap = false;

    try {
      // Simplificación para el script: Buscamos si existe alguna otra entidad que intercepte 
      // usando PostGIS (st_intersects) en una llamada RPC o directamente
      const { data: overlaps, error: overlapError } = await supabase
        .rpc('get_intersecting_entities', { target_wkt: wkt });
      
      if (!overlapError && overlaps && overlaps.length > 0) {
        const renabap = overlaps.find((o: any) => o.type === 'RENABAP' || o.type === 'BARRIO_POPULAR');
        if (renabap) {
          console.log(`🚨 Solapamiento detectado con Registro Histórico (RENABAP): ${renabap.name}`);
          hasRenabapOverlap = true;
          
          // Crear Relation determinística
          await supabase.from('relations').insert({
            from_entity_id: entity.id,
            to_entity_id: renabap.id,
            relation_type: 'SOLAPA_CON',
            confidence: 1.0
          });
        }
      }
    } catch (e) {
      console.log(`⚠️ Función get_intersecting_entities no disponible o falló. Asumiendo no solapamiento interno.`);
    }

    // 3. Validación Externa: OpenStreetMap (Infraestructura)
    console.log(`🌍 Consultando infraestructura cercana en OpenStreetMap...`);
    
    // Obtenemos un bounding box a partir de la geometría para Overpass API
    let lons: number[] = [];
    let lats: number[] = [];

    try {
      const geom = typeof wkt === 'string' ? JSON.parse(wkt) : wkt;
      // Navegar por las coordenadas según sea Polygon o MultiPolygon
      let coordsList = [];
      if (geom.type === 'Polygon') coordsList = geom.coordinates[0];
      else if (geom.type === 'MultiPolygon') coordsList = geom.coordinates[0][0];

      lons = coordsList.map((c: any) => Number(c[0]));
      lats = coordsList.map((c: any) => Number(c[1]));
    } catch (e) {
      console.warn(`⚠️ No se pudo procesar la geometría para OSM. Saltando...`);
      continue;
    }

    if (lons.length === 0 || lats.length === 0) continue;

    // Bounding Box (Sur, Oeste, Norte, Este)
    const s = Math.min(...lats);
    const n = Math.max(...lats);
    const w = Math.min(...lons);
    const e = Math.max(...lons);
    const bbox = `${s},${w},${n},${e}`;

    const overpassQuery = `
      [out:json][timeout:25];
      (
        way["power"="line"](${bbox});
        way["highway"](${bbox});
        node["amenity"](${bbox});
      );
      out body;
      >;
      out skel qt;
    `;

    let infrastructureFound = false;
    try {
      const osmRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const ways = osmData.elements.filter((e: any) => e.type === 'way');
        if (ways.length > 0) {
          console.log(`✅ Infraestructura detectada en OSM: ${ways.length} elementos (caminos/tendido eléctrico).`);
          infrastructureFound = true;

          // Guardar Claim determinístico
          await supabase.from('claims').insert({
            statement: `La parcela presenta ${ways.length} infraestructuras mapeadas en OSM.`,
            status: 'verified',
            confidence: 1.0,
            metadata: { source: 'OpenStreetMap', target_parcel: entity.id }
          });
        } else {
          console.log(`ℹ️ No se detectó infraestructura formal en OSM para el polígono.`);
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ Error conectando a OSM:`, err.message);
    }

    // 4. Actualizar Estado de la Parcela
    const nextStatus = (hasRenabapOverlap || infrastructureFound) 
      ? 'VALIDADO_ESPACIALMENTE' 
      : 'PENDIENTE_RELEVAMIENTO_TERRENO';

    const updatedMetadata = {
      ...entity.metadata,
      pipeline_status: nextStatus,
      osm_infrastructure: infrastructureFound,
      renabap_overlap: hasRenabapOverlap
    };

    await supabase.from('entities').update({ metadata: updatedMetadata }).eq('id', entity.id);
    console.log(`✅ Parcela actualizada al estado: ${nextStatus}`);
  }

  console.log('\n✅ Validación Espacial finalizada.');
}

main().catch(console.error);
