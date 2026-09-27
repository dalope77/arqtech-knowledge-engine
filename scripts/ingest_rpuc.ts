import { db } from '../lib/db';
import { Entity, Relation, Observation } from '../types';

async function ingestRPUC() {
  console.log('Fetching data from RPUC...');
  const params = new URLSearchParams();
  params.append('draw', '1');
  params.append('start', '0');
  params.append('length', '440'); // Fetch all 440 records
  params.append('partidoSearch', '');
  params.append('nomemprenSearch', '');

  const res = await fetch('https://urbasig.mgob.gba.gob.ar/rpuc/data.php', {
    method: 'POST',
    body: params,
  });

  const json = await res.json();
  const data = json.data;
  console.log(`Fetched ${data.length} records. Ingesting to Supabase...`);

  // To avoid hammering DB, we'll process sequentially
  for (const row of data) {
    const id = `URB_${row.name}`; // e.g. 11-1
    const nombre = row.nom_empren;
    const partido = row.partido;
    const tipo = row.tipo;
    
    // Create or check Partido Entity
    const partidoId = `PARTIDO_${partido.replace(/\s+/g, '_').toUpperCase()}`;
    const existingPartido = await db.getEntity(partidoId);
    if (!existingPartido) {
      await db.createEntity({
        id: partidoId,
        type: 'LOCALIDAD',
        name: partido,
        metadata: { source: 'RPUC' }
      });
      console.log(`Created new Locality: ${partido}`);
    }

    // Create Urbanizacion Entity
    const existingUrb = await db.getEntity(id);
    if (!existingUrb) {
      await db.createEntity({
        id: id,
        type: 'PROYECTO',
        name: nombre,
        metadata: {
          expediente: row.expte,
          resolucion: row.n_resoluci,
          fecha_reg: row.fecha_reg,
          pdf: row.pdf,
          source: 'RPUC'
        }
      });
      console.log(`Created new Entity: ${nombre} (${id})`);

      // Create relation to Partido
      await db.createRelation({
        id: `REL_LOC_${id}`,
        from_entity_id: id,
        relation_type: 'pertenece_a',
        to_entity_id: partidoId,
        metadata: {},
        confidence: 1.0,
      });

      // Create observation for file (expediente)
      await db.createObservation({
        id: `OBS_EXP_${id}`,
        subject_entity_id: id,
        predicate: 'aprobado_por_expediente',
        value: row.expte,
        source: 'RPUC_DB',
        agent_id: 'SYSTEM_INGESTION',
        confidence: 1.0
      });
      
      // Create observation for resolution
      if (row.n_resoluci) {
        await db.createObservation({
          id: `OBS_RES_${id}`,
          subject_entity_id: id,
          predicate: 'regulada_por_resolucion',
          value: row.n_resoluci,
          source: 'RPUC_DB',
          agent_id: 'SYSTEM_INGESTION',
          confidence: 1.0
        });
      }
    }
  }

  console.log('✅ Ingestion complete!');
}

ingestRPUC().catch(console.error);
