"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Polyline, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    async function loadData() {
      // Fetch some Barrios and Inmuebles with coordinates
      const { data: entData } = await supabase.from('entities').select('*').limit(1000);
      let validEntities = [];
      if (entData) {
        validEntities = entData.filter(e => e.metadata?.lat && e.metadata?.lon);
        setEntities(validEntities);
      }

      // Fetch relations
      const { data: relData } = await supabase.from('relations').select('*').limit(1000);
      if (relData && validEntities.length > 0) {
        // Map relations to coordinates
        const entityMap = new Map(validEntities.map(e => [e.id, { lat: parseFloat(e.metadata.lat), lon: parseFloat(e.metadata.lon) }]));
        
        const validRelations = relData.filter(r => entityMap.has(r.from_entity_id) && entityMap.has(r.to_entity_id)).map(r => ({
          ...r,
          fromCoords: entityMap.get(r.from_entity_id),
          toCoords: entityMap.get(r.to_entity_id)
        }));
        
        setRelations(validRelations);
      }

      // Fetch Real Spatial Geometries from PostGIS via RPC
      const { data: spatialData } = await supabase.rpc('get_entities_geojson');
      if (spatialData) {
        setSpatialPolygons(spatialData);
      }
    }
    loadData();
  }, []);

  return (
    <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-0">
      <MapContainer 
        center={[-34.9205, -57.9536]} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#0F0F11' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
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

        {spatialPolygons.map(poly => {
          const isGrowth = poly.type === 'URBAN_GROWTH_AREA';
          return (
            <GeoJSON 
              key={`poly-${poly.id}`}
              data={poly.geojson}
              pathOptions={{ 
                color: isGrowth ? '#f43f5e' : '#3b82f6', 
                fillColor: isGrowth ? '#f43f5e' : '#3b82f6',
                fillOpacity: 0.3,
                weight: 2
              }}
            >
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
            </GeoJSON>
          );
        })}

        {entities.map(entity => {
          const lat = parseFloat(entity.metadata.lat);
          const lon = parseFloat(entity.metadata.lon);
          if (isNaN(lat) || isNaN(lon)) return null;

          const isBarrio = entity.type === 'BARRIO';
          
          return (
            <CircleMarker 
              key={entity.id} 
              center={[lat, lon]} 
              radius={isBarrio ? 8 : 4}
              color={isBarrio ? '#3b82f6' : '#10b981'} 
              fillOpacity={0.6}
            >
              <Popup>
                <div className="p-1 text-gray-800">
                  <h3 className="font-bold text-sm">{entity.name}</h3>
                  <p className="text-xs text-gray-500">{entity.type}</p>
                  {entity.metadata.precio && <p className="text-emerald-600 font-bold mt-1">USD {entity.metadata.precio}</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
