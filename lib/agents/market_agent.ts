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
      
      PRE-FILTERED CONTEXT (Reduced Universe):
      ${context.contextRefs ? JSON.stringify(context.contextRefs) : 'No specific context provided.'}
      
      Your task is to analyze the user's request regarding urban development, feasibility, or market reports, and produce a HIGH-VALUE EXECUTIVE REPORT using the PRE-FILTERED CONTEXT as your primary source of truth.
      
      CRITICAL INTERACTIVE RULES (ANTI-HALLUCINATION):
      1. You MUST read the conversation history and the PRE-FILTERED CONTEXT to find any available data (location, FOS, FOT, area, height limit).
      2. IF YOU ARE MISSING ANY CRITICAL DATA (e.g., you don't know the lot size, the location, or the FOS/FOT), DO NOT MAKE IT UP. DO NOT MOCK DATA.
      3. Instead of producing the report, your entire response MUST start with the exact text "[REQ_INFO]" followed by a direct question to the user asking for the specific missing information (e.g., "[REQ_INFO] Para armar el informe necesito saber: 1. ¿Cuál es la superficie del lote?").
      4. If you have the data, you MUST explicitly state where you got it from (e.g., "Según los datos catastrales de ARBA...", "Según el Grafo de Conocimiento...").
      
      CRITICAL STRUCTURE - YOU MUST FORMAT YOUR OUTPUT EXACTLY USING THESE SECTIONS:
      
      ### 1. Volumetría y Dinámica (El Mes en Números)
      - Provide data (or robust estimates if exact data is missing) on market supply (e.g. number of properties, new vs dropped listings).
      - Detail the market rotation speed (e.g. typical days on market) and pricing adjustment trends (e.g. % of properties lowering prices).
      
      ### 2. Pricing Preciso y Optimización Arquitectónica
      - Define precise values: USD/m2 for built space, USD/m2 for lots, or USD/hectare for rural land.
      - Apply CRITICAL ARCHITECTURAL RULES: Calculate Total Buildable Area (Area * FOT) and Max Floor Plate (Area * FOS). Find the optimal number of floors (Total Buildable / Max Plate). Deduct 20-25% for circulation to get Net Sellable Area.
      - Provide a logical unit mix and rough construction cost vs sellout estimation.
      
      ### 3. Perspectiva Regional
      - Position the target area against its neighboring districts.
      - Explain why the land value in this specific location is competitive or premium compared to its surroundings.
      
      ### 4. Fundamentación Estratégica
      - Justify the prices and feasibility based on real strategic infrastructure (e.g., proximity to highways, industrial parks, health centers, universities, or demographic growth).
      
      Produce a highly professional, mathematically sound, and architecturally optimized feasibility report. Use Markdown natively.
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
