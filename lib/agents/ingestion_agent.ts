import { BaseAgent, AgentContext, AgentResult } from './index';

export class IngestionAgent extends BaseAgent {
  constructor() {
    super('INGESTION_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { externalDataSchema, sampleData } = context.input;
      if (!externalDataSchema || !sampleData) {
        throw new Error('externalDataSchema and sampleData are required in input');
      }

      // Step 1: Prompt the LLM to map the foreign schema into our EAV (Entity-Attribute-Value) Knowledge Graph
      const mappingPrompt = `
      You are an ETL Agent.
      Analyze this foreign database schema: ${JSON.stringify(externalDataSchema)}
      And this sample data: ${JSON.stringify(sampleData)}
      
      Map it to our Knowledge Graph which supports:
      - Entities (id, type, name)
      - Observations (entity_id, predicate, value)
      - Relations (from_entity, type, to_entity)
      
      Return a JSON plan with exactly how to ingest this data.
      `;

      const mappingPlanRaw = await this.callLLM(mappingPrompt, {});
      
      // Assume the LLM returns a structured plan to ingest the data
      // For demonstration, we simulate parsing the LLM response
      
      // Step 2: Execute the ingestion (simulated)
      for (const record of sampleData) {
        // Create the main entity
        const entityType = externalDataSchema.tableName.toUpperCase(); // e.g., "PARCELAS" -> "PARCELAS"
        const entityName = record.nombre || record.id || `Entity ${record.id}`;
        
        const entity = await this.tools.discoverEntity(entityType, entityName, {
          source: 'INGESTION_AGENT',
          original_id: record.id
        });

        // Add observations for each column
        for (const [key, value] of Object.entries(record)) {
          if (key === 'id' || key === 'nombre') continue;
          
          if (entity) {
             await this.tools.recordObservation(
               entity.id,
               key, // predicate (e.g. 'altura_maxima')
               String(value), // value
               'External DB Ingestion'
             );
          }
        }
      }

      return {
        status: 'success',
        output: {
          message: 'Data successfully mapped and ingested into the Knowledge Graph.',
          recordsProcessed: sampleData.length
        }
      };

    } catch (error: any) {
      console.error('IngestionAgent Execution Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
