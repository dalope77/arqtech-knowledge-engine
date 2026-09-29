'use client';

import React, { useState, useRef, useEffect } from 'react';
import { VisualAnnotation, VisualTaxonomy } from '@/types';

interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AnnotatorProps {
  imageUrl: string;
  initialAnnotations?: VisualAnnotation[];
  taxonomies: VisualTaxonomy[];
  onSave: (annotations: Omit<VisualAnnotation, 'id' | 'created_at'>[]) => void;
}

export const VisualAnnotator: React.FC<AnnotatorProps> = ({ imageUrl, initialAnnotations = [], taxonomies, onSave }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<any[]>(initialAnnotations);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BBox | null>(null);
  
  // Selected taxonomy for new box
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string>(taxonomies[0]?.id || '');

  const getMousePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos) return;
    const pos = getMousePos(e);
    
    setCurrentBox({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.w > 10 && currentBox.h > 10) {
      // Add the new annotation
      const newAnnotation = {
        taxonomy_id: selectedTaxonomy,
        bbox: [currentBox.x, currentBox.y, currentBox.w, currentBox.h] as [number, number, number, number],
        used_in_training: false,
        created_by: 'human_reviewer'
      };
      setAnnotations([...annotations, newAnnotation]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
    setStartPos(null);
  };

  const handleSave = () => {
    onSave(annotations);
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-gray-900/50 text-white shadow-xl">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          ArqTech Visual Active Learning (HITL)
        </h3>
        
        <div className="flex gap-4 items-center">
          <select 
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
            value={selectedTaxonomy}
            onChange={(e) => setSelectedTaxonomy(e.target.value)}
          >
            {taxonomies.map(t => (
              <option key={t.id} value={t.id}>{t.category} - {t.label}</option>
            ))}
          </select>
          <button 
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1 rounded transition-colors text-sm font-semibold"
          >
            Guardar Anotaciones
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Instrucciones: Haz clic y arrastra sobre la imagen para dibujar una nueva región (Bounding Box). Luego guarda para retroalimentar al modelo.
      </p>

      {/* Drawing Canvas Area */}
      <div 
        ref={containerRef}
        className="relative border border-gray-700 overflow-hidden cursor-crosshair bg-white rounded-lg"
        style={{ width: '100%', maxWidth: '800px', height: '600px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          src={imageUrl} 
          alt="Document to annotate" 
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none z-10"
          onError={(e) => console.error("Error loading image in VisualAnnotator:", imageUrl, e)}
        />

        {/* Existing Annotations */}
        {annotations.map((ann, idx) => (
          <div
            key={idx}
            className="absolute border-2 border-emerald-500 bg-emerald-500/20 z-20"
            style={{
              left: `${ann.bbox[0]}px`,
              top: `${ann.bbox[1]}px`,
              width: `${ann.bbox[2]}px`,
              height: `${ann.bbox[3]}px`
            }}
          >
            <span className="absolute -top-6 left-0 bg-emerald-500 text-black text-xs font-bold px-1 rounded">
              {taxonomies.find(t => t.id === ann.taxonomy_id)?.label || ann.taxonomy_id}
            </span>
          </div>
        ))}

        {/* Current Drawing Box */}
        {currentBox && (
          <div
            className="absolute border-2 border-blue-400 bg-blue-400/30 border-dashed"
            style={{
              left: `${currentBox.x}px`,
              top: `${currentBox.y}px`,
              width: `${currentBox.w}px`,
              height: `${currentBox.h}px`
            }}
          />
        )}
      </div>
    </div>
  );
};
