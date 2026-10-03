import { NextResponse } from 'next/server';
import { OptimizationAgent } from '@/lib/agents/optimization_agent';

// Forzar dinámico para que no se cachee el cron
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Validar autorización de Vercel Cron o un Bearer token manual
    const authHeader = req.headers.get('authorization');
    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      req.headers.get('x-vercel-cron') !== '1' && 
      process.env.NODE_ENV === 'production'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Iniciando OPTIMIZATION_AGENT (Meta-Learning) en Producción...');
    
    const agent = new OptimizationAgent();
    const runId = `run-opt-prod-${Date.now()}`;
    
    const result = await agent.execute({
      runId,
      objective: 'Revisar métricas de fallo y generar propuestas de optimización de prompts y flujos base.',
      input: {}
    });

    if (result.status === 'success') {
      console.log('[Cron] Análisis de Aprendizaje Completado exitosamente.');
      return NextResponse.json({ 
        success: true, 
        message: 'Aprendizaje completado', 
        details: result.output?.details || result.output?.conclusion 
      });
    } else {
      console.error('[Cron] Fallo en el análisis:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

  } catch (err: any) {
    console.error('[Cron] Error crítico:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
