"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Polyline, GeoJSON, useMapEvents, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { useRef } from 'react';

// Fix Leaflet default icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapComponent() {
  const [entities, setEntities] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [spatialPolygons, setSpatialPolygons] = useState<any[]>([]);
  
  const searchParams = useSearchParams();
  const highlightEntityId = searchParams?.get('entityId');
  const mapRef = useRef<L.Map | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'osm' | 'satellite'>('satellite');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [layerColors, setLayerColors] = useState<Record<string, string>>({
    'BARRIO_CERRADO': '#a855f7', // purple
    'BARRIO': '#3b82f6', // blue
    'URBAN_GROWTH_AREA': '#f43f5e', // rose
    'PARCELA': '#10b981', // emerald
    'LOTE': '#f59e0b', // amber
  });
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(Object.keys(layerColors)));
  const [availableLayers, setAvailableLayers] = useState<Set<string>>(new Set());
  const [showLabels, setShowLabels] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  const toggleLayer = (layer: string) => {
    setVisibleLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!selectedEntity) return;
    await handleDirectDelete(selectedEntity);
  };

  const handleDirectDelete = async (entity: any) => {
    if (!window.confirm(`¿Seguro que deseas borrar ${entity.name}?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/entities/${entity.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSpatialPolygons(prev => prev.filter(p => p.id !== entity.id));
        setEntities(prev => prev.filter(e => e.id !== entity.id));
        if (selectedEntity?.id === entity.id) setSelectedEntity(null);
      } else {
        const data = await res.json();
        alert(`Error al borrar la entidad: ${data.error || 'Desconocido'}`);
      }
    } catch(e: any) {
      alert(`Error de red al borrar: ${e.message}`);
    }
    setIsDeleting(false);
  };

  const handleRunDiscovery = async () => {
    if (!mapRef.current) return;
    
    // Get bounds: minLon, minLat, maxLon, maxLat
    const bounds = mapRef.current.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    
    setIsDiscovering(true);
    setDiscoveryResult(null);
    try {
      const res = await fetch('/api/pipeline/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox })
      });
      const data = await res.json();
      
      if (data.success) {
        setDiscoveryResult(`Pipeline finalizado.\n${data.output}`);
        // Optionally reload data to show new entity, we can just force a reload
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setDiscoveryResult(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setDiscoveryResult(`Error de red: ${e.message}`);
    }
    setIsDiscovering(false);
  };

  useEffect(() => {
    // Solo carga de highlight, el resto lo hace MapEvents
    if (highlightEntityId) {
      loadHighlight(highlightEntityId);
    }
  }, [highlightEntityId]);

  async function loadHighlight(id: string) {
    const { data: ent } = await supabase.from('entities').select('*').eq('id', id).single();
    if (ent && mapRef.current) {
      let lat = parseFloat(ent.metadata?.lat);
      let lon = parseFloat(ent.metadata?.lon);
      if (!lat && ent.geom) {
        // A very basic centroid extraction if it's a polygon and we have geom
        // For accurate centering, the backend could send a centroid, but let's try
      }
      if (lat && lon) {
        mapRef.current.flyTo([lat, lon], 16, { duration: 1.5 });
      }
    }
  }

  async function loadData(bbox: string) {
    try {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(parseFloat);
      
      const { data: spatialData } = await supabase.rpc('get_entities_in_bbox', {
        min_lon: minLon,
        min_lat: minLat,
        max_lon: maxLon,
        max_lat: maxLat
      });

      if (spatialData) {
        const points: any[] = [];
        const polygons: any[] = [];
        const entityMap = new Map();

        for (const item of spatialData) {
          entityMap.set(item.id, item);
          const geomType = item.geojson?.type;
          
          if (geomType === 'Point') {
            const [lon, lat] = item.geojson.coordinates;
            item.metadata = { ...item.metadata, lat, lon };
            points.push(item);
          } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
            polygons.push(item);
          }
        }
        
        // Update available layers based on fetched data
        const types = new Set<string>();
        spatialData.forEach((i: any) => types.add(i.type));
        setAvailableLayers(prev => new Set([...prev, ...types]));

        setEntities(points);
        setSpatialPolygons(polygons);

        // Fetch relations for these entities
        const ids = spatialData.map((e: any) => e.id);
        if (ids.length > 0) {
          // Relaciones donde al menos uno de los nodos está en el bbox
          const { data: relData } = await supabase
            .from('relations')
            .select('*')
            .or(`from_entity_id.in.(${ids.join(',')}),to_entity_id.in.(${ids.join(',')})`)
            .limit(1000);

          if (relData) {
            // Fetch missing endpoints
            const missingIds = new Set<string>();
            relData.forEach(r => {
              if (!entityMap.has(r.from_entity_id)) missingIds.add(r.from_entity_id);
              if (!entityMap.has(r.to_entity_id)) missingIds.add(r.to_entity_id);
            });

            if (missingIds.size > 0) {
              const { data: extraEnts } = await supabase.from('entities').select('id, geom').in('id', Array.from(missingIds));
              if (extraEnts) {
                // VERY simplified centroid for endpoints
                extraEnts.forEach(e => {
                  entityMap.set(e.id, { id: e.id, geojson: e.geom });
                });
              }
            }

            const getCoords = (id: string) => {
              const e = entityMap.get(id);
              if (e?.metadata?.lat && e?.metadata?.lon) return { lat: parseFloat(e.metadata.lat), lon: parseFloat(e.metadata.lon) };
              if (e?.geojson?.type === 'Point') return { lat: e.geojson.coordinates[1], lon: e.geojson.coordinates[0] };
              if (e?.geojson?.coordinates?.[0]?.[0]) return { lat: e.geojson.coordinates[0][0][1], lon: e.geojson.coordinates[0][0][0] };
              return null;
            };

            const validRelations = relData.map(r => ({
              ...r,
              fromCoords: getCoords(r.from_entity_id),
              toCoords: getCoords(r.to_entity_id)
            })).filter(r => r.fromCoords && r.toCoords);
            
            setRelations(validRelations);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  function MapEvents() {
    const map = useMapEvents({
      moveend(e) {
        const bounds = e.target.getBounds();
        loadData(`${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`);
      }
    });

    useEffect(() => {
      if (map) {
        const bounds = map.getBounds();
        loadData(`${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`);
      }
    }, [map]);

    return null;
  }

  return (
    <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-0">
      
      {/* HUD for Discovery */}
      <div className="absolute top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs items-end pointer-events-auto">
        <button 
          onClick={handleRunDiscovery}
          disabled={isDiscovering}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all text-sm flex items-center gap-2"
        >
          {isDiscovering ? (
            <span className="animate-pulse">Escaneando área...</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Descubrir Barrios en esta Área
            </>
          )}
        </button>

        {discoveryResult && (
          <div className="bg-black/80 backdrop-blur-md p-3 rounded-lg border border-white/20 text-xs text-white max-h-60 overflow-y-auto whitespace-pre-wrap">
            {discoveryResult}
          </div>
        )}
      </div>

      {/* Control Panel (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-[9999] flex flex-col gap-2 pointer-events-auto max-w-xs">
        {/* Layer Controls */}
        <div className="bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Capas de Datos</h4>
          <div className="flex flex-col gap-2">
            {Array.from(availableLayers).map(layer => {
              const color = layerColors[layer] || '#6b7280';
              const isVisible = visibleLayers.has(layer);
              return (
                <div
                  key={layer}
                  className={`px-2 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-all ${isVisible ? 'text-white' : 'text-gray-500 bg-white/5 opacity-60'}`}
                  style={{ backgroundColor: isVisible ? color + '20' : undefined, border: `1px solid ${isVisible ? color + '80' : 'transparent'}` }}
                >
                  <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setLayerColors(prev => ({...prev, [layer]: e.target.value}))}
                    className="w-5 h-5 p-0 border-0 rounded cursor-pointer bg-transparent"
                    title="Cambiar color de capa"
                  />
                  <button onClick={() => toggleLayer(layer)} className="hover:text-white transition-colors text-left flex-1 outline-none">
                    {layer.replace(/_/g, ' ')}
                  </button>
                </div>
              );
            })}
            {availableLayers.size === 0 && <span className="text-xs text-gray-500">Mueve el mapa para cargar capas...</span>}
          </div>
          
          <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-300 cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} className="rounded border-gray-600 bg-black/50 accent-blue-500 w-4 h-4 cursor-pointer" />
              Mostrar Etiquetas (Nombres)
            </label>
            <label className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${deleteMode ? 'text-rose-400' : 'text-gray-400 hover:text-rose-400'}`}>
              <input type="checkbox" checked={deleteMode} onChange={e => setDeleteMode(e.target.checked)} className="rounded border-rose-600 bg-black/50 accent-rose-500 w-4 h-4 cursor-pointer" />
              Modo Borrador (Click para borrar)
            </label>
          </div>
        </div>

        {/* Map Style Controls */}
        <div className="bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 flex gap-2 shadow-2xl mt-2">
          <button 
            onClick={() => setMapStyle('osm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mapStyle === 'osm' ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-gray-400'}`}
          >
            OpenStreetMap
          </button>
          <button 
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mapStyle === 'satellite' ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-gray-400'}`}
          >
            Satélite (ESRI)
          </button>
        </div>

        {selectedEntity && (
          <div className="bg-black/90 backdrop-blur-xl p-4 rounded-xl border border-rose-500/30 shadow-2xl w-72 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-sm text-white">{selectedEntity.name}</h3>
            <p className="text-xs text-gray-400 mb-3">{selectedEntity.type}</p>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full bg-rose-600/80 hover:bg-rose-500 text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Borrando...' : 'Borrar Entidad (y referencias)'}
            </button>
          </div>
        )}
      </div>

      <MapContainer 
        ref={mapRef}
        center={[-34.9205, -57.9536]} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#0F0F11' }}
      >
        <MapEvents />
        {mapStyle === 'osm' ? (
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        
        {relations.map(rel => (
          <Polyline 
            key={rel.id}
            positions={[[rel.fromCoords.lat, rel.fromCoords.lon], [rel.toCoords.lat, rel.toCoords.lon]]}
            color="#a855f7"
            weight={2}
            opacity={0.6}
            dashArray="4"
          >
            <Popup>
              <div className="p-1 text-gray-800">
                <p className="font-bold text-xs">{rel.relation_type}</p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {spatialPolygons.filter(p => visibleLayers.has(p.type)).map(poly => {
          const isHighlighted = poly.id === highlightEntityId;
          let fillColor = layerColors[poly.type] || '#6b7280';
          if (isHighlighted) fillColor = '#fbbf24'; // Yellow highlight

          const featureData = {
            type: "Feature",
            properties: { id: poly.id, name: poly.name, type: poly.type },
            geometry: poly.geojson
          };

          return (
            <GeoJSON 
              key={`poly-${poly.id}`}
              data={featureData as any}
              pathOptions={{ 
                color: fillColor, 
                fillColor: fillColor,
                fillOpacity: isHighlighted ? 0.6 : 0.3,
                weight: isHighlighted ? 4 : 2
              }}
              eventHandlers={{
                click: (e) => {
                  if (deleteMode) {
                    L.DomEvent.stopPropagation(e as any);
                    handleDirectDelete(poly);
                  } else {
                    setSelectedEntity(poly);
                  }
                },
                popupclose: () => setSelectedEntity(null)
              }}
            >
              {!deleteMode && (
                <Popup>
                  <div className="p-1 text-gray-800">
                    <h3 className="font-bold text-sm">{poly.name}</h3>
                    <p className="text-xs text-gray-500">{poly.type}</p>
                    {poly.metadata?.area_m2 && (
                      <p className="text-rose-600 font-bold mt-1">
                        Área: {(poly.metadata.area_m2 / 10000).toFixed(2)} ha
                      </p>
                    )}
                  </div>
                </Popup>
              )}
              {showLabels && (
                <Tooltip permanent direction="center" className="bg-transparent border-0 text-white font-bold text-xs shadow-none marker-label" opacity={0.95}>
                  <span style={{ textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black' }}>{poly.name}</span>
                </Tooltip>
              )}
            </GeoJSON>
          );
        })}

        {entities.filter(e => visibleLayers.has(e.type)).map(entity => {
          const lat = parseFloat(entity.metadata.lat);
          const lon = parseFloat(entity.metadata.lon);
          if (isNaN(lat) || isNaN(lon)) return null;

          const isHighlighted = entity.id === highlightEntityId;
          
          let markerColor = layerColors[entity.type] || '#6b7280';
          if (isHighlighted) markerColor = '#fbbf24'; // Yellow highlight
          
          return (
            <CircleMarker 
              key={entity.id} 
              center={[lat, lon]} 
              radius={isHighlighted ? 12 : 6}
              color={markerColor} 
              fillOpacity={isHighlighted ? 0.9 : 0.6}
              eventHandlers={{
                click: (e) => {
                  if (deleteMode) {
                    L.DomEvent.stopPropagation(e as any);
                    handleDirectDelete(entity);
                  } else {
                    setSelectedEntity(entity);
                  }
                },
                popupclose: () => setSelectedEntity(null)
              }}
            >
              {!deleteMode && (
                <Popup>
                  <div className="p-1 text-gray-800">
                    <h3 className="font-bold text-sm">{entity.name}</h3>
                    <p className="text-xs text-gray-500">{entity.type}</p>
                    {entity.metadata.precio && <p className="text-emerald-600 font-bold mt-1">USD {entity.metadata.precio}</p>}
                  </div>
                </Popup>
              )}
              {showLabels && (
                <Tooltip permanent direction="bottom" offset={[0, 10]} className="bg-transparent border-0 text-white font-bold text-xs shadow-none marker-label" opacity={0.95}>
                  <span style={{ textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black' }}>{entity.name}</span>
                </Tooltip>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
