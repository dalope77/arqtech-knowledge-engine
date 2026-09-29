"use client";

import { useState, useEffect } from 'react';
import { Map, Layers, Satellite, Database, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SatelliteAgentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [barrios, setBarrios] = useState<any[]>([]);
  const [selectedBarrioId, setSelectedBarrioId] = useState<string>('');

  useEffect(() => {
    async function loadBarrios() {
      const { data } = await supabase
        .from('entities')
        .select('id, name')
        .eq('type', 'BARRIO_CERRADO')
        .limit(200);
      
      if (data) setBarrios(data);
    }
    loadBarrios();
  }, []);

  const handleRunAnalysis = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Mocking parameters for La Plata region
      const payload = selectedBarrioId ? {
        t1_url: "s3://arqtech-imagery/LP_2020.tif",
        t2_url: "s3://arqtech-imagery/LP_2026.tif",
        entity_id: selectedBarrioId
      } : {
        t1_url: "s3://arqtech-imagery/LP_2020.tif",
        t2_url: "s3://arqtech-imagery/LP_2026.tif",
        region_wkt: "POLYGON((-57.95 -34.92, -57.94 -34.92, -57.94 -34.93, -57.95 -34.93, -57.95 -34.92))"
      };

      const res = await fetch('/api/agents/satellite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to connect to the agent API' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Satellite className="w-8 h-8 text-blue-500" />
          Satellite & Urban Growth Agent
        </h1>
        <p className="text-muted-foreground mt-2">
          Orquesta el análisis geoespacial de imágenes satelitales temporales (T1 ➡️ T2) para detectar crecimiento de la mancha urbana.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-500" />
              Parámetros de Análisis (MVP)
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-muted p-4 rounded-md space-y-4 text-sm">
              <div className="space-y-1">
                <label className="font-semibold text-gray-300">Seleccionar Región / Barrio:</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
                  value={selectedBarrioId}
                  onChange={(e) => setSelectedBarrioId(e.target.value)}
                >
                  <option value="">-- Usar Bounding Box (La Plata Sur MVP) --</option>
                  {barrios.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <p><strong>Periodo:</strong> 2020 vs 2026</p>
                <p><strong>Modelo:</strong> Spectral Diff (NDBI)</p>
              </div>
            </div>
            
            
            <button 
              onClick={handleRunAnalysis} 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'Procesando Imágenes...' : 'Ejecutar Análisis Temporal'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              Resultados y PostGIS
            </h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-muted-foreground animate-pulse">Contactando Microservicio Python...</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {result.success ? (
                  <>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-md">
                      <p className="text-emerald-600 font-semibold mb-1">✅ Áreas de Crecimiento Guardadas</p>
                      <p className="text-sm text-emerald-600/80">Agent Run: {result.run_id}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4 text-orange-500" />
                        Discovery Engine (Parcelas Afectadas)
                      </h4>
                      {result.intersecting_parcels?.length > 0 ? (
                        <ul className="text-sm space-y-1 list-disc list-inside bg-muted p-3 rounded-md">
                          {result.intersecting_parcels.map((p: any) => (
                            <li key={p.id}>{p.id} - {p.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No se encontraron parcelas colisionando con el área de crecimiento detectada.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-red-500/10 p-4 rounded-md text-red-600 text-sm">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-md">
                El resultado aparecerá aquí
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
