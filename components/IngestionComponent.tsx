"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Ingestion = {
  id: string;
  filename: string;
  file_type: string;
  file_hash: string;
  status: string;
  created_at: string;
};

export default function IngestionComponent() {
  const [ingestions, setIngestions] = useState<Ingestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchIngestions();
  }, []);

  async function fetchIngestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('file_ingestions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setIngestions(data);
    }
    setLoading(false);
  }

  const generateHash = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const hash = await generateHash(file);
      
      // Check if hash exists
      const { data: existing } = await supabase
        .from('file_ingestions')
        .select('*')
        .eq('file_hash', hash)
        .single();
        
      if (existing) {
        alert(`Este archivo ya fue subido anteriormente (Hash: ${hash.substring(0,8)}...) y su estado es ${existing.status}`);
        return;
      }

      // Determine folder based on extension
      const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
      const folder = ['kml', 'geojson', 'zip'].includes(ext) ? 'spatial' : 'documents';

      // Insert record
      const { data, error } = await supabase.from('file_ingestions').insert({
        filename: file.name,
        file_type: ext,
        file_hash: hash,
        status: 'UPLOADED',
        metadata: { folder, size: file.size }
      }).select().single();

      if (error) throw error;
      
      setIngestions(prev => [data, ...prev]);
      alert(`Archivo registrado. Subiendo a Storage e iniciando procesamiento...`);
      
      // Upload to Supabase Storage
      const storagePath = `documents/${data.id}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ingestions')
        .upload(storagePath, file);
        
      if (uploadError) throw new Error("Error subiendo archivo al bucket: " + uploadError.message);
      
      const { data: publicUrlData } = supabase.storage.from('ingestions').getPublicUrl(storagePath);
      const publicUrl = publicUrlData.publicUrl;

      // Decide pipeline based on size (5MB threshold for sync text extraction vs async OCR)
      if (file.size > 5 * 1024 * 1024) {
        // Asíncrono pesado (docTR)
        const asyncRes = await fetch('/api/ingestion/process-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingestion_id: data.id,
            url: publicUrl,
            filename: file.name
          })
        });
        
        if (asyncRes.ok) {
          alert("¡El PDF es muy pesado! Se envió al agente Python (docTR) en background. Verás el progreso en la tabla pronto.");
          fetchIngestions();
        } else {
          alert("Error encolando procesamiento asíncrono.");
        }
      } else {
        // Síncrono rápido (pdf-parse)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ingestion_id', data.id);
        
        const procRes = await fetch('/api/ingestion/process', {
          method: 'POST',
          body: formData
        });
        
        const procData = await procRes.json();
        
        if (procData.success) {
          alert(`¡Normativa digital procesada con éxito! Se extrajeron ${procData.chunks} fragmentos.`);
          fetchIngestions();
        } else {
          alert(`Error del agente procesador: ${procData.error}`);
        }
      }
      
    } catch (err: any) {
      alert("Error procesando archivo: " + err.message);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de ingesta de ${filename}? Esto borrará también los nodos extraídos del grafo.`)) return;
    
    setIsDeleting(id);
    try {
      // Borrar del grafo
      await supabase.from('relations').delete().contains('metadata', { ingestion_id: id });
      await supabase.from('entities').delete().contains('metadata', { ingestion_id: id });
      
      // Borrar de storage (no fallar si no existe)
      await supabase.storage.from('ingestions').remove([`documents/${id}_${filename}`]);
      
      // Borrar registro
      const { error } = await supabase.from('file_ingestions').delete().eq('id', id);
      if (error) throw error;
      
      setIngestions(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert("Error eliminando ingesta: " + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="bg-[#121216] border border-white/5 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Registro de Ingestas</h2>
        <label className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors">
          Subir Archivo
          <input type="file" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
              <th className="p-3">Archivo</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Hash (SHA-256)</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Fecha</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Cargando...</td></tr>
            ) : ingestions.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay archivos registrados.</td></tr>
            ) : (
              ingestions.map(ing => (
                <tr key={ing.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-semibold text-gray-200">{ing.filename}</td>
                  <td className="p-3">
                    <span className="bg-white/10 text-xs px-2 py-1 rounded text-gray-400">{ing.file_type}</span>
                  </td>
                  <td className="p-3 text-xs text-gray-500 font-mono" title={ing.file_hash}>
                    {ing.file_hash.substring(0, 12)}...
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      ing.status === 'UPLOADED' ? 'bg-blue-500/20 text-blue-400' :
                      ing.status === 'PROCESSED' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {ing.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-400">
                    {new Date(ing.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => handleDelete(ing.id, ing.filename)}
                      disabled={isDeleting === ing.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors text-xs font-bold"
                    >
                      {isDeleting === ing.id ? 'Borrando...' : 'Borrar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
