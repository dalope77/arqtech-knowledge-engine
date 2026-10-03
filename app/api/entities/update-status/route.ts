import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { logEvent } from '@/lib/events';

export async function POST(req: Request) {
  try {
    const { id, newStatus } = await req.json();

    if (!id || !newStatus) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    
    // Primero obtenemos la entidad actual
    const { data: entity, error: fetchError } = await supabase
      .from('entities')
      .select('metadata')
      .eq('id', id)
      .single();
      
    if (fetchError || !entity) {
      return NextResponse.json({ error: 'Entidad no encontrada' }, { status: 404 });
    }

    const updatedMetadata = {
      ...entity.metadata,
      pipeline_status: newStatus
    };

    // Actualizamos usando Service Role para bypassear RLS
    const { error: updateError } = await supabase
      .from('entities')
      .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Opcional: Loggear el evento de validación visual humana
    await logEvent('HUMAN_OPERATOR', 'visual_validation', id, { new_status: newStatus });

    // Si la validación es positiva, disparamos el webhook de pipeline (Fuego y Olvido)
    if (newStatus === 'CONFIRMADO_VISUAL') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
        await fetch(`${baseUrl}/api/webhooks/pipeline-trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityId: id, triggerSource: 'VisualLabelingApp' })
        });
      } catch(e) {
        console.error('Error disparando webhook', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
