"use client";

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function MapPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full">
      <div className="flex items-center gap-3">
        <MapPin className="w-8 h-8 text-emerald-500" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Spatial View</h2>
          <p className="text-gray-400 mt-1">Visualiza los Barrios y parcelas cargadas en el mapa geográfico.</p>
        </div>
      </div>
      
      <MapComponent />
    </div>
  );
}
