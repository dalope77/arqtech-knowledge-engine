import { BaseAgent, AgentContext, AgentResult } from './index';
import { TableAgent } from './table_agent';
import { MapAgent } from './map_agent';

export class VisualIngestionAgent extends BaseAgent {
  constructor() {
    super('VISUAL_INGESTION_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  private async detectLayout(imageUrl: string) {
    console.log(`[VISUAL_CLASSIFIER] Requesting layout detection for ${imageUrl} from Python Service...`);
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
    
    const response = await fetch(`${pythonServiceUrl}/api/detect-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl })
    });
    
    if (!response.ok) {
      throw new Error(`Python Layout Service failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.regions || [];
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { imageUrl, documentId, pageNumber } = context.input;
      if (!imageUrl) throw new Error('imageUrl is required for visual ingestion');

      // 1. Classify regions
      const regions = await this.detectLayout(imageUrl);
      
      const extractionResults = [];

      // 2. Route each region to specialized agents
      for (const region of regions) {
        let specializedResult: AgentResult | null = null;
        
        const subContext: AgentContext = {
          runId: `${context.runId}-${region.type}`,
          objective: `Extract knowledge from ${region.type} region`,
          input: {
            imageUrl,
            documentId,
            pageNumber,
            bbox: region.bbox,
            confidence: region.confidence
          }
        };

        if (region.type === 'TABLA') {
          const tableAgent = new TableAgent();
          specializedResult = await tableAgent.execute(subContext);
        } else if (region.type === 'MAPA') {
          const mapAgent = new MapAgent();
          specializedResult = await mapAgent.execute(subContext);
        } else {
          console.log(`[ROUTER] No specialized agent for type ${region.type}. Skipping or sending to Human Review.`);
        }

        if (specializedResult?.status === 'success') {
           extractionResults.push(specializedResult.output);
        }
      }
      // FASE 7: Producir Artifact visual combinado
      const artifactContent = {
        image_url: imageUrl,
        document_id: documentId,
        regions_detected: regions.length,
        extracted_knowledge: extractionResults,
        summary: `Se procesaron ${regions.length} regiones visuales.`
      };
      
      const artifactId = await this.produceArtifact(context.runId, 'VISUAL_EXTRACTION', artifactContent);

      return {
        status: 'success',
        output: {
          artifact_id: artifactId,
          message: 'Visual ingestion completed',
          regions_detected: regions.length
        }
      };

    } catch (error: any) {
      console.error('VisualIngestionAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
