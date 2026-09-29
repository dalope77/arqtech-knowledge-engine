import { getServiceRoleClient } from '@/lib/supabase';
import { Activity, Database, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Disable caching

interface AgentHealth {
  id: string;
  name: string;
  description: string;
  score: number;
  entitiesReq: string[];
  entitiesFound: number;
  evidenceFound: number;
  validatedRatio: number;
  recommendation: string;
}

export default async function HealthDashboard() {
  const supabase = getServiceRoleClient();

  // Fetch counts from DB
  const [
    { count: totalEntities },
    { count: totalEvidence },
    { data: entities },
    { data: evidence },
    { data: claims }
  ] = await Promise.all([
    supabase.from('entities').select('*', { count: 'exact', head: true }),
    supabase.from('evidence').select('*', { count: 'exact', head: true }),
    supabase.from('entities').select('type'),
    supabase.from('evidence').select('claim_id'),
    supabase.from('claims').select('status')
  ]);

  const entityTypes = entities?.reduce((acc: any, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {}) || {};

  const validatedClaims = claims?.filter(c => c.status === 'validated').length || 0;
  const totalClaims = claims?.length || 1; // Prevent div 0
  const validationRatio = Math.round((validatedClaims / totalClaims) * 100);

  // Define Agents and their required knowledge types
  const agentDefs = [
    {
      id: 'PARCEL_AGENT',
      name: 'Parcel Analyzer',
      description: 'Evaluates parcels against urban regulations.',
      reqTypes: ['PARCELA', 'ZONA', 'MANZANA'],
      rec: 'Upload KMLs/GeoJSONs of parcels and zoning maps.'
    },
    {
      id: 'LEGAL_AGENT',
      name: 'Legal & Regulatory Agent',
      description: 'Interprets ordinances, decrees, and laws.',
      reqTypes: ['NORMA', 'RESOLUCION', 'DECRETO'],
      rec: 'Ingest PDF documents of municipal ordinances.'
    },
    {
      id: 'SATELLITE_AGENT',
      name: 'Satellite / Urban Growth Agent',
      description: 'Analyzes spatial and temporal data.',
      reqTypes: ['URBAN_GROWTH_AREA', 'TIF', 'GEOJSON'],
      rec: 'Run satellite change detection pipelines (NDVI).'
    },
    {
      id: 'MARKET_AGENT',
      name: 'Market Intelligence Agent',
      description: 'Analyzes real estate trends and valuation metrics.',
      reqTypes: ['VALUATION', 'RENTABILITY', 'TRANSACTION'],
      rec: 'Scrape real estate sites or upload CSVs with property values.'
    }
  ];

  const agentHealths: AgentHealth[] = agentDefs.map(def => {
    const foundEntities = def.reqTypes.reduce((sum, type) => sum + (entityTypes[type] || 0), 0);
    
    // Simplistic scoring formula
    let score = 0;
    if (foundEntities > 0) score += 40;
    if (foundEntities > 100) score += 20;
    
    // Depth: We mock evidence linkage per agent type for the UI since we don't have a direct edge yet
    // In a real scenario we'd join entities -> observations -> evidence
    const depthScore = (totalEvidence || 0) > 10 ? 20 : 0;
    score += depthScore;
    
    score += (validationRatio > 50 ? 20 : 0);

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      score,
      entitiesReq: def.reqTypes,
      entitiesFound: foundEntities,
      evidenceFound: totalEvidence || 0,
      validatedRatio: validationRatio,
      recommendation: def.rec
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-500" />
          Epistemic Health Dashboard
        </h2>
        <p className="text-gray-400 mt-1">Monitor the knowledge coverage and reliability of your AI agents.</p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0F0F11] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h3 className="text-gray-400 font-medium">Total Entities</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalEntities || 0}</p>
        </div>
        <div className="bg-[#0F0F11] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-gray-400 font-medium">Validated Claims</h3>
          </div>
          <p className="text-3xl font-bold text-white">{validationRatio}%</p>
        </div>
        <div className="bg-[#0F0F11] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="text-gray-400 font-medium">Total Evidence</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalEvidence || 0}</p>
        </div>
      </div>

      {/* Agent Health Cards */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">Agent Reliability Score</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agentHealths.map(agent => (
            <div key={agent.id} className="bg-[#0F0F11] border border-white/10 rounded-2xl p-6 flex flex-col hover:border-white/20 transition-all shadow-xl group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-white">{agent.name}</h4>
                  <p className="text-sm text-gray-500 font-mono mt-1">{agent.id}</p>
                </div>
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 ${
                  agent.score > 70 ? 'border-emerald-500 text-emerald-400' :
                  agent.score > 30 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'
                }`}>
                  <span className="font-bold text-sm">{agent.score}%</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-400 mb-6">{agent.description}</p>
              
              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Amplitude (Entities Found)</span>
                    <span className="text-white font-medium">{agent.entitiesFound}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${Math.min((agent.entitiesFound / 100) * 100, 100)}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Requires: {agent.entitiesReq.join(', ')}</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/5 flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-300">Action Recommended</p>
                  <p className="text-xs text-gray-500 mt-1">{agent.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
