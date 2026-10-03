import { BaseAgent, AgentContext, AgentResult } from './index';

export class OptimizationAgent extends BaseAgent {
  constructor() {
    // Model for reasoning over logs can be anything, defaulting to openrouter/free or the primary model
    super('OPTIMIZATION_AGENT', process.env.OPENROUTER_MODEL || 'openrouter/free');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const { runId, objective } = context;

    try {
      // 1. Fetch recent rejected proposals
      const { getServiceRoleClient } = await import('../supabase');
      const supabase = getServiceRoleClient();
      
      const { data: rejectedProposals } = await supabase
        .from('proposed_changes')
        .select('*')
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(20);

      // 2. Fetch recent failed agent runs
      const { data: failedRuns } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('status', 'failed')
        .order('started_at', { ascending: false })
        .limit(20);

      if ((!rejectedProposals || rejectedProposals.length === 0) && (!failedRuns || failedRuns.length === 0)) {
        return {
          status: 'success',
          output: { conclusion: 'No rejected proposals or failed runs to analyze. Architecture is stable.' }
        };
      }

      // 3. Prepare data for LLM
      const analysisData = {
        objective,
        rejected_proposals_sample: rejectedProposals?.map(p => ({
          agent: p.agent_id,
          reasoning: p.reason,
          payload: p.payload
        })),
        failed_runs_sample: failedRuns?.map(r => ({
          agent: r.agent_id,
          error: r.error,
          blackboard: r.blackboard
        }))
      };

      // 4. Prompt the LLM to analyze and propose optimizations
      const prompt = `Analiza los siguientes logs de fallos y propuestas rechazadas por el humano en la plataforma ArqTech.
Identifica si hay patrones sistemáticos de alucinación, uso incorrecto de herramientas o falta de contexto.
Genera una recomendación estructurada para mejorar los System Prompts o el pipeline de orquestación. No asumas soluciones genéricas, basa tu análisis estrictamente en los logs provistos.`;

      const analysisResult = await this.callLLM(prompt, analysisData);

      // 5. Output the result
      // Podríamos crear una propuesta formal en la tabla proposed_changes, pero como no hay entidad,
      // creamos un artifact de reporte.
      const artifactId = await this.produceArtifact(runId, 'OPTIMIZATION_REPORT', {
        raw_analysis: analysisResult,
        metrics: {
          analyzed_rejections: rejectedProposals?.length || 0,
          analyzed_failures: failedRuns?.length || 0
        }
      });

      return {
        status: 'success',
        output: {
          artifact_id: artifactId,
          summary: "Optimization analysis completed.",
          details: analysisResult
        }
      };

    } catch (error: any) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }
}
