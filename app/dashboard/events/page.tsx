import { Activity } from 'lucide-react';
import { getServiceRoleClient } from '@/lib/supabase';

export const revalidate = 0;

export default async function EventsPage() {
  const supabase = getServiceRoleClient();
  
  const { data: events, error } = await supabase
    .from('events')
    .select('*, entities(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  const displayEvents = error ? [] : events;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-500" />
            Events Ledger
          </h2>
          <p className="text-gray-400 mt-1">Immutable system-wide events and provenance tracking.</p>
        </div>
      </div>

      <div className="bg-[#0F0F11] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/60 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Target Entity</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayEvents && displayEvents.length > 0 ? displayEvents.map((evt: any) => (
                <tr key={evt.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-emerald-400 font-mono text-sm">{evt.actor_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-white text-sm">{evt.event_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-medium">{evt.entities?.name || evt.entity_id?.substring(0, 8)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{new Date(evt.created_at).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No events found or table does not exist.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
