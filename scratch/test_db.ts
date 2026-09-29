import { supabase } from '../lib/supabase';

async function test() {
  const { data, error } = await supabase.from('agents').select('*');
  console.log("DATA:", data);
  console.log("ERROR:", JSON.stringify(error, null, 2));
}
test();
