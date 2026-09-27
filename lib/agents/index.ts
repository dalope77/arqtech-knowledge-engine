import { AgentTools } from '../tools';
import { getDefaultLLMProvider, LLMProvider, LLMMessage } from '../llm';
import { KnowledgeScope, StructuredAgentOutput } from '@/types';

export interface AgentContext {
  runId: string;
  objective: string;
  knowledgeScope?: KnowledgeScope;
  input: Record<string, any>;
}

export interface AgentResult {
  status: 'success' | 'failed' | 'insufficient_knowledge';
  output?: StructuredAgentOutput;
  error?: string;
}

export abstract class BaseAgent {
  protected tools: AgentTools;
  protected llm: LLMProvider;

  constructor(
    public readonly agentId: string,
    public readonly model: string
  ) {
    this.tools = new AgentTools(agentId);
    this.llm = getDefaultLLMProvider();
  }

  /**
   * The main execution loop of the agent.
   * Derived classes must implement this to define their specific behavior.
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;
  
  /**
   * Helper to format prompts and get LLM completions.
   */
  protected async callLLM(prompt: string, contextData: any): Promise<string> {
    const systemPrompt = `You are ArqTech Agent: ${this.agentId}. 
CRITICAL RULE: You must operate under STRICT CONSTRAINED REASONING.
1. You may ONLY use the information provided in the Context (KnowledgeScope).
2. DO NOT use your general pre-trained knowledge to answer factual questions.
3. If the context does not contain enough evidence to answer fully and accurately, you MUST explicitly state that there is INSUFFICIENT_KNOWLEDGE.
4. Do not invent, hallucinate, or assume missing properties (like costs, surfaces, zones, names).
Objective: extract structured data or answer based strictly on the provided evidence.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${prompt}\n\nContext (KnowledgeScope):\n${JSON.stringify(contextData)}` }
    ];
    
    const response = await this.llm.generateContent(messages);
    return response.text;
  }
}

