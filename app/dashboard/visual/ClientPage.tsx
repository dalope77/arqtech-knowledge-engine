'use client';

import React, { useState } from 'react';
import { VisualAnnotator } from '@/components/visual/VisualAnnotator';
import { VisualTaxonomy } from '@/types';

const initialTaxonomies: VisualTaxonomy[] = [
  { id: 'tax_1', category: 'PLANO', label: 'COTA' },
  { id: 'tax_2', category: 'PLANO', label: 'ROTULO' },
  { id: 'tax_3', category: 'PLANO', label: 'AMBIENTE' }
];

interface ImageAsset {
  name: string;
  dataUri: string;
}

export default function ClientPage({ images }: { images: ImageAsset[] }) {
  const [selectedImageName, setSelectedImageName] = useState(images[0]?.name || '');
  const [savedAnnotations, setSavedAnnotations] = useState<any[]>([]);
  const [taxonomies, setTaxonomies] = useState<VisualTaxonomy[]>(initialTaxonomies);
  
  const [newCat, setNewCat] = useState('PLANO');
  const [newLabel, setNewLabel] = useState('');

  const selectedImageObj = images.find(img => img.name === selectedImageName);

  const handleSave = (annotations: any[]) => {
    setSavedAnnotations(annotations);
    alert(`¡Se guardaron ${annotations.length} anotaciones con éxito en la base de datos de entrenamiento!`);
  };

  const handleAddTaxonomy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel) return;
    const newTax: VisualTaxonomy = {
      id: `tax_${Date.now()}`,
      category: newCat as any,
      label: newLabel.toUpperCase()
    };
    setTaxonomies([...taxonomies, newTax]);
    setNewLabel('');
  };

  if (images.length === 0) {
    return <div className="p-8 text-white">No se encontraron imágenes en la carpeta public.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
          Entrenamiento Continuo: Visual Ingestion
        </h1>
        <p className="text-gray-400 mb-8">
          Selecciona uno de los planos municipales y dibuja Bounding Boxes.
        </p>

        <div className="flex flex-wrap gap-8 mb-6">
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-300">Seleccionar Imagen:</label>
            <select 
              className="bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white"
              value={selectedImageName}
              onChange={(e) => setSelectedImageName(e.target.value)}
            >
              {images.map(img => (
                <option key={img.name} value={img.name}>{img.name}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddTaxonomy} className="flex flex-col gap-2">
            <label className="font-semibold text-gray-300">Crear Nueva Categoría (Taxonomía):</label>
            <div className="flex gap-2">
              <select 
                className="bg-gray-800 border border-gray-700 rounded px-2 text-white"
                value={newCat} onChange={e => setNewCat(e.target.value)}
              >
                <option value="PLANO">PLANO</option>
                <option value="MAPA">MAPA</option>
                <option value="TABLA">TABLA</option>
                <option value="GENERAL">GENERAL</option>
              </select>
              <input 
                type="text" 
                placeholder="Ej. PUERTA, MANZANA" 
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-bold">
                Agregar
              </button>
            </div>
          </form>
        </div>

        <div className="mb-8">
          {selectedImageObj && (
            <VisualAnnotator 
              key={selectedImageObj.name + taxonomies.length}
              imageUrl={selectedImageObj.dataUri} 
              taxonomies={taxonomies} 
              onSave={handleSave} 
            />
          )}
        </div>

        {savedAnnotations.length > 0 && (
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h3 className="text-lg font-bold mb-2 text-emerald-400">Anotaciones Generadas (JSON)</h3>
            <pre className="text-xs text-gray-400 overflow-auto max-h-40">
              {JSON.stringify(savedAnnotations, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
