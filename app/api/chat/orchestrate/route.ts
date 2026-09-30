import { NextResponse } from 'next/server';
import { addMessage, getMessages } from '@/lib/chat/api';
import { OrchestratorAgent } from '@/lib/agents/orchestrator_agent';
import { UrbanAgent } from '@/lib/agents/urban_agent';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { threadId, text } = await req.json();

    if (!threadId || !text) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Add a system status message
    await addMessage(threadId, 'system', 'Invocando Orquestador Maestro...');

    // Fetch previous messages to build conversation context
    const previousMessages = await getMessages(threadId);
    // Filter out the system messages and the message we just added
    const history = previousMessages
      .filter(m => m.role !== 'system')
      .slice(-5) // Last 5 messages to avoid token overflow
      .map(m => `${m.role === 'user' ? 'User' : 'Agent (' + (m.agent_id || 'System') + ')'}: ${m.content}`)
      .join('\n\n');

    const contextualizedQuery = `[Historial de Conversación]\n${history}\n\n[Nueva Consulta del Usuario]\n${text}`;

    console.log(`\n\n======================================================`);
    console.log(`🧠 [ORCHESTRATOR] Analizando nueva consulta de usuario: "${text}"`);
    
    const orchestrator = new OrchestratorAgent();
    const plan = await orchestrator.execute({
      runId: threadId,
      objective: 'Orchestrate user query',
      input: { query: text } // Only pass the latest query for routing!
    });

    console.log(`🧠 [ORCHESTRATOR] Decisión de Enrutamiento:`);
    console.log(`   - Acción: ${plan.output?.action}`);
    console.log(`   - Razonamiento (Plan): ${plan.output?.plan || 'N/A'}`);
    console.log(`======================================================\n`);

    // Check if Orchestrator delegated to URBAN_AGENT
    if (plan.output?.action === 'DELEGATE_URBAN' || (plan.output?.plan && plan.output.plan.includes('DELEGATE_URBAN'))) {
      await addMessage(threadId, 'system', 'Delegando al Agente Urbano para consulta catastral...');
      
      console.log(`👷‍♂️ [URBAN_AGENT] Asignado para resolver la consulta...`);
      const urban = new UrbanAgent();
      const urbanRes = await urban.execute({
        runId: threadId,
        objective: 'Fetch WFS data',
        input: { query: contextualizedQuery }
      });
      console.log(`👷‍♂️ [URBAN_AGENT] Ejecución finalizada. Estado: ${urbanRes.status}`);

      if (urbanRes.status === 'success') {
        await addMessage(
          threadId, 
          'assistant', 
          urbanRes.output.answer, 
          'PARCEL_AGENT',
          { wfs_data_used: urbanRes.output.wfs_data_used }
        );
      } else {
        await addMessage(threadId, 'assistant', 'Error en consulta urbana: ' + urbanRes.error, 'PARCEL_AGENT');
      }

    } else if (plan.output?.action === 'DELEGATE_MARKET') {
      await addMessage(threadId, 'system', 'Delegando al Market Intelligence Agent para propuesta inicial...');
      
      const { MarketAgent } = await import('@/lib/agents/market_agent');
      const marketAgent = new MarketAgent();
      
      // 1. Market Agent Draft
      const marketDraftRes = await marketAgent.execute({
        runId: threadId,
        objective: 'Generate architectural and financial draft',
        input: { query: contextualizedQuery }
      });
      
      const draftText = marketDraftRes.output?.answer || 'Error generando propuesta.';
      
      // Check if Market Agent needs more data
      if (draftText.includes('[REQ_INFO]')) {
        const cleanQuestion = draftText.replace('[REQ_INFO]', '').trim();
        await addMessage(threadId, 'assistant', cleanQuestion, 'MARKET_AGENT');
        return NextResponse.json({ success: true });
      }

      // OPTIMIZATION: Save draft to Knowledge Graph instead of Chat History
      const supabase = getServiceRoleClient();
      const draftId = `draft-${Date.now()}`;
      await supabase.from('entities').insert({
        id: draftId,
        type: 'DOCUMENT',
        name: 'Market Draft',
        metadata: { content: draftText }
      });
      await addMessage(threadId, 'assistant', `[BORRADOR GENERADO] Referencia guardada en Grafo: ${draftId}`, 'MARKET_AGENT', { doc_id: draftId });

      // 2. Urban Agent Review
      await addMessage(threadId, 'system', 'El Agente Urbano está auditando la propuesta del Mercado en background...');
      
      const urban = new UrbanAgent();
      const urbanReviewQuery = `[Historial]\n${history}\n\n[Borrador del Agente de Mercado]\n${draftText}\n\nAudita este borrador estrictamente. Verifica que la cantidad de pisos no supere la altura máxima (ej. 30 mts = 10 pisos), que la huella no supere el FOS, y que el área total no supere el FOT. Si hay errores matemáticos o normativos, sé duro y corrígelos. Si está perfecto, responde "APROBADO".`;
      
      const urbanRes = await urban.execute({
        runId: threadId,
        objective: 'Audit Market Draft',
        input: { query: urbanReviewQuery }
      });

      const urbanText = urbanRes.output?.answer || 'Revisión fallida.';
      const urbanId = `audit-${Date.now()}`;
      await supabase.from('entities').insert({
        id: urbanId,
        type: 'DOCUMENT',
        name: 'Urban Audit',
        metadata: { content: urbanText }
      });
      await addMessage(threadId, 'assistant', `[AUDITORÍA URBANA] Referencia guardada en Grafo: ${urbanId}`, 'PARCEL_AGENT', { doc_id: urbanId });

      // 3. Legal Agent Review
      await addMessage(threadId, 'system', 'El Agente Legal está buscando fundamentación jurídica en background...');
      
      const { LegalAgent } = await import('@/lib/agents/legal_agent');
      const legal = new LegalAgent();
      const legalReviewQuery = `[Historial]\n${history}\n\n[Borrador del Agente de Mercado]\n${draftText}\n\nRevisa esta propuesta. Busca fundamentos legales para el uso propuesto y encuentra cualquier ventaja competitiva (ej. premios FOT por sustentabilidad, exenciones de cochera) que el desarrollador pueda usar.`;
      
      const legalRes = await legal.execute({
        runId: threadId,
        objective: 'Legal and Regulatory Review',
        input: { query: legalReviewQuery }
      });
      
      const legalText = legalRes.output?.answer || 'Análisis legal fallido.';
      const legalId = `legal-${Date.now()}`;
      await supabase.from('entities').insert({
        id: legalId,
        type: 'DOCUMENT',
        name: 'Legal Strategy',
        metadata: { content: legalText }
      });
      await addMessage(threadId, 'assistant', `[ESTRATEGIA LEGAL] Referencia guardada en Grafo: ${legalId}`, 'LEGAL_AGENT', { doc_id: legalId });

      // 4. Final Market Adjustment (combining both reviews)
      const needsUrbanCorrection = !urbanText.includes('APROBADO');
      
      await addMessage(threadId, 'system', 'El Agente de Mercado está integrando las auditorías para generar la propuesta final...');
      
      const correctionQuery = `[Borrador Original]\n${draftText}\n\n[Correcciones del Agente Urbano]\n${urbanText}\n\n[Estrategia Legal]\n${legalText}\n\nCorrige tu propuesta original. Si el Agente Urbano detectó errores (no dijo "APROBADO"), corrígelos OBLIGATORIAMENTE. Además, integra la estrategia y ventajas competitivas del Agente Legal en tu modelo de negocio final. Presenta el desarrollo optimizado definitivo.`;
      
      const finalRes = await marketAgent.execute({
        runId: threadId,
        objective: 'Final draft integration',
        input: { query: correctionQuery }
      });
      
      await addMessage(threadId, 'assistant', `[PROPUESTA FINAL AJUSTADA]\n${finalRes.output?.answer}`, 'MARKET_AGENT');

    } else {
      // Orchestrator handled it directly
      await addMessage(threadId, 'assistant', plan.output?.answer || 'Recibido.', 'ORCHESTRATOR_AGENT');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Chat Orchestration Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
