import { BaseAgent, AgentContext, AgentResult } from './index';

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
      
      Your task is to analyze the proposed architectural and financial draft.
      
      CRITICAL LEGAL RULES FOR ANALYSIS:
      1. Legal Foundation: Provide the legal justification for the proposed uses (e.g., why mixed-use or residential is allowed under current typical zoning laws).
      2. Competitive Advantages (Premios): Look for opportunities that give the developer a competitive advantage. For example:
         - "Premios" (bonuses) in FOT or FOS for providing public green spaces, sustainable design (LEED/EDGE), or preserving heritage facades.
         - Tax exemptions or municipal incentives for certain types of development (e.g., affordable housing or tech hubs).
         - Flexibility in parking requirements if near public transit.
      3. Point out any legal red flags or risks (e.g., neighbor dispute risks, environmental impact assessments required for large footprints).
      
      Respond with a concise, professional legal audit. Start with [FUNDAMENTACIÓN LEGAL] and end with [VENTAJAS COMPETITIVAS] if you find any loopholes or bonuses.
      `;

      const response = await this.callLLM(prompt);

      return {
        status: 'success',
        output: { answer: response }
      };

    } catch (error: any) {
      console.error('LegalAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
