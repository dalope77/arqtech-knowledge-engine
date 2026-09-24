"use client";

import { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardHome() {
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSubmitting(true);
    setResponse(null);

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'ORCHESTRATOR_AGENT',
          input: { query },
          objective: 'User Prompt'
        })
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ status: 'failed', error: 'Error de red al contactar al orquestador.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-[70vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
      
      <motion.div 
        layout
        className="w-full max-w-3xl flex flex-col items-center"
      >
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 rounded-full mb-6 ring-1 ring-blue-500/30">
            <Sparkles className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tight">
            ¿Qué necesitas saber hoy?
          </h1>
          <p className="text-gray-400 text-lg">Consulta la base de conocimientos, ingiere nuevos datos o analiza parcelas usando lenguaje natural.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl transition-opacity opacity-0 group-focus-within:opacity-100" />
          <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center transition-all focus-within:border-blue-500/50">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: ¿Qué normativa aplica a la Parcela 12-B?"
              className="w-full bg-transparent text-white px-6 py-4 outline-none text-lg placeholder-gray-600"
              disabled={isSubmitting}
            />
            <button 
              type="submit"
              disabled={!query.trim() || isSubmitting}
              className="p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl transition-colors ml-2"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {response && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-8 bg-[#0F0F11] border border-white/10 rounded-2xl p-6 shadow-xl"
            >
              {response.status === 'success' ? (
                <div className="space-y-4">
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-200 leading-relaxed text-lg whitespace-pre-wrap">
                      {response.output?.answer}
                    </p>
                  </div>
                  
                  {response.output?.learnedRelations && response.output.learnedRelations.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Nuevas relaciones aprendidas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {response.output.learnedRelations.map((rel: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-300">
                            <span>{rel.from}</span>
                            <ArrowRight className="w-3 h-3 text-emerald-500/50" />
                            <span className="font-mono text-xs">{rel.type}</span>
                            <ArrowRight className="w-3 h-3 text-emerald-500/50" />
                            <span>{rel.to}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-400">
                  Ha ocurrido un error: {response.error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
