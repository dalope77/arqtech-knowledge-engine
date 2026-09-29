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
        // En Fase 2 los datos reales vendrían de hacer fetch a las entidades en base a contextRefs.
        // Aquí pasamos las referencias para que el modelo sepa sobre qué razonar.
        const evaluation = await this.callLLM(`Can you find factual information to create Parcel ${parcelId} based on the provided context references? If yes, extract it. If no, reply with exactly "INSUFFICIENT_KNOWLEDGE".`, context.contextRefs || context.input);
        
        if (evaluation.includes('INSUFFICIENT_KNOWLEDGE')) {
          return {
            status: 'insufficient_knowledge',
            output: {
              answer: `No hay suficiente información referenciada para analizar la parcela ${parcelId}.`,
              missing_information: [`Datos y características de la parcela ${parcelId}`]
            }
          };
        }
        
        parcel = await this.tools.discoverEntity('PARCELA', `Parcela ${parcelId}`, {
          source: 'Agent Discovery'
        });
      }

      if (!parcel) {
        return { status: 'failed', error: 'Could not resolve parcel' };
      }

      // Step 3: Analyze context and extract claims
      const extraction = await this.callLLM(`Extract zoning and max height for parcel ${parcelId} from the provided references. Return strictly JSON with "zone" and "max_height".`, context.contextRefs || {});
      
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
        'ParcelAgent Analysis'
      );

      // FASE 2: Producir un Artifact persistente
      const artifactContent = {
        parcel_id: parcel.id,
        zone_name: zoneName,
        max_height: maxHeight,
        analysis_summary: `La parcela ${parcelId} pertenece a la zona ${zoneName} con altura máxima de ${maxHeight}.`
      };
      
      const artifactId = await this.produceArtifact(context.runId, 'PARCEL_ANALYSIS', artifactContent, { version: '1.0' });

      return {
        status: 'success',
        output: {
          artifact_id: artifactId,
          claims: [
            `Parcela ${parcelId} -> pertenece_a -> ${zoneName}`,
            `Parcela ${parcelId} -> altura_maxima -> ${maxHeight}`
          ],
          evidence: [parcel.id, zone?.id].filter(Boolean),
          observations: ['altura_maxima']
        }
      };

    } catch (error: any) {
      console.error('ParcelAgent Execution Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
