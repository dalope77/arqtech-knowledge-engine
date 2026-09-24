import { getServiceRoleClient, supabase } from '../supabase';
import { Relation } from '../../types';

export async function getRelationsForEntity(entityId: string): Promise<Relation[]> {
  const { data, error } = await supabase
    .from('relations')
    .select('*')
    .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);

  if (error) {
    console.error('Error fetching relations:', error);
    return [];
  }
  return data || [];
}

export async function createRelation(
  fromEntityId: string,
  relationType: string,
  toEntityId: string,
  sourceObservationId?: string,
  confidence: number = 1.0,
  metadata?: Record<string, any>
): Promise<Relation | null> {
  const client = getServiceRoleClient();
  const { data, error } = await client
    .from('relations')
    .insert({
      from_entity_id: fromEntityId,
      relation_type: relationType,
      to_entity_id: toEntityId,
      source_observation_id: sourceObservationId,
      confidence,
      metadata: metadata || {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating relation:', error);
    return null;
  }
  return data;
}
