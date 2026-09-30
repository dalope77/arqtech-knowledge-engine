"use server";

import { getServiceRoleClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function deleteEntity(entityId: string) {
  const supabase = getServiceRoleClient();
  
  // 1. Borramos relaciones asociadas
  await supabase.from('relations').delete().or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
  
  // 2. Borramos observaciones asociadas
  await supabase.from('observations').delete().eq('subject_entity_id', entityId);
  await supabase.from('observations').delete().eq('object_entity_id', entityId);

  // 3. Borramos eventos y claims
  await supabase.from('events').delete().eq('entity_id', entityId);
  await supabase.from('real_world_events').delete().eq('entity_id', entityId);
  await supabase.from('claims').delete().eq('entity_id', entityId);

  // 4. Borramos la entidad principal
  const { error } = await supabase
    .from('entities')
    .delete()
    .eq('id', entityId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/entities');
  revalidatePath('/dashboard/explorer');
}
