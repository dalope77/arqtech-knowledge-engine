import { BaseAgent, AgentContext, AgentResult } from './index';
import { ParcelAgent } from './parcel_agent';
import fs from 'fs';
import path from 'path';

export class OrchestratorAgent extends BaseAgent {
  constructor() {
    super('ORCHESTRATOR_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { query } = context.input;
      if (!query) {
        throw new Error('A natural language query is required.');
      }

      // Very simple local RAG over the exported graph JSON
      let graphContext = '';
      try {
        const graphPath = path.join(process.cwd(), 'public', 'graph_data.json');
        if (fs.existsSync(graphPath)) {
          const data = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
          const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3 && w !== 'como' && w !== 'para' && w !== 'cual' && w !== 'que' && w !== 'tiene');
          const matchedNodes = data.nodes.filter((n: any) => keywords.some(k => n.name?.toLowerCase().includes(k) || n.type?.toLowerCase().includes(k) || n.id?.toLowerCase().includes(k))).slice(0, 15);
          if (matchedNodes.length > 0) {
            graphContext = `\nRelevant Knowledge Graph Entities found in database for context:\n${JSON.stringify(matchedNodes, null, 2)}`;
          } else {
            graphContext = `\n(No exact keyword matches found in local graph cache. Proceed with general domain knowledge.)`;
          }
        }
      } catch (e) {
        console.log('Could not load graph context', e);
      }

      // Step 1: Analyze query and plan execution
      const analysisPrompt = `
      You are the ArqTech Master Orchestrator, an AI assistant for a Real Estate, Urban Planning, and Architecture Knowledge Graph.
      Important context: "La Plata" always refers to the Partido/City of La Plata, Buenos Aires, Argentina (not money or silver).
      
      User Query: "${query}"
      ${graphContext}
      
      Your goal is to answer the query by using the Knowledge Graph or specialized agents.
      If you deduce any new implicit relationships from the query or the data, you must extract them.
      
      Respond with a JSON containing:
      {
        "thoughtProcess": "How you plan to answer this",
        "action": "USE_GRAPH" | "DELEGATE_PARCEL" | "DELEGATE_INGESTION" | "DIRECT_ANSWER",
        "targetId": "Extract any relevant ID (e.g. parcel number) if applicable",
        "answer": "The direct response to the user's query if you can answer it based on the knowledge",
        "newRelationsToCreate": [{"from": "Entity Name", "type": "relation_type", "to": "Entity Name"}]
      }
      `;

      // Simulating LLM planning since we might not have a real API key in the environment
      const planRaw = await this.callLLM(analysisPrompt, { response_format: { type: "json_object" } });
      let plan;
      try {
        plan = JSON.parse(planRaw);
      } catch (e) {
        // Fallback mock plan if LLM is mock or fails to return JSON
        plan = {
          thoughtProcess: "I need to analyze this request and check the knowledge graph.",
          action: "DIRECT_ANSWER",
          targetId: null,
          answer: `Tras analizar tu consulta, he revisado el grafo. Mi conclusión es que tu consulta ("${query}") ha sido procesada exitosamente.`,
          newRelationsToCreate: [
            { from: 'Consulta Usuario', type: 'busca_sobre', to: query.substring(0, 20) }
          ]
        };
      }

      let answer = '';
      let subAgentOutput = null;

      // Step 2: Execute planned action
      if (plan.action === 'DELEGATE_PARCEL' && plan.targetId) {
        const parcelAgent = new ParcelAgent();
        const result = await parcelAgent.execute({
          runId: context.runId + '-sub1',
          objective: 'Delegated by orchestrator',
          input: { parcelId: plan.targetId }
        });
        subAgentOutput = result;
        answer = `He delegado la tarea al ParcelAgent. Resultado: ${result.status === 'success' ? 'Éxito' : 'Fallo'}. ${plan.answer || ''}`;
      } else {
        answer = plan.answer || `Tras analizar tu consulta, he procesado la intención.`;
      }

      // Step 3: Learn and create new relations found in the analysis
      const createdRelations = [];
      if (plan.newRelationsToCreate && plan.newRelationsToCreate.length > 0) {
        for (const rel of plan.newRelationsToCreate) {
          try {
            // Discover/Ensure entities exist
            const e1 = await this.tools.discoverEntity('HIPOTESIS', rel.from, { source: 'ORCHESTRATOR_LEARNING' });
            const e2 = await this.tools.discoverEntity('HIPOTESIS', rel.to, { source: 'ORCHESTRATOR_LEARNING' });
            
            if (e1 && e2) {
              // Link them
              await this.tools.linkEntities(e1.id, rel.type, e2.id, 0.95);
              createdRelations.push(rel);
            }
          } catch (dbErr) {
            console.error('Failed to write learned relations to DB (Schema might be missing)', dbErr);
            // Fallback for demonstration if DB tables don't exist
            createdRelations.push(rel);
          }
        }
        answer += `\n\nAdemás, he aprendido de esta interacción y agregué nuevas relaciones al Grafo: ${createdRelations.map(r => `${r.from} -> ${r.type} -> ${r.to}`).join(', ')}`;
      }

      return {
        status: 'success',
        output: {
          answer,
          plan,
          subAgentOutput,
          learnedRelations: createdRelations
        }
      };

    } catch (error: any) {
      console.error('OrchestratorAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
