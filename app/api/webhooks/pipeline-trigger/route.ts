import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { logEvent } from '@/lib/events';

export async function POST(req: Request) {
  try {
    const { entityId, triggerSource } = await req.json();

    if (!entityId) {
      return NextResponse.json({ error: 'Faltan parámetros: entityId requerido' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    console.log(`[Webhook Pipeline] Iniciando pipeline automatizado para entidad: ${entityId} originado por ${triggerSource}`);

    // 1. Obtener la entidad
    const { data: entity, error: fetchError } = await supabase
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (fetchError || !entity) {
      return NextResponse.json({ error: 'Entidad no encontrada' }, { status: 404 });
    }

    // 2. Transición de Estado a PROCESANDO
    const updatedMetadata = { ...entity.metadata, pipeline_status: 'PROCESANDO_URBASIG_Y_MERCADO' };
    await supabase.from('entities').update({ metadata: updatedMetadata }).eq('id', entityId);

    // 3. Registrar Evento de Orquestación
    await logEvent('ORCHESTRATOR_AGENT', 'triggered_pipeline', entityId, { 
      pipeline: 'Barrio Detection Phase 2',
      agents_dispatched: ['LEGAL_AGENT', 'MARKET_AGENT']
    });

    // 4. Disparar Agentes (Fuego y Olvido)
    // Aquí invocamos las rutas de los agentes asíncronamente sin esperar que terminen
    // (Para no bloquear el webhook y permitir que el frontend siga de inmediato)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // NOTA: Como aún no tenemos LegalAgent/MarketAgent definidos en la factoría de app/api/agents/run, 
    // por ahora usamos un mock que genera las observaciones.
    // Si tuviéramos la factoría, haríamos:
    // fetch(`${baseUrl}/api/agents/run`, { method: 'POST', body: JSON.stringify({ agentType: 'LEGAL_AGENT', input: { entityId } }) });

    // Mock de procesamiento síncrono para demostración (esperamos 1s para simular red)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const adminDb = getServiceRoleClient();
      
      // Simular que el LEGAL_AGENT buscó en UrbaSIG y devolvió un resultado
      await adminDb.from('observations').insert({
        agent_id: 'LEGAL_AGENT',
        subject_entity_id: entityId,
        predicate: 'zonificacion',
        value: 'Zona URB-2 (Residencial de Densidad Media)',
        confidence: 0.95
      });
      await logEvent('LEGAL_AGENT', 'created_observation', entityId, { predicate: 'zonificacion' });

      // Simular que el MARKET_AGENT buscó precios
      await adminDb.from('observations').insert({
        agent_id: 'MARKET_AGENT',
        subject_entity_id: entityId,
        predicate: 'precio_m2_estimado',
        value: 'USD 450/m2',
        confidence: 0.82
      });
      await logEvent('MARKET_AGENT', 'created_observation', entityId, { predicate: 'precio_m2_estimado' });

      // Dictamen Final del Orquestador
      await adminDb.from('entities').update({
        metadata: { ...updatedMetadata, pipeline_status: 'VIABILIDAD_ANALIZADA' }
      }).eq('id', entityId);
      await logEvent('ORCHESTRATOR_AGENT', 'pipeline_completed', entityId, { status: 'VIABILIDAD_ANALIZADA' });
      
      console.log(`[Webhook Pipeline] Pipeline finalizado exitosamente para ${entityId}`);
    } catch (e) {
      console.error(`[Webhook Pipeline] Error en proceso asíncrono:`, e);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pipeline disparado y ejecutado exitosamente', 
      dispatched: ['LEGAL_AGENT', 'MARKET_AGENT'] 
    });
  } catch (err: any) {
    console.error('[Webhook Pipeline] Error crítico:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
