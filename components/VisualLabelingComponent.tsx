"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, MapPin } from 'lucide-react';
import Link from 'next/link';

type PendingEntity = {
  id: string;
  name: string;
  type: string;
  metadata: any;
  created_at: string;
};

export default function VisualLabelingComponent() {
  const [entities, setEntities] = useState<PendingEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingEntities();
  }, []);

  async function fetchPendingEntities() {
    setLoading(true);
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('type', 'PARCELA')
      .contains('metadata', { pipeline_status: 'REQUIERE_ETIQUETADO_VISUAL' })
      .order('created_at', { ascending: false });
    
    if (data) {
      setEntities(data);
    } else if (error) {
      console.error("Error fetching entities:", error);
    }
    setLoading(false);
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const entity = entities.find(e => e.id === id);
      if (!entity) return;

      const updatedMetadata = {
        ...entity.metadata,
        pipeline_status: newStatus
      };

      const { error } = await supabase
        .from('entities')
        .update({ metadata: updatedMetadata })
        .eq('id', id);

      if (error) throw error;

      setEntities(prev => prev.filter(e => e.id !== id));
      
    } catch (error: any) {
      alert("Error actualizando estado: " + error.message);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-gray-500 mt-8">Cargando parcelas pendientes...</div>;
  }

  return (
    <div className="bg-[#121216] border border-orange-500/20 rounded-2xl p-6 mt-8 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.6)]"></span>
            Visual Labeling (Pendientes)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Revisa estas parcelas y confirma si están desarrolladas para entrenar el modelo.
          </p>
        </div>
        <div className="bg-orange-500/10 text-orange-400 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-500/20">
          {entities.length} Pendientes
        </div>
      </div>

      {entities.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-gray-500 font-medium">
          🎉 ¡Excelente! No hay parcelas pendientes de revisión.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map(ent => (
            <div key={ent.id} className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-orange-500/30 transition-all hover:shadow-lg group">
              <div>
                <h3 className="font-bold text-gray-200 text-lg">{ent.name}</h3>
                <p className="text-xs text-gray-500 mb-3 font-mono">Nom: {ent.metadata?.nomenclatura}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-md border border-emerald-500/20">
                  {(ent.metadata?.area / 10000).toFixed(2)} hectáreas
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <Link 
                  href={`/dashboard/map?entityId=${ent.id}`} 
                  target="_blank"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-medium"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Ver en Mapa
                </Link>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(ent.id, 'RECHAZADO_VISUAL')}
                    className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all tooltip shadow-sm"
                    title="Rechazar (Baldío / No consolidado)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(ent.id, 'CONFIRMADO_VISUAL')}
                    className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all tooltip shadow-sm"
                    title="Confirmar Desarrollo"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
