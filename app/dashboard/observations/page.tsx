import { FileText } from 'lucide-react';
import { getServiceRoleClient } from '@/lib/supabase';

export const revalidate = 0;

export default async function ObservationsPage() {
  const supabase = getServiceRoleClient();
  
  const { data: observations, error } = await supabase
    .from('observations')
    .select('*, entities(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  const displayObs = error ? [] : observations;

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
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{obs.entities?.name || obs.entity_id.substring(0, 8)}</td>
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
      </div>
    </div>
  );
}
