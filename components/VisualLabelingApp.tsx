"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, ChevronLeft, ChevronRight, Map as MapIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useMap } from 'react-leaflet';

// Leaflet necesita importarse dinámicamente sin SSR
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(m => m.GeoJSON), { ssr: false });

type PendingEntity = {
  id: string;
  name: string;
  metadata: any;
  geom: string;
  geojson?: any;
};

// Utilidad para parsear POLYGON y MULTIPOLYGON WKT a GeoJSON (o retornar si ya es objeto)
function wktToGeoJSON(wkt: any) {
  try {
    if (!wkt) return null;
    
    // Si la base de datos ya lo retorna como GeoJSON (Objeto) en lugar de WKT
    if (typeof wkt === 'object') {
      // Supabase a veces lo devuelve envuelto o como el feature en sí
      return wkt.type === 'Feature' ? wkt : {
        type: "Feature",
        properties: {},
        geometry: wkt
      };
    }

    if (typeof wkt !== 'string') return null;
    
    if (wkt.startsWith('MULTIPOLYGON')) {
      const content = wkt.replace('MULTIPOLYGON', '').trim().slice(1, -1);
      const polys = content.split(')), ((').map(p => p.replace(/\(|\)/g, ''));
      const coordinates = polys.map(poly => {
        return [poly.split(',').map(s => s.trim().split(' ').map(Number))];
      });
      return {
        type: "Feature",
        properties: {},
        geometry: { type: "MultiPolygon", coordinates }
      };
    } 
    else if (wkt.startsWith('POLYGON')) {
      const content = wkt.replace('POLYGON', '').replace(/\(|\)/g, '');
      const pairs = content.split(',').map(s => s.trim().split(' ').map(Number));
      return {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [pairs] }
      };
    }
    return null;
  } catch (e) {
    console.error("WKT Parse Error", e);
    return null;
  }
}

// Componente para auto-centrar el mapa en la parcela
function MapAutoCenter({ geojson }: { geojson: any }) {
  const map = useMap();
  useEffect(() => {
    try {
      if (geojson && geojson.geometry) {
        let coords: any[] = [];
        if (geojson.geometry.type === 'Polygon') {
          coords = geojson.geometry.coordinates[0];
        } else if (geojson.geometry.type === 'MultiPolygon') {
          coords = geojson.geometry.coordinates[0][0]; // Primer anillo del primer polígono
        }
        
        if (coords && coords.length > 0) {
          const lats = coords.map((c: any) => c[1]);
          const lons = coords.map((c: any) => c[0]);
          const bounds = [
            [Math.min(...lats), Math.min(...lons)],
            [Math.max(...lats), Math.max(...lons)]
          ];
          map.fitBounds(bounds as any, { padding: [50, 50] });
        }
      }
    } catch (e) {
      console.error("AutoCenter Error", e);
    }
  }, [geojson, map]);
  return null;
}

