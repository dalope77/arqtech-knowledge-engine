import React from 'react';
import VisualLabelingApp from '@/components/VisualLabelingApp';

export const metadata = {
  title: 'Visual Labeling | ArqTech',
};

export default function VisualLabelingPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Etiquetado Visual</h1>
          <p className="text-sm text-gray-400 mt-1">
            Revisión y validación de parcelas detectadas por el sistema.
          </p>
        </div>
      </div>
      
      <div className="flex-1">
        <VisualLabelingApp />
      </div>
    </div>
  );
}
