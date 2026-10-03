import { getServiceRoleClient } from '../lib/supabase';

async function checkAgents() {
  const supabase = getServiceRoleClient();
  
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, system_prompt, knowledge_base, mcp_config');
    
  if (error) {
    console.error("Error fetching agents:", error);
    return;
  }
  
  if (!agents || agents.length === 0) {
    console.log("No agents found in the DB table 'agents'.");
    return;
  }
  
  for (const agent of agents) {
    console.log(`\n=== AGENT: ${agent.name} (${agent.id}) ===`);
    console.log(`[SYSTEM PROMPT]\n${agent.system_prompt}`);
    console.log(`\n[KNOWLEDGE BASE]\n${agent.knowledge_base}`);
    console.log(`\n[MCP CONFIG]\n${JSON.stringify(agent.mcp_config)}`);
  }
}

checkAgents().catch(console.error);
