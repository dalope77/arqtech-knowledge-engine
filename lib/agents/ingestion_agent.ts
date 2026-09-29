import { BaseAgent, AgentContext, AgentResult } from './index';

export class IngestionAgent extends BaseAgent {
  constructor() {
    super('INGESTION_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      let { externalDataSchema, sampleData } = context.input;
      
      // En caso de que se haya mandado un string desde la UI y no un objeto estructurado
      if (typeof externalDataSchema === 'string') {
        try {
          const parsed = JSON.parse(externalDataSchema);
          externalDataSchema = parsed.schema || parsed;
          sampleData = parsed.data || [parsed];
        } catch(e) {
           // fallback if JSON is malformed
           throw new Error("ETL Agent requires a valid JSON schema or data payload.");
        }
      }

      if (!externalDataSchema || !sampleData || !Array.isArray(sampleData)) {
        throw new Error('Valid externalDataSchema and sampleData array are required in input.');
      }

      const mappingPrompt = `
      You are an ETL Agent.
      Analyze this foreign database schema: ${JSON.stringify(externalDataSchema)}
      And this sample data: ${JSON.stringify(sampleData).substring(0, 3000)}
      
      Map it to our Knowledge Graph which supports:
      - Entities (id, type, name)
      - Observations (entity_id, predicate, value)
      - Relations (from_entity, type, to_entity)
      
      Return a JSON plan with exactly how to ingest this data.
      `;

      const mappingPlanRaw = await this.callLLM(mappingPrompt, {});
      
      let processed = 0;
      for (const record of sampleData) {
        const entityType = externalDataSchema.tableName?.toUpperCase() || 'DB_RECORD';
        const entityName = record.nombre || record.name || record.id || `Entity ${record.id}`;
        
        const entity = await this.tools.discoverEntity(entityType, entityName, {
          source: 'ETL_INGESTION',
          original_id: record.id
        });

        for (const [key, value] of Object.entries(record)) {
          if (key === 'id' || key === 'nombre' || key === 'name') continue;
          if (entity) {
             await this.tools.recordObservation(
               entity.id,
               key,
               String(value),
               'External DB Ingestion'
             );
          }
        }
        processed++;
      }

      return {
        status: 'success',
        output: {
          answer: `Datos tabulares mapeados e ingeridos con éxito en el Knowledge Graph. Se procesaron ${processed} registros.`
        }
      };

    } catch (error: any) {
      console.error('IngestionAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
