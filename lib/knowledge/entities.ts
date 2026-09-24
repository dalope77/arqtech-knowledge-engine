import { supabase, getServiceRoleClient } from '../supabase';
import { Entity, EntityType } from '../../types';

export async function getEntity(id: string): Promise<Entity | null> {
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching entity:', error);
    return null;
  }
  return data;
}

export async function createEntity(
  type: EntityType,
  name: string,
  external_id?: string,
  metadata?: Record<string, any>
): Promise<Entity | null> {
  const client = getServiceRoleClient();
  const { data, error } = await client
    .from('entities')
    .insert({
      type,
      name,
      external_id,
      metadata: metadata || {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating entity:', error);
    return null;
  }
  return data;
}

export async function updateEntity(
  id: string,
  updates: Partial<Entity>
): Promise<Entity | null> {
  const client = getServiceRoleClient();
  const { data, error } = await client
    .from('entities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating entity:', error);
    return null;
  }
  return data;
}
