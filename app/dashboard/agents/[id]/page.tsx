"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, PlayCircle, Bot } from 'lucide-react';
import { use } from 'react';
import { getAgent, updateAgent, Agent } from '@/lib/agents/api';

export default function AgentConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [context, setContext] = useState('');
  const [mcpConfig, setMcpConfig] = useState('');

const defaultAgents = [
  { 
    id: 'ORCHESTRATOR_AGENT', 
    name: 'Master Orchestrator', 
    description: 'Understands natural language and plans execution across the graph.', 
    system_prompt: 'You are the orchestrator.\n\nRegla GeoARBA: Cuando una consulta requiera información parcelaria, nomenclatura, partida, superficie parcelaria, ubicación espacial o geometría oficial de ARBA, utiliza las herramientas MCP de GeoARBA en lugar de pedir al LLM que razone sobre datos parcelarios inexistentes en el contexto. Delega a PARCEL_AGENT o usa MCP directo.', 
    context: '', 
    mcp_config: {} 
  },
  { 
    id: 'PARCEL_AGENT', 
    name: 'Parcel Analyzer', 
    description: 'Evaluates parcels against urban regulations and parameters.', 
    system_prompt: 'You are an urban regulations expert.\n\nRegla GeoARBA: Cuando la parcela pueda identificarse mediante nomenclatura, partida o geometría oficial, consultar primero GeoARBA. Nunca inventes una superficie parcelaria, partida, nomenclatura o geometría.', 
    context: '', 
    mcp_config: {
      "mcpServers": {
        "arqtech-arba": {
          "command": "python",
          "args": ["arqtech-arba-mcp/server.py"],
          "env": {
            "ARBA_WFS_URL": "https://geo.arba.gov.ar/geoserver/idera/wfs",
            "ARBA_TIMEOUT": "30"
          }
        }
      }
    } 
  },
  { id: 'INGESTION_AGENT', name: 'ETL Ingestion Agent', description: 'Extracts external data into the Knowledge Graph EAV standard.', system_prompt: 'You are an ETL expert.', context: '', mcp_config: {} },
  { id: 'MARKET_AGENT', name: 'Market Intelligence Agent', description: 'Analyzes real estate trends, demand, and valuation metrics.', system_prompt: 'You are a real estate analyst.', context: '', mcp_config: {} },
  { 
    id: 'LEGAL_AGENT', 
    name: 'Legal & Regulatory Agent', 
    description: 'Interprets ordinances, decrees, and complex legal texts.', 
    system_prompt: 'You are a legal expert in urban planning.\n\nRegla UrbaSIG: Cuando debas dictaminar qué normativa aplica sobre un predio, DEBES utilizar las herramientas del MCP de UrbaSIG (get_urban_zone, check_ley_8912) cruzando la geometría de la parcela provista en tu contexto. No alucines códigos de zonificación.', 
    context: '', 
    mcp_config: {
      "mcpServers": {
        "arqtech-urbasig": {
          "command": "python",
          "args": ["arqtech-urbasig-mcp/server.py"],
          "env": {
            "URBASIG_WFS_URL": "http://urbasig.gob.gba.gob.ar/geoserver/urbasig/wfs"
          }
        }
      }
    } 
  },
  { id: 'RISK_AGENT', name: 'Risk Assessment Agent', description: 'Calculates hydraulic, environmental, and infrastructure risks.', system_prompt: 'You are a risk assessor.', context: '', mcp_config: {} },
  { id: 'CURATOR_AGENT', name: 'Knowledge Curator (Epistemology)', description: 'Filters out noise and decides if new user interactions provide valuable epistemic truth before writing to the Graph.', system_prompt: 'You are a knowledge curator.', context: '', mcp_config: {} },
  { id: 'SATELLITE_AGENT', name: 'Satellite / Urban Growth Agent', description: 'Analyzes spatial and temporal data to detect territorial transformations.', system_prompt: 'You are an urban growth and GIS specialist. Analyze spatial intersections.', context: '', mcp_config: {} },
  { id: 'VISUAL_AGENT', name: 'Visual Annotation Agent', description: 'Processes technical blueprints and imagery to extract objects.', system_prompt: 'You are a computer vision specialist extracting bounding boxes from blueprints.', context: '', mcp_config: {} },
  { id: 'SCRAPING_AGENT', name: 'Web Scraping Agent', description: 'Navigates URLs, extracts raw HTML/Text, and maps it into structured Knowledge Graph entities.', system_prompt: 'You are a web scraping specialist.', context: '', mcp_config: {} },
  { 
    id: 'OPTIMIZATION_AGENT', 
    name: 'Continuous Improvement Agent', 
    description: 'Reads telemetry (agent runs, rejected proposals) and proposes architectural optimizations.', 
    system_prompt: 'You are an AI Process Engineer. Your job is to analyze rejected proposals from the Review Queue and execution logs in order to propose systemic improvements. DO NOT write to the graph directly. Produce a Proposal describing how to improve prompts or orchestration.', 
    context: '', 
    mcp_config: {} 
  },
];

  useEffect(() => {
    async function load() {
      let data = await getAgent(resolvedParams.id);
      if (!data) {
        // Fallback to default memory configuration
        const def = defaultAgents.find(a => a.id === resolvedParams.id);
        if (def) {
          data = { ...def, status: 'active' } as Agent;
        }
      }
      
      if (data) {
        setAgent(data);
        setName(data.name || '');
        setDescription(data.description || '');
        setSystemPrompt(data.system_prompt || '');
        setContext(data.context || '');
        setMcpConfig(data.mcp_config ? JSON.stringify(data.mcp_config, null, 2) : '');
      }
      setLoading(false);
    }
    load();
  }, [resolvedParams.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    let parsedMcp = null;
    if (mcpConfig.trim()) {
      try {
        parsedMcp = JSON.parse(mcpConfig);
      } catch (err) {
        alert("Invalid JSON in MCP Config");
        setSaving(false);
        return;
      }
    }

    const success = await updateAgent(resolvedParams.id, {
      name,
      description,
      system_prompt: systemPrompt,
      context,
      mcp_config: parsedMcp
    });
    setSaving(false);
    if (success) {
      alert("Agent updated successfully");
    } else {
      alert("Error updating agent");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!agent) {
    return <div className="p-8 text-center text-white">Agent not found in database. Did you run the seed script?</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </button>
        <div className="flex items-center gap-4 mt-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Configure: {agent.name}</h1>
            <p className="text-gray-400 font-mono mt-1 text-sm">{agent.id}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-[#0F0F11] rounded-2xl border border-white/10 shadow-xl p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Agent Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 px-4 py-3 bg-[#0A0A0C] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 px-4 py-3 bg-[#0A0A0C] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">System Prompt (Instructions)</label>
          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/10 px-4 py-3 bg-[#0A0A0C] text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono text-sm transition-all"
            placeholder="You are an expert in..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Additional Context (Knowledge Base)</label>
          <textarea 
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 px-4 py-3 bg-[#0A0A0C] text-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm transition-all"
            placeholder="Provide context like domain schemas or recent rules..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-400 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              Model Context Protocol (MCP Config)
              <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded text-purple-300 border border-purple-500/30">Optional JSON</span>
            </div>
            <button 
              type="button" 
              onClick={async () => {
                alert("Simulated MCP Test:\nLatencia: 312ms\nFuente: ARBA GeoARBA\nHerramienta: get_layers\nResultados: 151 capas");
              }}
              className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 rounded text-xs transition-all"
            >
              Test MCP
            </button>
          </label>
          <div className="mb-2 text-xs text-gray-500 flex gap-4">
             <span><strong className="text-gray-300">Available MCPs:</strong> GeoARBA</span>
             <span><strong className="text-gray-300">Status:</strong> <span className="text-emerald-500">CONNECTED</span></span>
          </div>
          <textarea 
            value={mcpConfig}
            onChange={(e) => setMcpConfig(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-white/10 px-4 py-3 bg-[#0A0A0C] text-purple-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-mono text-sm transition-all"
            placeholder={'{\n  "servers": {\n    "qgis": {\n      "command": "qgis-mcp-server",\n      "args": []\n    }\n  }\n}'}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end pt-6 border-t border-white/10 gap-4">
          <button 
            type="button" 
            onClick={async () => {
              const res = await fetch('/api/agents/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_id: agent.id })
              });
              if (res.ok) alert('Simulated run successful! Check the Review Queue.');
              else alert('Error starting agent run.');
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 font-medium rounded-xl transition-all"
          >
            <PlayCircle className="w-5 h-5" />
            Simulate Run
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
