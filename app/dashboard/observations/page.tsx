import { FileText } from 'lucide-react';
import { getServiceRoleClient } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 0;

export default async function ObservationsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page || '1');
  const limit = 50;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const supabase = getServiceRoleClient();
  
  // Removed the entities(name) join because it might fail if FK is not enforced
  const { data: observations, count, error } = await supabase
    .from('observations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) {
    console.error('Observations fetch error:', error);
  }

  const displayObs = error ? [] : observations;
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-500" />
            Observations
          </h2>
          <p className="text-gray-400 mt-1">Acquired facts and attributes about entities.</p>
        </div>
      </div>

      <div className="bg-[#0F0F11] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/60 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entity ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Predicate</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Value</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayObs && displayObs.length > 0 ? displayObs.map((obs: any) => (
                <tr key={obs.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{obs.subject_entity_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono text-sm">{obs.predicate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-400 font-medium">{String(obs.value).substring(0, 50)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">{obs.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{new Date(obs.created_at).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No observations found or table does not exist.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-white">{displayObs.length}</span> of <span className="font-medium text-white">{totalCount}</span> observations
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/dashboard/observations?page=${page - 1}`} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-white hover:bg-white/10">
                Previous
              </Link>
            ) : (
              <button className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-gray-400 disabled:opacity-50" disabled>Previous</button>
            )}
            
            <span className="px-3 py-1 text-sm text-gray-400 flex items-center">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link href={`/dashboard/observations?page=${page + 1}`} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-sm text-white hover:bg-white/10">
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
