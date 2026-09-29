import { getServiceRoleClient } from '../lib/supabase';

// Haversine distance in kilometers
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

async function runMarketAgent() {
  console.log('🤖 MARKET_AGENT initializing...');
  const supabase = getServiceRoleClient();

  // 1. Fetch all Barrios
  console.log('Fetching Barrios...');
  let barrios: any[] = [];
  let pageB = 0;
  let hasMoreB = true;

  while (hasMoreB) {
    const { data: chunkB, error: errBarrios } = await supabase
      .from('entities')
      .select('*')
      .eq('type', 'BARRIO')
      .range(pageB * 1000, (pageB + 1) * 1000 - 1);

    if (errBarrios) {
      console.error('Failed to fetch Barrios', errBarrios);
      break;
    }

    if (chunkB && chunkB.length > 0) {
      barrios = barrios.concat(chunkB);
      pageB++;
    } else {
      hasMoreB = false;
    }
  }

  // 2. Fetch all Inmuebles
  console.log('Fetching Inmuebles...');
  let inmuebles: any[] = [];
  let page = 0;
  let pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: chunk, error: errInmuebles } = await supabase
      .from('entities')
      .select('*')
      .eq('type', 'INMUEBLE')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (errInmuebles) {
      console.error('Failed to fetch Inmuebles', errInmuebles);
      break;
    }
    
    if (chunk && chunk.length > 0) {
      inmuebles = inmuebles.concat(chunk);
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Analyzing ${barrios.length} Barrios against ${inmuebles.length} Inmuebles...`);

  // Filter valid inmuebles with coordinates
  const validInmuebles = inmuebles.filter(i => i.metadata && i.metadata.lat && i.metadata.lon);

  const observationsToInsert = [];
  let processedBarrios = 0;

  for (const barrio of barrios) {
    if (!barrio.metadata || !barrio.metadata.lat || !barrio.metadata.lon) continue;

    const bLat = parseFloat(barrio.metadata.lat);
    const bLon = parseFloat(barrio.metadata.lon);

    // Find inmuebles within 1.5 km radius
    const nearbyInmuebles = validInmuebles.filter(i => {
      const iLat = parseFloat(i.metadata.lat);
      const iLon = parseFloat(i.metadata.lon);
      const dist = getDistanceFromLatLonInKm(bLat, bLon, iLat, iLon);
      return dist <= 1.5;
    });

    if (nearbyInmuebles.length > 0) {
      // Calculate metrics
      const prices = nearbyInmuebles
        .map(i => parseFloat(i.metadata.precio))
        .filter(p => !isNaN(p) && p > 0);

      if (prices.length > 0) {
        const sum = prices.reduce((a, b) => a + b, 0);
        const avg = sum / prices.length;
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        const marketData = {
          radio_analisis_km: 1.5,
          cantidad_inmuebles: nearbyInmuebles.length,
          inmuebles_con_precio: prices.length,
          precio_promedio_usd: Math.round(avg),
          precio_min_usd: min,
          precio_max_usd: max
        };

        observationsToInsert.push({
          id: `OBS_MARKET_${barrio.id}`,
          subject_entity_id: barrio.id,
          predicate: 'estimacion_mercado',
          value: JSON.stringify(marketData),
          source: 'MARKET_AGENT_ANALYSIS',
          agent_id: 'MARKET_AGENT',
          confidence: 0.85,
          status: 'active'
        });
        processedBarrios++;
      }
    }
  }

  console.log(`Generated market estimates for ${processedBarrios} barrios. Inserting observations...`);

  // Bulk insert observations in chunks
  let obsBatch = [];
  for (const obs of observationsToInsert) {
    obsBatch.push(obs);
    if (obsBatch.length >= 500) {
      await supabase.from('observations').upsert(obsBatch, { onConflict: 'id' });
      obsBatch = [];
    }
  }
  if (obsBatch.length > 0) {
    await supabase.from('observations').upsert(obsBatch, { onConflict: 'id' });
  }

  // Record a success run
  await supabase.from('agent_runs').insert({
    id: 'RUN_MARKET_SUCCESS_' + Date.now(),
    agent_id: 'MARKET_AGENT',
    objective: `Estimación de precios de mercado completada para ${processedBarrios} barrios.`,
    status: 'success',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    output: { barrios_analizados: processedBarrios, total_observaciones: observationsToInsert.length }
  });

  console.log('✅ MARKET_AGENT analysis complete!');
}

runMarketAgent().catch(console.error);
