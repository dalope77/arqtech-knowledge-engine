import { getServiceRoleClient } from '../supabase';
import { Event } from '../../types';

export async function logEvent(
  actorId: string,
  eventType: string,
  entityId?: string,
  payload?: Record<string, any>
): Promise<Event | null> {
  const client = getServiceRoleClient();
  const { data, error } = await client
    .from('events')
    .insert({
      actor_id: actorId,
      event_type: eventType,
      entity_id: entityId,
      payload: payload || {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging event:', error);
    return null;
  }
  return data;
}
