import { Users, Bot, Settings, Plus, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { getServiceRoleClient } from '@/lib/supabase';

export const revalidate = 0;

const availableAgents = [
  { id: 'ORCHESTRATOR_AGENT', name: 'Master Orchestrator', description: 'Understands natural language and plans execution across the graph.', type: 'Cognitive' },
  { id: 'PARCEL_AGENT', name: 'Parcel Analyzer', description: 'Evaluates parcels against urban regulations', type: 'Evaluator' },
  { id: 'INGESTION_AGENT', name: 'ETL Ingestion Agent', description: 'Extracts external data into the Knowledge Graph EAV standard.', type: 'Ingestion' },
];

export default async function AgentsPage() {
  const supabase = getServiceRoleClient();
  
  const { data: runs, error } = await supabase
    .from('agent_runs')
    .select('agent_type, status');

  const safeRuns = error ? [] : runs || [];

  const agentsWithStats = availableAgents.map(agent => {
    const agentRuns = safeRuns.filter(r => r.agent_type === agent.id);
    const successRuns = agentRuns.filter(r => r.status === 'success');
    
    return {
      ...agent,
      status: 'Active',
      runs: agentRuns.length,
      successRate: agentRuns.length > 0 ? Math.round((successRuns.length / agentRuns.length) * 100) + '%' : 'N/A'
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            Active Agents
          </h2>
          <p className="text-gray-400 mt-1">Manage the specialized AI agents running in the system.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20">
          <Plus className="w-5 h-5" />
          New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentsWithStats.map((agent) => (
          <div key={agent.id} className="bg-[#0F0F11] border border-white/10 rounded-2xl p-6 flex flex-col hover:border-white/20 transition-all shadow-xl group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                {agent.status}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
            <p className="text-sm font-mono text-gray-500 mb-3">{agent.id}</p>
            
            <p className="text-sm text-gray-400 flex-1 mb-6">{agent.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-gray-500 mb-1">Total Runs</p>
                <p className="text-lg font-semibold text-white">{agent.runs}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                <p className="text-lg font-semibold text-emerald-400">{agent.successRate}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Link href="/dashboard/runs" className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                <PlayCircle className="w-4 h-4" />
                Execute
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
