import { BaseAgent, AgentContext, AgentResult } from './index';

export class MapAgent extends BaseAgent {
  constructor() {
    super('MAP_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { bbox, confidence, documentId, pageNumber } = context.input;
      
      console.log(`[MAP_AGENT] Analyzing geometries in bbox ${JSON.stringify(bbox)}`);
      
      // Maps often yield Hypotheses rather than hard Facts due to visual ambiguity
      const hypotheses = [
        {
          title: 'Zonificación R2 Detectada',
          description: 'Se detectó una mancha de color correspondiente a la leyenda de R2 sobre las parcelas del cuadrante noreste.',
          status: 'candidate',
          confidence: confidence * 0.8, // Reduced confidence because it's spatial inference
          visual_evidence: {
             asset_id: `page_${pageNumber}`,
             bbox: bbox,
             extraction_method: 'Map_Color_Segmentation_Mock',
             confidence_metrics: { detection: confidence, semantic_interpretation: 0.75 }
          }
        }
      ];

      return {
        status: 'success',
        output: { hypotheses }
      };
    } catch (error: any) {
      return { status: 'failed', error: error.message };
    }
  }
}
