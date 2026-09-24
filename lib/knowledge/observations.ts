import { getServiceRoleClient, supabase } from '../supabase';
import { Observation } from '../../types';

export async function getObservationsForEntity(entityId: string): Promise<Observation[]> {
  const { data, error } = await supabase
    .from('observations')
    .select('*')
    .or(`subject_entity_id.eq.${entityId},object_entity_id.eq.${entityId}`);

  if (error) {
    console.error('Error fetching observations:', error);
    return [];
  }
  return data || [];
}

export async function createObservation(
  observationData: Partial<Observation> & { subject_entity_id: string; predicate: string }
): Promise<Observation | null> {
  const client = getServiceRoleClient();
  const { data, error } = await client
    .from('observations')
    .insert({
      ...observationData,
      status: observationData.status || 'active',
      confidence: observationData.confidence ?? 1.0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating observation:', error);
    return null;
  }
  return data;
}
