import React from 'react';
import IngestionComponent from '@/components/IngestionComponent';

export const metadata = {
  title: 'Ingesta de Archivos | ArqTech',
};

export default function IngestionPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Ingesta de Datos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestión y registro de archivos (KML, GeoJSON, Shapes, PDFs).
          </p>
        </div>
      </div>
      
      <IngestionComponent />
    </div>
  );
}
