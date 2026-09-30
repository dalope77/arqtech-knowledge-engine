import { getServiceRoleClient } from '../lib/supabase';

async function run() {
  const supabase = getServiceRoleClient();
  let totalDeleted = 0;
  
  while (true) {
    const { data: ent } = await supabase.from('entities').select('id, name').like('name', 'Barrio %').limit(1000);
    if (!ent || ent.length === 0) break;
    
    const mocks = ent.filter(e => /^Barrio [A-F0-9]{16}$/i.test(e.name));
    if (mocks.length === 0) break; // no more mocks in this batch
    
    const ids = mocks.map(m => m.id);
    console.log(`Deleting batch of ${ids.length} mock barrios...`);
    
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      await supabase.from('relations').delete().in('from_entity_id', chunk);
      await supabase.from('relations').delete().in('to_entity_id', chunk);
      await supabase.from('observations').delete().in('subject_entity_id', chunk);
      await supabase.from('observations').delete().in('object_entity_id', chunk);
      await supabase.from('events').delete().in('entity_id', chunk);
      await supabase.from('real_world_events').delete().in('entity_id', chunk);
      await supabase.from('claims').delete().in('entity_id', chunk);
      await supabase.from('entities').delete().in('id', chunk);
      console.log(`  - Deleted chunk ${i} to ${i + chunk.length}`);
    }
    totalDeleted += ids.length;
  }
  
  console.log(`Done! Total deleted: ${totalDeleted}`);
}

run();
