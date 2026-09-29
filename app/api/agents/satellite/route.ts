import { NextResponse } from 'next/server';
import { SatelliteAgent } from '@/lib/agents/satellite_agent';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { t1_url, t2_url, region_wkt, entity_id } = await req.json();

    if (!t1_url || !t2_url) {
      return NextResponse.json({ error: 'Faltan parámetros de imágenes.' }, { status: 400 });
    }

    let finalWkt = region_wkt;
    
    // Si se pasa un entity_id, buscamos su geometría exacta en la base de datos
    if (entity_id) {
      const supabase = getServiceRoleClient();
      const { data: wktData, error: wktError } = await supabase.rpc('get_entity_wkt', { p_id: entity_id });
      
      if (wktError || !wktData) {
        return NextResponse.json({ error: `No se pudo obtener la geometría del barrio ${entity_id}` }, { status: 404 });
      }
      finalWkt = wktData;
    }

    if (!finalWkt) {
      return NextResponse.json({ error: 'Se requiere region_wkt o entity_id.' }, { status: 400 });
    }

    const agent = new SatelliteAgent();
    const runId = `run-sat-${Date.now()}`;
    const result = await agent.execute({
      runId: runId,
      objective: 'Detect urban growth',
      input: {
        t1_url,
        t2_url,
        regionWKT: finalWkt
      }
    });

    if (result.status !== 'success') {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Opcional: Buscar parcelas afectadas inmediatamente
    const intersectingParcels = await agent.findIntersectingParcels(finalWkt);

    return NextResponse.json({ 
      success: true, 
      run_id: runId,
      entity_ids: result.output?.entity_ids,
      intersecting_parcels: intersectingParcels
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
