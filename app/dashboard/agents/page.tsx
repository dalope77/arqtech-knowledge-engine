"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Bot, Settings, Plus, PlayCircle, Activity } from 'lucide-react';
import { getAgents, Agent } from '@/lib/agents/api';

const defaultAgents = [
  { id: 'ORCHESTRATOR_AGENT', name: 'Master Orchestrator', description: 'Understands natural language and plans execution across the graph.', status: 'active' },
  { id: 'PARCEL_AGENT', name: 'Parcel Analyzer', description: 'Evaluates parcels against urban regulations and parameters.', status: 'active' },
  { id: 'INGESTION_AGENT', name: 'ETL Ingestion Agent', description: 'Extracts external data into the Knowledge Graph EAV standard.', status: 'active' },
  { id: 'MARKET_AGENT', name: 'Market Intelligence Agent', description: 'Analyzes real estate trends, demand, and valuation metrics.', status: 'active' },
  { id: 'LEGAL_AGENT', name: 'Legal & Regulatory Agent', description: 'Interprets ordinances, decrees, and complex legal texts.', status: 'active' },
  { id: 'RISK_AGENT', name: 'Risk Assessment Agent', description: 'Calculates hydraulic, environmental, and infrastructure risks.', status: 'active' },
  { id: 'CURATOR_AGENT', name: 'Knowledge Curator (Epistemology)', description: 'Filters out noise and decides if new user interactions provide valuable epistemic truth before writing to the Graph.', status: 'active' },
  { id: 'SATELLITE_AGENT', name: 'Satellite / Urban Growth Agent', description: 'Analyzes spatial and temporal data (GeoJSON, WKT, TIFs) to detect territorial transformations.', status: 'active' },
  { id: 'VISUAL_AGENT', name: 'Visual Annotation Agent', description: 'Processes technical blueprints and imagery to extract objects via YOLO/docTR.', status: 'active' },
  { id: 'SCRAPING_AGENT', name: 'Web Scraping Agent', description: 'Navigates URLs, extracts raw HTML/Text, and maps it into structured Knowledge Graph entities.', status: 'active' },
  { id: 'OPTIMIZATION_AGENT', name: 'Continuous Improvement Agent', description: 'Reads telemetry (agent runs, rejected proposals) and proposes architectural optimizations.', status: 'active' },
];

export default function AgentsPage() {
  const [dbAgents, setDbAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAgents();
      setDbAgents(data);
      setLoading(false);
    }
    load();
  }, []);

  // Merge DB agents with default ones
  const agents = defaultAgents.map(def => {
    const found = dbAgents.find(a => a.id === def.id || a.name === def.name);
    return found ? { ...def, ...found } : def;
  });

  // Add any custom agents created in DB
  dbAgents.forEach(dbA => {
    if (!agents.find(a => a.id === dbA.id)) {
      agents.push(dbA as any);
    }
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
        <div className="flex gap-4">
          <Link href="/dashboard/agents/review" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20">
            <Activity className="w-5 h-5" />
            Review Queue
          </Link>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20">
            <Plus className="w-5 h-5" />
            New Agent
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
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
              
              <div className="flex gap-3">
                <Link href={`/dashboard/agents/${agent.id}`} className="flex-1 flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-blue-500/20">
                  <Settings className="w-4 h-4" />
                  Configurar
                </Link>
                <Link href="/dashboard/runs" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                  <PlayCircle className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
