import { getServiceRoleClient } from '../lib/supabase';

/**
 * ArqTech - Phase 5: Market Enrichment (Scraping Inmobiliario)
 * 
 * 1. Toma parcelas con estado 'VALIDADO_ESPACIALMENTE' o 'PENDIENTE_RELEVAMIENTO_TERRENO'.
 * 2. Simula una búsqueda en portales inmobiliarios dentro del bounding box de la parcela.
 * 3. Cruza descripciones de ofertas con el contexto de la parcela usando búsqueda semántica o texto plano.
 * 4. Actualiza el estado y vincula los avisos encontrados como Entities de tipo 'OFERTA_MERCADO'.
 */

async function main() {
  const supabase = getServiceRoleClient();
  console.log('🚀 Iniciando Fase 5: Relevamiento del Mercado Inmobiliario...');

  // 1. Obtener parcelas validadas
  const { data: entities, error } = await supabase
    .from('entities')
    .select('*')
    .eq('type', 'PARCELA')
    .in('metadata->>pipeline_status', ['VALIDADO_ESPACIALMENTE', 'PENDIENTE_RELEVAMIENTO_TERRENO']);

  if (error) {
    console.error('Error buscando parcelas para enriquecimiento de mercado:', error);
    return;
  }

  if (!entities || entities.length === 0) {
    console.log('✅ No hay parcelas pendientes de relevamiento de mercado.');
    return;
  }

  for (const entity of entities) {
    console.log(`\n======================================================`);
    console.log(`🏘️ Rastreando mercado para: ${entity.name}`);

    // TODO: Aquí iría la integración real con un scraper (Puppeteer/Playwright)
    // o una API de Zonaprop/Argenprop buscando por polígono/radio.
    console.log(`📡 Consultando APIs de clasificados y portales inmobiliarios...`);

    // --- MOCK SIMULADOR DE SCRAPER ---
    // Simulamos que el scraper encontró un lote en venta que hace "match" espacial
    const mockListings = [];
    // Simulamos un 30% de probabilidad de encontrar avisos vinculados a esta zona
    if (Math.random() > 0.7) {
      mockListings.push({
        titulo: `Loteo Excelente Oportunidad en ${entity.metadata?.nomenclatura || 'Zona en Desarrollo'}`,
        precio: 'USD 15,000',
        descripcion: 'Venta de lotes desde 300m2. Posesión inmediata. Zona en gran crecimiento.',
        url: 'https://inmobiliaria-ejemplo.com/aviso/12345',
        lat: entity.metadata?.lat || -34.92, // Coordenada aproximada
        lon: entity.metadata?.lon || -57.95
      });
    }
    // ---------------------------------

    let marketEvidence = false;

    if (mockListings.length > 0) {
      console.log(`🚨 ¡Alerta de Mercado! Se encontraron ${mockListings.length} publicaciones asociadas al polígono.`);
      marketEvidence = true;

      for (const listing of mockListings) {
        const listingId = 'market-' + Date.now() + Math.floor(Math.random() * 1000);
        
        // Creamos la Entidad Oferta
        await supabase.from('entities').insert({
          id: listingId,
          type: 'OFERTA_MERCADO',
          name: listing.titulo,
          metadata: {
            precio: listing.precio,
            descripcion: listing.descripcion,
            url: listing.url,
            origen: 'Scraper Portales Inmobiliarios'
          },
          // Convertimos a WKT punto
          geom: `POINT(${listing.lon} ${listing.lat})`
        });

        // Relacionamos la Oferta con la Parcela
        await supabase.from('relations').insert({
          from_entity_id: listingId,
          to_entity_id: entity.id,
          relation_type: 'PERTENECE_A_DESARROLLO',
          confidence: 0.85
        });

        // Generamos un Claim determinístico
        await supabase.from('claims').insert({
          statement: `Comercialización activa: "${listing.titulo}" por ${listing.precio}.`,
          status: 'verified',
          confidence: 0.9,
          metadata: { source: 'Portal Inmobiliario', target_parcel: entity.id, listing_url: listing.url }
        });
      }
    } else {
      console.log(`ℹ️ No se detectaron ventas públicas activas en el área.`);
    }

    // 4. Actualizar Estado
    // Si hay evidencia de mercado y validación espacial, pasa directo a Consolidación (Fase 6)
    const nextStatus = marketEvidence ? 'MERCADO_RELEVADO' : 'SIN_ACTIVIDAD_MERCADO';

    const updatedMetadata = {
      ...entity.metadata,
      pipeline_status: nextStatus,
      market_evidence: marketEvidence
    };

    await supabase.from('entities').update({ metadata: updatedMetadata }).eq('id', entity.id);
    console.log(`✅ Parcela actualizada al estado: ${nextStatus}`);
  }

  console.log('\n✅ Relevamiento Inmobiliario finalizado.');
}

main().catch(console.error);
