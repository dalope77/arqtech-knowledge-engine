"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Database, Search, ArrowRight, Activity, MapPin, Scale, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Entity, Relation, Observation } from '@/types';

export default function KnowledgeExplorer() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [counts, setCounts] = useState({ entities: 0, relations: 0, observations: 0 });

  useEffect(() => {
    async function loadGraph() {
      try {
        const [entCount, relCount, obsCount, entData, relData, obsData] = await Promise.all([
          supabase.from('entities').select('*', { count: 'exact', head: true }),
          supabase.from('relations').select('*', { count: 'exact', head: true }),
          supabase.from('observations').select('*', { count: 'exact', head: true }),
          supabase.from('entities').select('*').limit(50).order('created_at', { ascending: false }),
          supabase.from('relations').select('*').limit(100).order('created_at', { ascending: false }),
          supabase.from('observations').select('*').limit(100).order('created_at', { ascending: false })
        ]);
        
        setCounts({
          entities: entCount.count || 0,
          relations: relCount.count || 0,
          observations: obsCount.count || 0
        });

        if (entData.data) setEntities(entData.data);
        if (relData.data) setRelations(relData.data);
        if (obsData.data) setObservations(obsData.data);
      } catch (err) {
        console.error('Error loading graph:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadGraph();
  }, []);

  const getEntityIcon = (type: string) => {
    switch(type.toUpperCase()) {
      case 'PARCELA': return <MapPin className="w-5 h-5 text-emerald-400" />;
      case 'ZONA': return <Database className="w-5 h-5 text-blue-400" />;
      case 'NORMA': return <Scale className="w-5 h-5 text-amber-400" />;
      default: return <HelpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full animate-in fade-in zoom-in-95 duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-500" />
            Knowledge Explorer
          </h1>
          <p className="text-gray-400 mt-2">Explora el tejido de conocimiento de ArqTech en tiempo real desde Supabase.</p>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur transition-opacity opacity-0 group-focus-within:opacity-100" />
          <div className="relative bg-[#0F0F11] border border-white/10 rounded-xl flex items-center p-2 focus-within:border-blue-500/50 transition-colors shadow-xl">
            <Search className="w-5 h-5 text-gray-500 ml-2" />
            <input 
              type="text" 
              placeholder="Buscar parcela, zona, normativa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white px-4 py-2 w-full outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Entities List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-gray-200">Entidades Activas</h2>
              <span className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-400 font-mono">{filteredEntities.length} resultados</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredEntities.map((entity, i) => {
                  const entityRelations = relations.filter(r => r.from_entity_id === entity.id || r.to_entity_id === entity.id);
                  const entityObservations = observations.filter(o => o.subject_entity_id === entity.id || o.object_entity_id === entity.id);
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      key={entity.id} 
                      className="bg-[#151518] border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.1)] group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors">
                            {getEntityIcon(entity.type)}
                          </div>
                          <div>
                            <span className="text-xs font-mono text-blue-400 font-semibold tracking-wider">{entity.type}</span>
                            <h3 className="text-lg font-bold text-gray-100 leading-tight mt-0.5">{entity.name}</h3>
                          </div>
                        </div>
                      </div>
                      
                      {entityObservations.length > 0 && (
                        <div className="mt-5 space-y-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                            Evidencias ({entityObservations.length})
                          </h4>
                          <div className="space-y-1.5">
                            {entityObservations.map(obs => (
                              <div key={obs.id} className="text-sm text-gray-300 bg-black/40 p-2.5 rounded-lg border border-white/5 flex justify-between items-center group/obs hover:border-white/10 transition-colors">
                                <span className="font-medium text-gray-400">{obs.predicate}:</span>
                                <span className="text-white font-medium">{obs.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {entityRelations.length > 0 && (
                        <div className="mt-5 pt-5 border-t border-white/5">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                            Relaciones ({entityRelations.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {entityRelations.map(rel => {
                              const isSource = rel.from_entity_id === entity.id;
                              const targetId = isSource ? rel.to_entity_id : rel.from_entity_id;
                              const target = entities.find(e => e.id === targetId);
                              
                              return (
                                <span key={rel.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 group-hover:border-white/20 transition-colors">
                                  {!isSource && <ArrowRight className="w-3 h-3 text-gray-600 rotate-180" />}
                                  <span className="text-blue-300/70 italic font-medium">{rel.relation_type}</span>
                                  {isSource && <ArrowRight className="w-3 h-3 text-gray-600" />}
                                  <span className="font-semibold text-gray-200">{target?.name || targetId}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
            {filteredEntities.length === 0 && (
              <div className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No se encontraron entidades para "{searchTerm}"</p>
              </div>
            )}
          </div>

          {/* Graph Stats / Overview */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#151518] to-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <h2 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-3 relative z-10">
                <Activity className="w-5 h-5 text-purple-400" />
                Métricas de Supabase
              </h2>
              
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                  <span className="text-gray-400 font-medium">Entidades Totales</span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{counts.entities}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                  <span className="text-gray-400 font-medium">Relaciones Formadas</span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{counts.relations}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                  <span className="text-gray-400 font-medium">Evidencias Extraídas</span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">{counts.observations}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                En Vivo (Production)
              </h3>
              <p className="text-sm text-emerald-200/80 leading-relaxed relative z-10">
                Los datos que ves aquí se leen en tiempo real de tu base de datos Supabase, sin Mocks. Cada interacción con los Agentes LLM insertará nodos y aristas directamente en el grafo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
