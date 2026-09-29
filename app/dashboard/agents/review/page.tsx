"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Check, X, ArrowLeft, RefreshCw } from 'lucide-react';
import { getPendingProposals, reviewProposal, ProposedChange } from '@/lib/agents/api';

export default function ReviewProposalsPage() {
  const [proposals, setProposals] = useState<ProposedChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    setLoading(true);
    const data = await getPendingProposals();
    setProposals(data);
    setLoading(false);
  }

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    const success = await reviewProposal(id, status);
    if (success) {
      setProposals(p => p.filter(prop => prop.id !== id));
    } else {
      alert("Error al procesar la revisión");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/agents" className="text-gray-400 hover:text-white mb-4 inline-flex items-center text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3 mt-2">
            <Activity className="w-8 h-8 text-purple-500" />
            Agent Review Queue
          </h2>
          <p className="text-gray-400 mt-1">Review, approve, or reject changes proposed by autonomous agents.</p>
        </div>
        <button 
          onClick={loadProposals} 
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 border border-white/10 rounded-lg font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {proposals.length === 0 ? (
            <div className="p-12 text-center bg-[#0F0F11] border border-white/10 rounded-2xl flex flex-col items-center">
              <Activity className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-xl text-white font-semibold">No pending proposals</p>
              <p className="text-gray-400 mt-2">The agents are resting or the graph is fully updated.</p>
            </div>
          ) : (
            proposals.map(proposal => (
              <div key={proposal.id} className="bg-[#0F0F11] rounded-2xl border border-white/10 overflow-hidden shadow-xl hover:border-white/20 transition-all">
                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-white">
                      {(proposal as any).agents?.name || proposal.agent_id}
                    </span>
                    <span className="px-3 py-1 text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full">
                      {proposal.change_type}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(proposal.created_at!).toLocaleString()}
                  </span>
                </div>
                <div className="p-6">
                  <p className="text-gray-400 font-medium mb-2 text-sm uppercase tracking-wider">Reasoning</p>
                  <p className="text-white text-base mb-6 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                    {proposal.reason}
                  </p>
                  
                  <p className="text-gray-400 font-medium mb-2 text-sm uppercase tracking-wider">Proposed Payload</p>
                  <pre className="text-sm bg-[#0A0A0C] text-emerald-400 p-5 rounded-xl overflow-x-auto mb-8 border border-white/5 font-mono">
                    {JSON.stringify(proposal.payload, null, 2)}
                  </pre>

                  <div className="flex gap-4 justify-end pt-4 border-t border-white/10">
                    <button 
                      onClick={() => handleAction(proposal.id, 'rejected')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl border border-red-500/20 transition-all"
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(proposal.id, 'approved')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <Check className="w-5 h-5" />
                      Approve & Integrate
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
