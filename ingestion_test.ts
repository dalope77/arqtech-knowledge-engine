import { createClient } from '@supabase/supabase-js';
import { IngestionAgent } from './lib/agents/ingestion_agent';

const url = 'https://qrkntouvuyumvnnvkyau.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya250b3V2dXl1bXZubnZreWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzcxNzcsImV4cCI6MjA4MDExMzE3N30.RL2V06MVJ79Sdo6g8DkOnTLn-PAfu-XpTpgtgUhJgqM';

const client = createClient(url, key);

async function runFullTest() {
  console.log('Fetching foreign data from La Plata Dashboard (development_edits)...');
  const { data: foreignData, error } = await client.from('development_edits').select('*').limit(2);
  
  if (error) {
    console.error('Failed to fetch:', error);
    return;
  }

  const sample = foreignData.map((d: any) => ({
    id: d.id,
    name: d.state?.name || 'Unnamed',
    type: d.state?.type || 'Unknown',
    zoning: d.state?.technicalData?.indicators?.zoning || 'None',
    compliance: d.state?.complianceStatus || 'Unknown'
  }));

  console.log('--- Sample Data Fetched ---');
  console.log(JSON.stringify(sample, null, 2));

  console.log('\n--- Initializing Ingestion Agent ---');
  const agent = new IngestionAgent();

  // Mock the DB tools since we don't have write access to the La Plata DB schema
  const createdEntities: any[] = [];
  const createdObservations: any[] = [];

  // @ts-ignore
  agent.tools.discoverEntity = async (type, name, meta) => {
    const entity = { id: 'EAV-' + Math.random().toString().slice(2, 8), type, name, meta };
    createdEntities.push(entity);
    return entity;
  };
  
  // @ts-ignore
  agent.tools.recordObservation = async (entityId, predicate, value, source) => {
    createdObservations.push({ entityId, predicate, value, source });
    return { id: 'OBS-' + Math.random().toString().slice(2, 8) };
  };

  console.log('Agent is analyzing schema and mapping to Knowledge Graph EAV...');
  const result = await agent.execute({
    runId: 'test-run',
    objective: 'Ingest La Plata Data',
    input: {
      externalDataSchema: { tableName: 'development_edits', columns: ['id', 'name', 'type', 'zoning', 'compliance'] },
      sampleData: sample
    }
  });

  console.log('\n--- Ingestion Result ---');
  console.log(result);

  console.log('\n--- Knowledge Graph (EAV) Output ---');
  console.log(`Created ${createdEntities.length} Entities:`);
  console.log(createdEntities);
  
  console.log(`\nCreated ${createdObservations.length} Observations:`);
  console.log(createdObservations);
}

runFullTest();
