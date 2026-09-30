import { getServiceRoleClient } from '../lib/supabase';

async function run() {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.from('entities').select('id, name').eq('type', 'BARRIO_CERRADO');
  if (error) {
    console.error(error);
    return;
  }
  
  const toUpdate = data?.filter(d => /^\d{4}$/.test(d.name.trim())) || [];
  console.log(`Found ${toUpdate.length} entities to update...`);
  
  let count = 0;
  for(const ent of toUpdate) {
    const { error: updErr } = await supabase.from('entities').update({ type: 'URBAN_GROWTH_AREA' }).eq('id', ent.id);
    if (updErr) {
      console.error(`Error updating ${ent.id}:`, updErr);
    } else {
      count++;
    }
  }
  
  console.log(`Done updating! ${count} entities successfully changed to URBAN_GROWTH_AREA.`);
}

run();
