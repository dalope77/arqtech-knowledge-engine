import { getServiceRoleClient } from '../lib/supabase';

async function seedEvents() {
  const db = getServiceRoleClient();
  console.log('Generando eventos de trazabilidad retroactivos...');

  // Limpiar eventos existentes
  await db.from('events').delete().neq('id', 'uuid-invalido-para-borrar-todo'); 

  // Generar eventos de Entidades
  const { data: entities } = await db.from('entities').select('*');
  if (entities) {
    for (const entity of entities) {
      await db.from('events').insert({
        id: crypto.randomUUID(),
        actor_id: 'SYSTEM_INGESTION',
        event_type: 'discovered_entity',
        entity_id: entity.id,
        payload: { type: entity.type, name: entity.name },
        created_at: entity.created_at
      });
    }
  }

  // Generar eventos de Observaciones
  const { data: observations } = await db.from('observations').select('*');
  if (observations) {
    for (const obs of observations) {
      await db.from('events').insert({
        id: crypto.randomUUID(),
        actor_id: obs.agent_id || 'UNKNOWN_AGENT',
        event_type: 'created_observation',
        entity_id: obs.subject_entity_id,
        payload: { predicate: obs.predicate, value: obs.value },
        created_at: obs.created_at
      });
    }
  }

  // Generar eventos de Relaciones
  const { data: relations } = await db.from('relations').select('*');
  if (relations) {
    for (const rel of relations) {
      await db.from('events').insert({
        id: crypto.randomUUID(),
        actor_id: 'SYSTEM_ROUTER',
        event_type: 'created_relation',
        entity_id: rel.from_entity_id,
        payload: { relation_type: rel.relation_type, to: rel.to_entity_id },
        created_at: rel.created_at
      });
    }
  }

  console.log('✅ Eventos retroactivos generados con éxito.');
  process.exit(0);
}

seedEvents().catch(console.error);
