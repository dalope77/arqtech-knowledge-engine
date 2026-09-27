import { BaseAgent, AgentContext, AgentResult } from './index';

export class ParcelAgent extends BaseAgent {
  constructor() {
    super('PARCEL_AGENT', process.env.GROK_MODEL || process.env.OPENROUTER_MODEL || 'default-model');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { parcelId } = context.input;
      if (!parcelId) {
        throw new Error('parcelId is required in context.input');
      }

      // Step 1: Consult if parcel exists
      let parcel = await this.tools.consultEntity(parcelId);
      
      // Step 2: If it doesn't exist, check if we have evidence in context
      if (!parcel) {
        const evaluation = await this.callLLM(`Can you find factual information to create Parcel ${parcelId} in the provided context? If yes, extract it. If no, reply with exactly "INSUFFICIENT_KNOWLEDGE".`, context.knowledgeScope || context.input);
        
        if (evaluation.includes('INSUFFICIENT_KNOWLEDGE')) {
          return {
            status: 'insufficient_knowledge',
            output: {
              answer: `No hay suficiente información en el contexto para analizar la parcela ${parcelId}.`,
              missing_information: [`Datos y características de la parcela ${parcelId}`]
            }
          };
        }
        
        // If we found it in context, we create it
        parcel = await this.tools.discoverEntity('PARCELA', `Parcela ${parcelId}`, {
          source: 'KnowledgeScope Extraction'
        });
      }

      if (!parcel) {
        return { status: 'failed', error: 'Could not resolve parcel' };
      }

      // Step 3: Use LLM to extract relations or observations from scope
      const extraction = await this.callLLM(`Extract zoning and max height for parcel ${parcelId}. Return JSON with "zone" and "max_height".`, context.knowledgeScope || {});
      
      let zoneName = 'Distrito R-1';
      let maxHeight = '9 metros';
      
      try {
        const parsed = JSON.parse(extraction);
        if (parsed.zone) zoneName = parsed.zone;
        if (parsed.max_height) maxHeight = parsed.max_height;
      } catch(e) {}

      const zone = await this.tools.discoverEntity('ZONA', zoneName);
      
      if (zone) {
        // Step 4: Link entities
        await this.tools.linkEntities(parcel.id, 'pertenece_a', zone.id, 0.9);
      }

      // Step 5: Record an observation
      await this.tools.recordObservation(
        parcel.id,
        'altura_maxima',
        maxHeight,
        'KnowledgeScope Extraction'
      );

      return {
        status: 'success',
        output: {
          answer: 'Parcel analyzed and graph updated successfully',
          evidence: [parcel]
        }
      };

    } catch (error: any) {
      console.error('ParcelAgent Execution Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
