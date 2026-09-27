import { db } from '../lib/db';

async function ingestArticulado() {
  console.log('Simulating Deep Parsing of Ordenanza 12692/2025 (POT La Plata)...');

  const parentId = 'ORD_LP_12692_2025';

  const articulos = [
    {
      nro: 1,
      titulo: 'Aprobación del POT',
      contenido: 'Apruébase el Plan de Ordenamiento Territorial del Partido de La Plata (Fase 1).',
      zona: null
    },
    {
      nro: 12,
      titulo: 'Creación de Zonas Especiales',
      contenido: 'Créanse las zonas especiales de preservación patrimonial en el casco histórico.',
      zona: 'Casco Histórico'
    },
    {
      nro: 45,
      titulo: 'Indicadores Urbanísticos',
      contenido: 'Establécese para la Zona R3 un FOS de 0.6 y un FOT de 1.2.',
      zona: 'Zona R3'
    }
  ];

  for (const art of articulos) {
    const artId = `${parentId}_ART_${art.nro}`;
    
    // 1. Create Article Entity
    await db.createEntity({
      id: artId,
      type: 'NORMA_ARTICULO',
      name: `Artículo ${art.nro} - Ord 12692/25`,
      metadata: { titulo: art.titulo, ordenanza: '12692/2025' }
    });
    console.log(`Created Article: ${artId}`);

    // 2. Relation to Parent Ordinance
    await db.createRelation({
      id: `REL_${artId}_PARENT`,
      from_entity_id: artId,
      relation_type: 'pertenece_a',
      to_entity_id: parentId,
      metadata: {},
      confidence: 1.0
    });

    // 3. Observation for Content
    await db.createObservation({
      id: `OBS_${artId}_CONTENIDO`,
      subject_entity_id: artId,
      predicate: 'texto_legal',
      value: art.contenido,
      source: 'PDF_PARSER_AGENT',
      agent_id: 'LEGAL_AGENT',
      confidence: 1.0
    });

    // 4. Create semantic relations to zones if mentioned
    if (art.zona) {
      const zonaId = `ZONA_${art.zona.replace(/\s+/g, '_').toUpperCase()}`;
      
      // Ensure zone entity exists
      const existingZone = await db.getEntity(zonaId);
      if (!existingZone) {
        await db.createEntity({
          id: zonaId,
          type: 'ZONIFICACION',
          name: art.zona,
          metadata: { partido: 'La Plata' }
        });
      }

      await db.createRelation({
        id: `REL_${artId}_REGULA_${zonaId}`,
        from_entity_id: artId,
        relation_type: 'regula_zona',
        to_entity_id: zonaId,
        metadata: {},
        confidence: 0.95
      });
    }
  }

  console.log('✅ Deep Parsing ingestion complete!');
}

ingestArticulado().catch(console.error);
