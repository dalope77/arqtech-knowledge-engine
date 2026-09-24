import { AgentTools } from '../tools';
import { getDefaultLLMProvider, LLMProvider, LLMMessage } from '../llm';

export interface AgentContext {
  runId: string;
  objective: string;
  input: Record<string, any>;
}

export interface AgentResult {
  status: 'success' | 'failed';
  output?: Record<string, any>;
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
    const messages: LLMMessage[] = [
      { role: 'system', content: `You are ArqTech Agent: ${this.agentId}. Objective: extract structured data for the Knowledge Graph.` },
      { role: 'user', content: `${prompt}\nContext: ${JSON.stringify(contextData)}` }
    ];
    
    const response = await this.llm.generateContent(messages);
    return response.text;
  }
}

