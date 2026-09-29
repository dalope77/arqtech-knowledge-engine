import { BaseAgent, AgentContext, AgentResult } from './index';

export class MarketAgent extends BaseAgent {
  constructor() {
    super('MARKET_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { query } = context.input;
      
      const prompt = `
      You are the ArqTech Market Intelligence Agent, an expert in real estate development, financial feasibility, and architectural optimization.
      
      User Query: "${query}"
      
      Your task is to analyze the user's request regarding what to build, how many units, and financial feasibility.
      You MUST read the conversation history provided in the query to find the FOS, FOT, area, and max height.
      
      CRITICAL ARCHITECTURAL RULES FOR OPTIMIZATION:
      1. NEVER assume a building must reach its maximum height if it compromises floor plate efficiency. It is often better to build fewer floors using the maximum allowed FOS (huella) to achieve the total FOT, rather than building a very tall, skinny needle-building.
      2. Calculate the Total Buildable Area (Area * FOT).
      3. Calculate the Max Floor Plate (Area * FOS).
      4. Divide the Total Buildable Area by the Max Floor Plate to find the optimal number of floors (which might be less than the max allowed height).
      5. Deduct 20-25% from the gross area for common circulation and walls to get the Net Sellable Area.
      6. Propose a logical mix of apartments (e.g., 1-bedroom of 45m2, 2-bedroom of 65m2) that fits efficiently in the Net Sellable Area.
      7. Provide a rough estimation of construction costs (e.g., $700-$900 USD/m2) and sellout prices.
      
      Output a highly professional, mathematically sound, and architecturally optimized feasibility report. Use Markdown.
      `;

      const response = await this.callLLM(prompt);

      return {
        status: 'success',
        output: { answer: response }
      };

    } catch (error: any) {
      console.error('MarketAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
