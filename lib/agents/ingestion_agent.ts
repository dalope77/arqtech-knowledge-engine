import { BaseAgent, AgentContext, AgentResult } from './index';

export class IngestionAgent extends BaseAgent {
  constructor() {
    super('INGESTION_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      let { externalDataSchema, sampleData } = context.input;
      
      if (typeof externalDataSchema === 'string') {
        try {
          const parsed = JSON.parse(externalDataSchema);
          externalDataSchema = parsed.schema || parsed;
          sampleData = parsed.data || [parsed];
        } catch(e) {
           throw new Error("ETL Agent requires a valid JSON schema or data payload.");
        }
      }

      if (!externalDataSchema || !sampleData || !Array.isArray(sampleData)) {
        throw new Error('Valid externalDataSchema and sampleData array are required in input.');
      }

      const mappingPrompt = `
      You are an ETL & Legal Ingestion Agent.
      Analyze this foreign database schema or document structure: ${JSON.stringify(externalDataSchema)}
      And this sample data: ${JSON.stringify(sampleData).substring(0, 3000)}
      
      Map it to our Knowledge Graph which supports:
      - Entities (id, type, name)
      - Observations (entity_id, predicate, value)
      - Claims (statement, confidence, metadata) for unstructured relationships like "Ordenanza X deroga Ordenanza Y" or "Otorga excepción de FOS en Zona Z".
      
      Return a JSON object containing:
      {
        "plan": "string explaining the ingestion strategy",
        "claims": [
          { "statement": "Ordenanza 123 deroga Ordenanza 45", "confidence": 0.9, "metadata": { "context_refs": { "source": "ingestion" } } }
        ]
      }
      Extract any regulatory relationships (derogations, modifications, exceptions) into the 'claims' array.
      Respond strictly with the JSON object.
      `;

      const mappingPlanRaw = await this.callLLM(mappingPrompt, {}, { response_format: { type: "json_object" } });
      let mappingPlan;
      try {
        mappingPlan = JSON.parse(mappingPlanRaw);
      } catch (e) {
        mappingPlan = { claims: [] };
      }
      
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

      // Insert extracted claims
      let claimsInserted = 0;
      if (mappingPlan.claims && Array.isArray(mappingPlan.claims) && mappingPlan.claims.length > 0) {
        const { getServiceRoleClient } = await import('../supabase');
        const supabase = getServiceRoleClient();
        
        const claimsToInsert = mappingPlan.claims.map((c: any) => ({
          id: `claim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          statement: c.statement,
          confidence: c.confidence || 0.8,
          metadata: c.metadata || { context_refs: { source: 'ingestion_agent' } },
          agent_id: this.agentId,
          source: 'LLM_INFERENCE'
        }));

        const { error } = await supabase.from('claims').insert(claimsToInsert);
        if (!error) {
          claimsInserted = claimsToInsert.length;
        } else {
          console.error("Failed to insert claims:", error);
        }
      }

      return {
        status: 'success',
        output: {
          answer: `Datos mapeados e ingeridos con éxito. Se procesaron ${processed} registros. Se extrajeron ${claimsInserted} claims normativos (derogaciones/excepciones).`
        }
      };

    } catch (error: any) {
      console.error('IngestionAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
