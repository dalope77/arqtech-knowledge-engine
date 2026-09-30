import { Database, Search, Filter, MoreHorizontal, Download } from 'lucide-react';
import { getServiceRoleClient } from '@/lib/supabase';
import EntityActions from './EntityActions';

import Link from 'next/link';

export const revalidate = 0; // Disable static rendering

export default async function EntitiesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const resolvedParams = await searchParams;
  const page = Number(resolvedParams?.page || '1');
  const limit = 50;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const supabase = getServiceRoleClient();
  const { data: entities, count, error } = await supabase
    .from('entities')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  const safeEntities = entities || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

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
                      <Link href={`/dashboard/map?entityId=${entity.id}`} className="font-medium text-white hover:text-blue-400 hover:underline transition-colors">
                        {entity.name}
                      </Link>
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
                    <EntityActions entityId={entity.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-white">{safeEntities.length}</span> of <span className="font-medium text-white">{totalCount}</span> entities
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/dashboard/entities?page=${page - 1}`} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-white hover:bg-white/10">
                Previous
              </Link>
            ) : (
              <button className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-gray-400 disabled:opacity-50" disabled>Previous</button>
            )}
            
            <span className="px-3 py-1 text-sm text-gray-400 flex items-center">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link href={`/dashboard/entities?page=${page + 1}`} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-white hover:bg-white/10">
                Next
              </Link>
            ) : (
              <button className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-gray-400 disabled:opacity-50" disabled>Next</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
