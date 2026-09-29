"use server";

import { getServiceRoleClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function deleteEntity(entityId: string) {
  const supabase = getServiceRoleClient();
  
  // Borramos la entidad
  const { error } = await supabase
    .from('entities')
    .delete()
    .eq('id', entityId);

  if (error) {
    throw new Error(error.message);
  }

  // Borramos relaciones asociadas para mantener consistencia
  await supabase
    .from('relations')
    .delete()
    .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);

  revalidatePath('/dashboard/entities');
  revalidatePath('/dashboard/explorer');
}
