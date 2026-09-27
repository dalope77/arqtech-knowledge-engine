import { BaseAgent, AgentContext, AgentResult } from './index';
import { ParcelAgent } from './parcel_agent';


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

      let graphContext = '';
      if (context.knowledgeScope) {
        // In a real implementation, we would fetch the actual entities/observations from DB using these IDs
        graphContext = `\nKnowledge Scope provided (Epistemic Boundary):\nEntities count: ${context.knowledgeScope.entityIds.length}\nObservations count: ${context.knowledgeScope.observationIds.length}\nAllowed Agents: ${context.knowledgeScope.allowedAgentIds?.join(', ')}`;
        
        if (context.knowledgeScope.conflicts && context.knowledgeScope.conflicts.length > 0) {
           graphContext += `\n\nConflicts detected in Evidence:\n${JSON.stringify(context.knowledgeScope.conflicts, null, 2)}`;
        }

        if (context.knowledgeScope.userContext) {
           graphContext += `\n\nUser Context:\n${JSON.stringify(context.knowledgeScope.userContext, null, 2)}`;
        }
      } else {
        graphContext = `\n(No Knowledge Scope provided. Proceed with caution.)`;
      }

      // Step 1: Analyze query and plan execution (Strict Delegation)
      const planningPrompt = `
      You are the ArqTech Master Orchestrator.
      User Query: "${query}"
      
      Your goal is ONLY to route the request to the correct specialist or decide to answer directly if it's a general question.
      You DO NOT solve domain problems yourself.
      
      Respond with a JSON containing:
      {
        "thoughtProcess": "Why you chose this action",
        "action": "DELEGATE_PARCEL" | "DELEGATE_INGESTION" | "SYNTHESIZE" | "INSUFFICIENT_KNOWLEDGE",
        "targetId": "Extract any relevant ID (e.g. parcel number) if applicable",
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
        plan = {
          thoughtProcess: "I need to analyze this request and check the knowledge graph.",
          action: "SYNTHESIZE",
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

      // Step 2: Execute delegated action if needed
      if (plan.action === 'DELEGATE_PARCEL' && plan.targetId) {
        const parcelAgent = new ParcelAgent();
        const result = await parcelAgent.execute({
          runId: context.runId + '-sub1',
          objective: 'Delegated by orchestrator',
          input: { parcelId: plan.targetId }
        });
        subAgentOutput = result;
      }
      
      // If subAgent failed or returned insufficient knowledge, propagate it
      if (subAgentOutput && subAgentOutput.status !== 'success') {
         return subAgentOutput;
      }

      // Step 3: Synthesis
      const synthesisPrompt = `
      You are the ArqTech Master Orchestrator. Synthesize the final response.
      Query: "${query}"
      Context: ${graphContext}
      Sub-Agent Evidence: ${JSON.stringify(subAgentOutput?.output?.evidence || [])}
      
      Create multiple Candidate Answers based ONLY on the evidence. Adapt to User Context if provided.
      Respond with JSON:
      {
        "answer": "Summary answer",
        "candidateAnswers": [
          { "id": "ans_1", "perspective": "normativa", "content": "..." },
          { "id": "ans_2", "perspective": "economica", "content": "..." }
        ],
        "newRelationsToCreate": [{"from": "Entity", "type": "relation", "to": "Entity"}]
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
        synth = { answer: 'Fallback synthesis.', candidateAnswers: [], newRelationsToCreate: [] };
      }

      // Step 4: Learn and create new relations found in the analysis
      const createdRelations = [];
      if (synth.newRelationsToCreate && synth.newRelationsToCreate.length > 0) {
        for (const rel of synth.newRelationsToCreate) {
          try {
            const e1 = await this.tools.discoverEntity('HIPOTESIS', rel.from, { source: 'ORCHESTRATOR_LEARNING' });
            const e2 = await this.tools.discoverEntity('HIPOTESIS', rel.to, { source: 'ORCHESTRATOR_LEARNING' });
            if (e1 && e2) {
              await this.tools.linkEntities(e1.id, rel.type, e2.id, 0.95);
              createdRelations.push(rel);
            }
          } catch (dbErr) {
            createdRelations.push(rel);
          }
        }
      }

      return {
        status: 'success',
        output: {
          answer: synth.answer,
          candidate_answers: synth.candidateAnswers || [],
          next_tasks: [],
          relations: createdRelations as any[],
          evidence: subAgentOutput ? (subAgentOutput.output?.evidence || []) : []
        }
      };

    } catch (error: any) {
      console.error('OrchestratorAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
