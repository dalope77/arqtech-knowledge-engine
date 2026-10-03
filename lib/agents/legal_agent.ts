import { BaseAgent, AgentContext, AgentResult } from './index';
import { LLMMessage } from '../llm';
import { getServiceRoleClient } from '../supabase';

export class LegalAgent extends BaseAgent {
  constructor() {
    super('LEGAL_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { query } = context.input;
      
      const prompt = `
      You are the ArqTech Legal & Regulatory Agent, an expert in urban planning law, municipal ordinances, and real estate regulations.
      
      User / System Query: "${query}"
      
      PRE-FILTERED CONTEXT (Reduced Universe):
      ${context.contextRefs ? JSON.stringify(context.contextRefs) : 'No specific context provided.'}
      
      Your task is to analyze the proposed architectural draft or legal query using the PRE-FILTERED CONTEXT above as your primary source of truth.
      
      CRITICAL LEGAL RULES FOR ANALYSIS:
      1. Legal Foundation: Provide the legal justification for the proposed uses (e.g., why mixed-use or residential is allowed under current typical zoning laws).
      2. Regulatory Relationships & Precedents: If the user asks about derogated ordinances, modifications, or zoning exceptions over time, YOU MUST use the \`search_regulatory_relationships\` tool to query our Knowledge Graph for precedents (if they aren't already in the PRE-FILTERED CONTEXT).
      3. Competitive Advantages (Premios): Look for opportunities that give the developer a competitive advantage. For example:
         - "Premios" (bonuses) in FOT or FOS for providing public green spaces, sustainable design (LEED/EDGE), or preserving heritage facades.
         - Tax exemptions or municipal incentives for certain types of development (e.g., affordable housing or tech hubs).
         - Flexibility in parking requirements if near public transit.
      4. Point out any legal red flags or risks (e.g., neighbor dispute risks, environmental impact assessments required for large footprints).
      
      Respond with a concise, professional legal audit. Start with [FUNDAMENTACIÓN LEGAL] and end with [VENTAJAS COMPETITIVAS] if you find any loopholes, bonuses, or relevant exceptions.
      `;

      const messages: LLMMessage[] = [
        { role: 'user', content: prompt }
      ];

      const tools = [
        {
          type: 'function',
          function: {
            name: 'search_regulatory_relationships',
            description: 'Busca en la base de datos de grafos de conocimiento relaciones entre normativas (ej. derogaciones, modificaciones, excepciones de zonificación) y precedentes.',
            parameters: {
              type: 'object',
              properties: {
                search_term: { type: 'string', description: 'El término o número de ordenanza a buscar (ej. "deroga", "excepcion", "ordenanza 123")' }
              },
              required: ['search_term']
            }
          }
        }
      ];

      let response = await this.callLLMWithTools(messages, { tools });

      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];
        
        if (toolCall.function?.name === 'search_regulatory_relationships') {
          console.log('[LegalAgent] LLM requested database query:', toolCall.function.arguments);
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const term = args.search_term || 'deroga';
          
          const supabase = getServiceRoleClient();
          // Buscamos en 'claims' (donde guardamos afirmaciones del tipo "X deroga Y" o "Z tiene excepción")
          const { data: claims } = await supabase
            .from('claims')
            .select('statement, confidence, metadata')
            .or(`statement.ilike.%deroga%,statement.ilike.%excepcion%,statement.ilike.%${term}%`)
            .limit(15);

          let dbResults = 'No se encontraron resultados relevantes de normativas en la base de datos.';
          if (claims && claims.length > 0) {
            dbResults = "Encontré los siguientes precedentes legales/normativos (Claims):\n" + claims.map((c: any) => 
              `- Relación/Afirmación: "${c.statement}" (Confianza: ${c.confidence})\n  Metadata: ${JSON.stringify(c.metadata?.context_refs || {})}`
            ).join('\n');
            dbResults += "\n\nAnaliza estos datos e inclúyelos en tu fundamentación legal.";
          }

          messages.push({ role: 'assistant', content: null, tool_calls: response.tool_calls });
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: dbResults });
          
          response = await this.callLLMWithTools(messages, { tools });
        }
      }

      return {
        status: 'success',
        output: { answer: response.text || 'Sin respuesta.' }
      };

    } catch (error: any) {
      console.error('LegalAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
