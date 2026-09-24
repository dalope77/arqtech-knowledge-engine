import { Database, Search, Filter, MoreHorizontal, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // Disable static rendering

export default async function EntitiesPage() {
  const { data: entities, error } = await supabase
    .from('entities')
    .select('*')
    .order('created_at', { ascending: false });

  const safeEntities = entities || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-500" />
            Entities
          </h2>
          <p className="text-gray-400 mt-1">Manage and inspect all entities in the knowledge graph.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium transition-all">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20">
            Create Entity
          </button>
        </div>
      </div>

      <div className="bg-[#0F0F11] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex gap-4 bg-black/40">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search entities by name or UUID..." 
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/60 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {safeEntities.map((entity: any) => (
                <tr key={entity.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{entity.name}</span>
                      <span className="text-xs text-gray-500 font-mono mt-0.5">{entity.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider border border-white/10 bg-white/5 text-gray-300">
                      {entity.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(entity.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-emerald-500`} />
                      <span className="text-sm text-gray-300">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing <span className="font-medium text-white">{safeEntities.length}</span> entities</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-gray-400 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-white hover:bg-white/10">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
