import { createClient } from '@supabase/supabase-js';

const url = 'https://qrkntouvuyumvnnvkyau.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya250b3V2dXl1bXZubnZreWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzcxNzcsImV4cCI6MjA4MDExMzE3N30.RL2V06MVJ79Sdo6g8DkOnTLn-PAfu-XpTpgtgUhJgqM';

const client = createClient(url, key);

async function test() {
  const { data: dev, error: devError } = await client.from('development_edits').select('*').limit(2);
  console.log('Developments:', JSON.stringify(dev, null, 2));
  console.log('Developments Error:', devError);
}

test();
