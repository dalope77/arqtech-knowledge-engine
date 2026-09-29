import { BaseAgent, AgentContext, AgentResult } from './index';
import { ParcelAgent } from './parcel_agent';
import { DataAnalystAgent } from './data_analyst_agent';


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

      // Retrieve Blackboard State
      const blackboardData = await this.getBlackboard(context.runId);
      const refs = context.contextRefs || blackboardData?.context_refs || {};
      
      let graphContext = '';
      if (refs && refs.entities && refs.entities.length > 0) {
        graphContext = `\nContext References Provided:\nEntities: ${refs.entities.join(', ')}`;
        if (refs.artifacts && refs.artifacts.length > 0) graphContext += `\nArtifacts: ${refs.artifacts.join(', ')}`;
      } else {
        graphContext = `\n(No Context References provided. Proceed with caution.)`;
      }

      // Step 1: Analyze query and plan execution (Strict Delegation)
      const planningPrompt = `
      You are the ArqTech Master Orchestrator.
      User Query: "${query}"
      
      Your goal is ONLY to route the request to the correct specialist or decide to answer directly if it's a general question.
      You DO NOT solve domain problems yourself.
      
      Routing Options:
      - "DELEGATE_DATA": EXTREMELY IMPORTANT: Use this IMMEDIATELY for ANY analytical, statistical, grouping, or counting query (e.g., "cuántos", "cantidad", "how many", "count", "grouped by", "amount of barrios per partido", "estadísticas"). DO NOT return INSUFFICIENT_KNOWLEDGE for these queries.
      - "DELEGATE_URBAN": Use this for ANY query involving urban codes, zoning, building potential, FOS, FOT, ARBA, UrbaSIG, or what can be built on a specific lot. ALSO use this for queries containing cadastral data like "partido", "partida", or "nomenclatura".
      - "DELEGATE_MARKET": Use this for ANY query asking about financial feasibility, costs, ROI, what type of apartments to build, unit counts ("cuántos deptos"), prices, or real estate market recommendations. NEVER synthesize architectural layout optimization or financial answers yourself. ALWAYS delegate to MARKET.
      - "DELEGATE_PARCEL": Use ONLY for internal graph operations explicitly requesting to update a parcel's entity in the database.
      - "SYNTHESIZE": Use ONLY to answer general conversational queries or summarize already provided Knowledge Scope. Do not use for calculating units or areas!
      - "INSUFFICIENT_KNOWLEDGE": ONLY use this for factual queries about specific entities that are missing from the Knowledge Scope and where no other agent can help. NEVER use this for "how many" or counting queries.
      
      Respond with a JSON containing:
      {
        "thoughtProcess": "Why you chose this action",
        "action": "DELEGATE_PARCEL" | "DELEGATE_URBAN" | "DELEGATE_DATA" | "DELEGATE_MARKET" | "SYNTHESIZE" | "INSUFFICIENT_KNOWLEDGE",
        "targetId": "Extract any relevant ID (e.g. parcel number or address) if applicable",
        "missing_information": ["What is missing if INSUFFICIENT_KNOWLEDGE"]
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
        // Fallback mock plan if LLM is mock or fails to return JSON
        const rawTextLower = (planRaw || '').toLowerCase();
        let fallbackAction = 'SYNTHESIZE';
        if (rawTextLower.includes('partido') || rawTextLower.includes('partida')) {
          fallbackAction = 'DELEGATE_URBAN';
        } else if (rawTextLower.includes('deptos') || rawTextLower.includes('rentabilidad')) {
          fallbackAction = 'DELEGATE_MARKET';
        }

        plan = {
          thoughtProcess: "Fallback due to JSON parse error.",
          action: fallbackAction,
          targetId: null,
          missing_information: []
        };
      }

      let subAgentOutput: AgentResult | null = null;

      if (plan.action === 'INSUFFICIENT_KNOWLEDGE') {
        return {
          status: 'insufficient_knowledge',
          output: {
            missing_information: plan.missing_information || [plan.thoughtProcess],
          }
        };
      }

      // Step 2: Return the routing decision directly. Let the route orchestrate the sub-agents.
      return {
        status: 'success',
        output: {
          action: plan.action,
          targetId: plan.targetId,
          plan: plan.thoughtProcess,
          answer: plan.action === 'SYNTHESIZE' ? plan.thoughtProcess : undefined
        }
      };

    } catch (error: any) {
      console.error('OrchestratorAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
