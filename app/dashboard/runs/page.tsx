"use client";

import { useState } from 'react';
import { TerminalSquare, Play, Loader2, CheckCircle2, XCircle, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgentRunsPage() {
  const [agentType, setAgentType] = useState('PARCEL_AGENT');
  const [targetInput, setTargetInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const runAgent = async () => {
    if (!targetInput) return;
    setIsRunning(true);
    setResult(null);
    setLogs([`[System] Initializing ${agentType}...`]);

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          input: { query: targetInput, parcelId: targetInput, externalDataSchema: targetInput },
          objective: 'Process user request via UI'
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setLogs(prev => [...prev, `[System] Agent executed successfully.`]);
        if (data.output?.learnedRelations) {
          setLogs(prev => [...prev, `[LLM] Discovered ${data.output.learnedRelations.length} new relations!`]);
        }
        setResult({
          status: 'success',
          runId: data.runId,
          output: {
            message: data.output?.answer || data.output?.message || 'Agent task completed.',
            parcel: { name: 'Action Processed', type: agentType }
          }
        });
      } else {
        setLogs(prev => [...prev, `[System] Agent execution failed: ${data.error}`]);
        setResult({ status: 'failed', error: data.error });
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `[System] Network error: ${error.message}`]);
      setResult({ status: 'failed', error: 'Network error occurred' });
    } finally {
      setIsRunning(false);
    }
  };
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <TerminalSquare className="w-8 h-8 text-blue-500" />
          Agent Runner
        </h2>
        <p className="text-gray-400 mt-1">Execute specialized agents to acquire new knowledge.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0F0F11] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Launch Agent</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Agent Type</label>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                >
                  <option value="ORCHESTRATOR_AGENT">Master Orchestrator (Natural Language)</option>
                  <option value="PARCEL_AGENT">Parcel Analyzer Agent</option>
                  <option value="INGESTION_AGENT">ETL Ingestion Agent</option>
                  <option value="DOCUMENT_AGENT" disabled>Document Parser (Coming Soon)</option>
                </select>
              </div>

              {agentType === 'ORCHESTRATOR_AGENT' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Natural Language Query</label>
                  <textarea 
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder='Ej: "Analiza la parcela 12-B y dime si cumple con el R3."'
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm h-32"
                  />
                </div>
              ) : agentType === 'PARCEL_AGENT' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Target Parcel ID</label>
                  <input 
                    type="text" 
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="e.g. 12-B-34"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Foreign Data Schema (JSON)</label>
                  <textarea 
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder='{"tableName": "normativas", "columns": ["id", "codigo", "descripcion"]}'
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm h-32"
                  />
                </div>
              )}

              <button 
                onClick={runAgent}
                disabled={!targetInput || isRunning}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/20"
              >
                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                {isRunning ? 'Agent is running...' : 'Execute Agent'}
              </button>
            </div>
          </div>
        </div>

        {/* Terminal & Output */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0F0F11] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[400px]">
            <div className="bg-black/40 border-b border-white/10 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="ml-2 text-xs font-mono text-gray-500">agent-runner-tty1</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1">
              {logs.length === 0 && (
                <p className="text-gray-600 italic">Waiting for execution...</p>
              )}
              
              <AnimatePresence>
                {logs.map((log, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className={`${
                      log?.includes?.('[System]') ? 'text-blue-400' : 
                      log?.includes?.('[LLM]') ? 'text-purple-400' : 
                      'text-gray-300'
                    }`}
                  >
                    <span className="text-gray-600 mr-2">{'>'}</span>{log}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isRunning && (
                <motion.div 
                  animate={{ opacity: [1, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="text-gray-500"
                >
                  _
                </motion.div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-2xl p-6 flex items-start gap-4 ${
                  result.status === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                {result.status === 'success' 
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                }
                <div>
                  <h4 className={`font-semibold ${result.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    Execution {result.status === 'success' ? 'Successful' : 'Failed'}
                  </h4>
                  {result.status === 'success' ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-gray-300">{result.output.message}</p>
                      <div className="inline-flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                        <Database className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white font-medium">{result.output.parcel.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-white/10 text-gray-400 rounded-full">{result.output.parcel.type}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-red-300">{result.error}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
