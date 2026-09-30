import { AgentTools } from '../tools';
import { getDefaultLLMProvider, LLMProvider, LLMMessage } from '../llm';
import { KnowledgeScope, StructuredAgentOutput } from '@/types';

export interface AgentContext {
  runId: string;
  objective: string;
  // FASE 1: Reemplazamos knowledgeScope crudo por referencias del Blackboard
  contextRefs?: {
    entities?: string[];
    artifacts?: string[];
    evidence?: string[];
  };
  input: Record<string, any>;
}

export interface AgentResult {
  status: 'success' | 'failed' | 'insufficient_knowledge';
  output?: StructuredAgentOutput | any;
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
   * Lee el Blackboard de la ejecución actual.
   */
  protected async getBlackboard(runId: string) {
    const { getServiceRoleClient } = await import('../supabase');
    const supabase = getServiceRoleClient();
    const { data } = await supabase.from('agent_runs').select('blackboard, context_refs').eq('id', runId).single();
    return data;
  }

  /**
   * Actualiza el Blackboard con nuevos datos temporales.
   */
  protected async updateBlackboard(runId: string, updates: any) {
    const { getServiceRoleClient } = await import('../supabase');
    const supabase = getServiceRoleClient();
    
    const { data: current } = await supabase.from('agent_runs').select('blackboard').eq('id', runId).single();
    const newBlackboard = { ...(current?.blackboard || {}), ...updates };
    
    await supabase.from('agent_runs').update({ blackboard: newBlackboard }).eq('id', runId);
  }

  /**
   * Crea un Artifact persistente y lo vincula al run_id
   */
  protected async produceArtifact(runId: string, type: string, content: any, metadata: any = {}) {
    const { getServiceRoleClient } = await import('../supabase');
    const supabase = getServiceRoleClient();
    const artifactId = `artifact_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    await supabase.from('artifacts').insert({
      id: artifactId,
      run_id: runId.startsWith('run-') ? runId : null,
      agent_id: this.agentId,
      type: type,
      content: content,
      metadata: metadata
    });
    
    return artifactId;
  }
  
  /**
   * Helper to format prompts and get LLM completions.
   */
  protected async callLLM(prompt: string, contextData?: any, options?: any): Promise<string> {
    // Fetch custom configuration from DB if it exists
    let customSystemPrompt = '';
    let customContext = '';
    try {
      const { getServiceRoleClient } = await import('../supabase');
      const supabase = getServiceRoleClient();
      const { data } = await supabase.from('agents').select('system_prompt, context').eq('id', this.agentId).single();
      if (data) {
        if (data.system_prompt) customSystemPrompt = `\n[CUSTOM USER INSTRUCTIONS]\n${data.system_prompt}\n`;
        if (data.context) customContext = `\n[CUSTOM USER CONTEXT]\n${data.context}\n`;
      }
    } catch (e) {
      console.warn(`Could not fetch custom config for agent ${this.agentId}`);
    }

    const systemPrompt = `You are ArqTech Agent: ${this.agentId}. 
CRITICAL RULE: You must operate under STRICT CONSTRAINED REASONING.
1. You may ONLY use the information provided via your explicit context references.
2. DO NOT use your general pre-trained knowledge to answer factual domain questions.
3. If the context does not contain enough evidence, state INSUFFICIENT_KNOWLEDGE.
4. Produce structured outputs (Artifacts, Claims) when required.
Objective: extract structured data or answer based strictly on the provided evidence.${customSystemPrompt}${customContext}`;

    // Si contextData es una lista de referencias, el agente debería usar herramientas para expandirlas. 
    // Para simplificar la transición, pasamos los datos que reciba por ahora.
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${prompt}${contextData ? `\n\nContext Data / References:\n${JSON.stringify(contextData)}` : ''}` }
    ];
    
    const response = await this.llm.generateContent(messages, options);
    return response.text || '';
  }

  /**
   * Advanced Helper to format prompts and get LLM completions with full response (including tool_calls).
   */
  protected async callLLMWithTools(messages: LLMMessage[], options?: any) {
    let customSystemPrompt = '';
    let customContext = '';
    try {
      const { getServiceRoleClient } = await import('../supabase');
      const supabase = getServiceRoleClient();
      const { data } = await supabase.from('agents').select('system_prompt, context').eq('id', this.agentId).single();
      if (data) {
        if (data.system_prompt) customSystemPrompt = `\n[CUSTOM USER INSTRUCTIONS]\n${data.system_prompt}\n`;
        if (data.context) customContext = `\n[CUSTOM USER CONTEXT]\n${data.context}\n`;
      }
    } catch (e) {}

    const baseSystemPrompt = `You are ArqTech Agent: ${this.agentId}. 
CRITICAL RULE: You must operate under STRICT CONSTRAINED REASONING.
1. You may ONLY use the information provided via your explicit context references.
2. DO NOT use your general pre-trained knowledge to answer factual domain questions.
3. If the context does not contain enough evidence, state INSUFFICIENT_KNOWLEDGE.
4. Produce structured outputs (Artifacts, Claims) when required.
Objective: extract structured data or answer based strictly on the provided evidence.${customSystemPrompt}${customContext}`;

    // Ensure system prompt is the first message or prepend it
    const finalMessages = [
      { role: 'system', content: baseSystemPrompt } as LLMMessage,
      ...messages
    ];

    return await this.llm.generateContent(finalMessages, options);
  }
}

