import { BaseAgent, AgentContext, AgentResult } from './index';
import { getServiceRoleClient } from '../supabase';

export class DataAnalystAgent extends BaseAgent {
  constructor() {
    // Por defecto usa un modelo especializado en código/SQL si no hay otro configurado.
    // Ej: Qwen 2.5 Coder o Llama 3 que suelen ser mejores para estructurar JSON y SQL.
    super('DATA_ANALYST_AGENT', process.env.SQL_MODEL || 'qwen/qwen-2.5-coder-32b-instruct:free');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { query } = context.input;
      if (!query) {
        throw new Error('A natural language query is required.');
      }

      // Step 1: LLM plans how to fetch the data
      const planningPrompt = `
      You are the ArqTech Data Analyst Agent.
      User Query: "${query}"
      
      PRE-FILTERED CONTEXT (Reduced Universe):
      ${context.contextRefs ? JSON.stringify(context.contextRefs) : 'No specific context provided.'}
      
      Your goal is to extract statistical or aggregated information from the database schema, using the PRE-FILTERED CONTEXT to narrow your search if applicable.
      The database has the following tables:
      - 'entities': id, type, name, external_id, metadata (JSONB), created_at, updated_at
      - 'relations': id, from_entity_id, relation_type, to_entity_id, confidence, metadata (JSONB)
      - 'observations': id, subject_entity_id, predicate, object_entity_id, value, source, evidence, confidence, status
      
      CRITICAL DATA DICTIONARY (Ontology Mapping):
      - "barrio", "urbanización", "emprendimiento", "proyecto" -> type: "PROYECTO"
      - "expediente", "trámite" -> metadata->>'expediente' in entities table
      - "norma", "ley", "ordenanza" -> type: "NORMA"
      - "partido", "municipio", "distrito", "localidad" -> This is NOT in the metadata! PROYECTO entities are linked to LOCALIDAD entities via a relation with relation_type: "pertenece_a".

      Based on the query, decide what information you need. 
      If the user asks "how many neighborhoods per district?", 
      you return action: COUNT_BY_RELATION, entityType: "PROYECTO", relationType: "pertenece_a".
      
      Return a JSON:
      {
        "entityType": "PROYECTO",
        "action": "COUNT_BY_METADATA" | "COUNT_BY_RELATION",
        "metadataField": "field_name_if_metadata",
        "relationType": "relation_type_if_relation"
      }
      `;

      const planRaw = await this.callLLM(planningPrompt, { response_format: { type: "json_object" } });
      let plan;
      try {
        const text = planRaw || '{}';
        const match = text.match(/\{[\s\S]*\}/);
        const cleaned = match ? match[0] : '{}';
        plan = JSON.parse(cleaned);
      } catch (e) {
        plan = { entityType: 'PROYECTO', action: 'COUNT_BY_RELATION', relationType: 'pertenece_a' };
      }

      const supabase = getServiceRoleClient();
      let resultsData = [];

      if (plan.action === 'COUNT_BY_METADATA') {
        const { data, error } = await supabase
          .from('entities')
          .select('id, name, metadata')
          .eq('type', plan.entityType);

        if (error) throw error;
        
        const counts: Record<string, number> = {};
        for (const row of (data || [])) {
          const val = row.metadata?.[plan.metadataField] || 'Desconocido';
          counts[val] = (counts[val] || 0) + 1;
        }

        resultsData = Object.keys(counts).map(k => ({ [plan.metadataField]: k, count: counts[k] }));
      } else if (plan.action === 'COUNT_BY_RELATION') {
        // Fetch entities of that type
        const { data: entities, error: err1 } = await supabase.from('entities').select('id, name').eq('type', plan.entityType);
        if (err1) throw err1;
        
        const entityIds = (entities || []).map(e => e.id);
        
        // Fetch relations
        const { data: relations, error: err2 } = await supabase.from('relations')
          .select('from_entity_id, to_entity_id')
          .eq('relation_type', plan.relationType)
          .in('from_entity_id', entityIds);
        if (err2) throw err2;
        
        // Count target entity IDs
        const targetCounts: Record<string, number> = {};
        for (const rel of (relations || [])) {
          targetCounts[rel.to_entity_id] = (targetCounts[rel.to_entity_id] || 0) + 1;
        }
        
        // Resolve target entity names
        const targetIds = Object.keys(targetCounts);
        let resolvedNames: Record<string, string> = {};
        if (targetIds.length > 0) {
          const { data: targets, error: err3 } = await supabase.from('entities').select('id, name').in('id', targetIds);
          if (!err3 && targets) {
             for (const t of targets) resolvedNames[t.id] = t.name;
          }
        }
        
        resultsData = targetIds.map(tid => ({
           target_entity: resolvedNames[tid] || tid,
           count: targetCounts[tid]
        }));
      } else {
        // Fallback for other queries
        const { data, error } = await supabase.from('entities').select('*').limit(100);
        resultsData = data || [];
      }

      // Step 2: Synthesis
      const synthesisPrompt = `
      You are the ArqTech Data Analyst Agent.
      Query: "${query}"
      Data Retrieved: ${JSON.stringify(resultsData)}
      
      Formulate a clear, direct answer based strictly on the Data Retrieved.
      Include a list of claims backed by the data.
      Respond with JSON:
      {
        "answer": "Summary answer",
        "claims": [
          { "id": "claim_1", "claim": "Text of the claim", "evidence_ids": [], "confidence": 1.0, "status": "validated" }
        ]
      }
      `;
      
      const synthRaw = await this.callLLM(synthesisPrompt, { response_format: { type: "json_object" } });
      let synth;
      try {
        const text = synthRaw || '{}';
        const match = text.match(/\{[\s\S]*\}/);
        const cleaned = match ? match[0] : '{}';
        synth = JSON.parse(cleaned);
      } catch (e) {
        synth = { answer: 'Data analyzed successfully.', claims: [] };
      }

      const candidateAnswer = {
        id: `ans_${Date.now()}`,
        perspective: 'resumen',
        content: synth.answer,
        claims: synth.claims
      };

      return {
        status: 'success',
        output: {
          answer: synth.answer,
          candidate_answers: [candidateAnswer],
          evidence: resultsData
        }
      };

    } catch (error: any) {
      console.error('DataAnalystAgent Execution Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
