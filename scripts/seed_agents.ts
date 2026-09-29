import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const availableAgents = [
  { id: 'ORCHESTRATOR_AGENT', name: 'Master Orchestrator', description: 'Understands natural language and plans execution across the graph.', system_prompt: 'You are the orchestrator.', context: '' },
  { id: 'PARCEL_AGENT', name: 'Parcel Analyzer', description: 'Evaluates parcels against urban regulations and parameters.', system_prompt: 'You are an urban regulations expert.', context: '' },
  { id: 'INGESTION_AGENT', name: 'ETL Ingestion Agent', description: 'Extracts external data into the Knowledge Graph EAV standard.', system_prompt: 'You are an ETL expert.', context: '' },
  { id: 'MARKET_AGENT', name: 'Market Intelligence Agent', description: 'Analyzes real estate trends, demand, and valuation metrics.', system_prompt: 'You are a real estate analyst.', context: '' },
  { id: 'LEGAL_AGENT', name: 'Legal & Regulatory Agent', description: 'Interprets ordinances, decrees, and complex legal texts.', system_prompt: 'You are a legal expert.', context: '' },
  { id: 'RISK_AGENT', name: 'Risk Assessment Agent', description: 'Calculates hydraulic, environmental, and infrastructure risks.', system_prompt: 'You are a risk assessor.', context: '' },
  { id: 'CURATOR_AGENT', name: 'Knowledge Curator (Epistemology)', description: 'Filters out noise and decides if new user interactions provide valuable epistemic truth before writing to the Graph.', system_prompt: 'You are a knowledge curator.', context: '' },
];

async function seed() {
  for (const agent of availableAgents) {
    const { error } = await supabase.from('agents').upsert({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      system_prompt: agent.system_prompt,
      context: agent.context,
      status: 'active'
    });
    if (error) {
      console.error('Error seeding agent', agent.id, error);
    } else {
      console.log('Seeded', agent.id);
    }
  }
}
seed();
