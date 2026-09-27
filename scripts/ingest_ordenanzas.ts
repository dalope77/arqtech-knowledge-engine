import { db } from '../lib/db';
import { Entity, Relation, Observation } from '../types';

async function ingestOrdenanzas() {
  console.log('Fetching data from Ordenanzas for La Plata...');
  const params = new URLSearchParams();
  params.append('draw', '1');
  params.append('start', '0');
  params.append('length', '100'); // Fetch enough records for La Plata
  params.append('partidoSearch', 'La Plata');
  params.append('contenidoSearch', '');

  const res = await fetch('https://urbasig.mgob.gba.gob.ar/ordenanzas/data.php', {
    method: 'POST',
    body: params,
  });

  const json = await res.json();
  const data = json.data;
  console.log(`Fetched ${data.length} records. Ingesting to Supabase...`);

  // Check and create Partido Entity
  const partidoId = `PARTIDO_LA_PLATA`;
  const existingPartido = await db.getEntity(partidoId);
  if (!existingPartido) {
    await db.createEntity({
      id: partidoId,
      type: 'LOCALIDAD',
      name: 'La Plata',
      metadata: { source: 'Ordenanzas' }
    });
    console.log(`Created new Locality: La Plata`);
  }

  // To avoid hammering DB, we'll process sequentially
  for (const row of data) {
    // some IDs might be null if not uniquely provided, so we fallback to nordenanza
    const rowId = row.id || row.nordenanza.replace(/[^a-zA-Z0-9]/g, '_');
    const id = `ORD_LP_${rowId}`; 
    const nombre = `Ordenanza ${row.nordenanza} - La Plata`;
    
    // Create Ordenanza Entity
    const existingOrd = await db.getEntity(id);
    if (!existingOrd) {
      await db.createEntity({
        id: id,
        type: 'NORMA',
        name: nombre,
        metadata: {
          nordenanza: row.nordenanza,
          anio_ord: row.anio_ord,
          decreto: row.decreto,
          anio_dec: row.anio_dec,
          pdf_ord: row.n_orde_pdf,
          pdf_dec: row.n_dec_pdf,
          etapa_alcanzada: row.etapa_alcanzada,
          source: 'Ordenanzas_DB'
        }
      });
      console.log(`Created new Entity: ${nombre} (${id})`);

      // Create relation to Partido
      await db.createRelation({
        id: `REL_ORD_LOC_${id}`,
        from_entity_id: id,
        relation_type: 'aplica_a',
        to_entity_id: partidoId,
        metadata: {},
        confidence: 1.0,
      });

      // Create observation for contenido
      if (row.contenido) {
        await db.createObservation({
          id: `OBS_ORD_CONT_${id}`,
          subject_entity_id: id,
          predicate: 'describe_contenido',
          value: row.contenido,
          source: 'Ordenanzas_DB',
          agent_id: 'SYSTEM_INGESTION',
          confidence: 1.0
        });
      }
      
      // Create observation for observacion
      if (row.observacion) {
        await db.createObservation({
          id: `OBS_ORD_OBS_${id}`,
          subject_entity_id: id,
          predicate: 'observaciones_norma',
          value: row.observacion,
          source: 'Ordenanzas_DB',
          agent_id: 'SYSTEM_INGESTION',
          confidence: 1.0
        });
      }
    }
  }

  console.log('✅ Ingestion complete!');
}

ingestOrdenanzas().catch(console.error);
