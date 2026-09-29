"use client";

import { useState, useRef, useEffect, useTransition } from 'react';
import { MoreHorizontal, Edit2, Trash2, Copy, Loader2 } from 'lucide-react';
import { deleteEntity } from './actions';

export default function EntityActions({ entityId }: { entityId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = () => {
    setIsOpen(false);
    if (confirm(`¿Estás seguro de que quieres eliminar la entidad ${entityId}?`)) {
      startTransition(async () => {
        try {
          await deleteEntity(entityId);
        } catch (error) {
          alert('Error al eliminar la entidad');
        }
      });
    }
  };

  const handleCopy = () => {
    setIsOpen(false);
    navigator.clipboard.writeText(entityId);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 focus:outline-none disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <MoreHorizontal className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#1A1A1D] border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="py-1">
            <button 
              onClick={handleCopy}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar ID
            </button>
            <div className="h-px bg-white/10 my-1" />
            <button 
              onClick={handleDelete}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Entidad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
