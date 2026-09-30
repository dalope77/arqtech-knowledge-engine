import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const supabase = getServiceRoleClient();
    
    // Run cascading deletes concurrently for better performance
    await Promise.all([
      supabase.from('relations').delete().eq('from_entity_id', id),
      supabase.from('relations').delete().eq('to_entity_id', id),
      supabase.from('observations').delete().eq('subject_entity_id', id),
      supabase.from('observations').delete().eq('object_entity_id', id),
      supabase.from('events').delete().eq('entity_id', id),
      supabase.from('real_world_events').delete().eq('entity_id', id),
      supabase.from('claims').delete().eq('entity_id', id)
    ]);

    // Delete entity
    const { error } = await supabase.from('entities').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