export default function VisualLabelingApp() {
  const [entities, setEntities] = useState<PendingEntity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchPendingEntities();
  }, []);

  async function fetchPendingEntities() {
    setLoading(true);
    // Buscamos tanto parcelas pendientes como planos/imágenes pendientes de categorizar
    const { data, error } = await supabase
      .from('entities')
      .select('id, name, type, metadata, geom')
      .in('type', ['PARCELA', 'PLANO', 'IMAGEN'])
      .contains('metadata', { pipeline_status: 'REQUIERE_ETIQUETADO_VISUAL' })
      .order('created_at', { ascending: false });
    
    if (data) {
      const parsedData = data.map(d => ({
        ...d,
        geojson: d.geom && d.type === 'PARCELA' ? wktToGeoJSON(d.geom) : null
      }));
      setEntities(parsedData);
    }
    setLoading(false);
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (entities.length === 0 || isUpdating) return;
    setIsUpdating(true);
    
    const currentEntity = entities[currentIndex];
    try {
      const res = await fetch('/api/entities/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentEntity.id, newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error desconocido');
      }

      // Quitar de la lista y ajustar el índice
      const newEntities = entities.filter((_, idx) => idx !== currentIndex);
      setEntities(newEntities);
      
      if (currentIndex >= newEntities.length && newEntities.length > 0) {
        setCurrentIndex(newEntities.length - 1);
      }
    } catch (error: any) {
      alert("Error actualizando estado: " + error.message);
    }
    setIsUpdating(false);
  };

  const handleNext = () => {
    if (currentIndex < entities.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse font-bold">Cargando bandeja de parcelas...</div>;
  }

  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8 bg-[#121216] border border-white/5 rounded-2xl">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Bandeja Vacía</h2>
        <p className="text-gray-400">No hay parcelas pendientes de revisión visual. El sistema está al día.</p>
      </div>
    );
  }

  const currentEntity = entities[currentIndex];
  const areaHa = currentEntity.metadata?.area ? (currentEntity.metadata.area / 10000).toFixed(2) : 'N/A';

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[80vh]">
      {/* Sidebar - Lista de Parcelas */}
      <div className="w-full md:w-1/3 flex flex-col bg-[#121216] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-black/40">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Cola de Revisión
          </h2>
          <p className="text-xs text-gray-400 mt-1">{entities.length} parcelas pendientes</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {entities.map((ent, idx) => {
            const isParcela = ent.type === 'PARCELA';
            return (
              <button
                key={ent.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  idx === currentIndex 
                    ? 'bg-orange-500/20 border-orange-500/50' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`font-bold text-sm ${idx === currentIndex ? 'text-orange-400' : 'text-gray-300'}`}>
                    {ent.name}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isParcela ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {ent.type}
                  </span>
                </div>
                {isParcela ? (
                  <p className="text-xs text-gray-500 font-mono">{ent.metadata?.nomenclatura || 'Sin Nomenclatura'}</p>
                ) : (
                  <p className="text-xs text-gray-500 truncate">{ent.metadata?.filename || 'Documento adjunto'}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Area - Mapa y Controles */}
      <div className="w-full md:w-2/3 flex flex-col bg-[#121216] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Info Header */}
        <div className="p-5 bg-black/60 border-b border-white/10 z-10 absolute top-0 w-full flex justify-between items-start backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {currentEntity.name}
              <span className={`text-xs px-2 py-1 rounded font-bold ${currentEntity.type === 'PARCELA' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {currentEntity.type}
              </span>
            </h1>
            <div className="flex gap-4 mt-2 text-sm">
              {currentEntity.type === 'PARCELA' ? (
                <>
                  <span className="text-gray-400 font-mono">Nom: <span className="text-white">{currentEntity.metadata?.nomenclatura}</span></span>
                  <span className="text-gray-400">Área: <span className="text-emerald-400 font-bold">{areaHa} ha</span></span>
                </>
              ) : (
                <span className="text-gray-400">Archivo: <span className="text-white">{currentEntity.metadata?.filename || 'Desconocido'}</span></span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-30 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
            <span className="flex items-center text-sm font-bold text-gray-400 px-2">{currentIndex + 1} / {entities.length}</span>
            <button onClick={handleNext} disabled={currentIndex === entities.length - 1} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-30 transition-colors"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>

        {/* Área de Visualización Dinámica */}
        <div className="flex-1 bg-[#0F0F11] relative z-0">
          {currentEntity.type === 'PARCELA' ? (
            /* VISOR DE MAPA PARA PARCELAS */
            typeof window !== 'undefined' && currentEntity.geojson ? (
              <MapContainer center={[-34.9205, -57.9536]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                <GeoJSON key={`geo-${currentEntity.id}`} data={currentEntity.geojson} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.2, weight: 3 }} />
                <MapAutoCenter geojson={currentEntity.geojson} />
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <MapIcon className="w-8 h-8 opacity-50 mb-2" />
                <p>Sin geometría para mostrar</p>
              </div>
            )
          ) : (
            /* VISOR DE PLANOS / IMÁGENES */
            <div className="flex flex-col items-center justify-center h-full bg-[#1A1A24] p-8 text-center relative">
              <div className="absolute top-4 left-4 flex gap-2">
                {/* Herramientas de dibujo para planos */}
                <button className="bg-white/10 hover:bg-white/20 p-2 rounded text-white text-xs font-bold transition-colors">🖍️ Dibujar Polígono</button>
                <button className="bg-white/10 hover:bg-white/20 p-2 rounded text-white text-xs font-bold transition-colors">🏷️ Agregar Label</button>
                <button className="bg-white/10 hover:bg-white/20 p-2 rounded text-white text-xs font-bold transition-colors">✂️ Segmentar Zona</button>
              </div>
              
              {currentEntity.metadata?.url ? (
                <img src={currentEntity.metadata.url} alt="Plano" className="max-h-full max-w-full object-contain border border-white/10 shadow-2xl rounded" />
              ) : (
                <div className="border-2 border-dashed border-gray-700 rounded-2xl w-full max-w-md h-64 flex flex-col items-center justify-center text-gray-500">
                  <span className="text-4xl mb-4">📄</span>
                  <p>Visualizador de Planos PDF / Imagen</p>
                  <p className="text-xs mt-2">El archivo se cargará aquí para segmentación.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Panel Condicional */}
        <div className="p-4 bg-black/60 border-t border-white/10 z-10 absolute bottom-0 w-full backdrop-blur-md flex justify-center gap-6">
          {currentEntity.type === 'PARCELA' ? (
            <>
              <button onClick={() => handleUpdateStatus('RECHAZADO_VISUAL')} disabled={isUpdating} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100">
                <X className="w-5 h-5" /> Rechazar (Baldío)
              </button>
              <button onClick={() => handleUpdateStatus('CONFIRMADO_VISUAL')} disabled={isUpdating} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100">
                <Check className="w-5 h-5" /> Validar (Desarrollo)
              </button>
            </>
          ) : (
            <>
              <select className="bg-gray-900 border border-white/20 text-white rounded-lg px-4 py-2 text-sm font-bold outline-none">
                <option>Seleccionar Categoría del Plano...</option>
                <option>Plano de Subdivisión</option>
                <option>Plano de Obra</option>
                <option>Croquis Irregular</option>
              </select>
              <button onClick={() => handleUpdateStatus('PLANO_ETIQUETADO')} disabled={isUpdating} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100">
                <Check className="w-5 h-5" /> Guardar Etiquetas y Continuar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
