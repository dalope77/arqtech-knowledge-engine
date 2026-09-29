import { BaseAgent, AgentContext, AgentResult } from './index';

export class WebScrapingAgent extends BaseAgent {
  constructor() {
    super('SCRAPING_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const inputStr = context.input.query || context.input.externalDataSchema || '';
      
      let rawData = '';
      let sourceName = 'Manual Input';

      if (inputStr.startsWith('http')) {
        console.log(`[ScrapingAgent] Fetching URL: ${inputStr}`);
        const response = await fetch(inputStr);
        const html = await response.text();
        
        rawData = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
                      
        if (rawData.length > 8000) rawData = rawData.substring(0, 8000);
        sourceName = inputStr;
      } else {
        rawData = inputStr;
      }

      if (!rawData) {
        throw new Error('No URL or text provided to scrape.');
      }

      const mappingPrompt = `
      You are an intelligent Web Scraping & Ingestion Agent for ArqTech.
      Analyze this raw text extracted from ${sourceName}:
      
      ${rawData}
      
      Extract the main concepts as an array of entities. For each entity, provide its 'type', 'name', and an array of 'observations' (key-value pairs).
      Only return valid JSON in this format:
      {
        "entities": [
          {
            "type": "TRAMITE",
            "name": "Nombre del concepto",
            "observations": { "clave": "valor" }
          }
        ]
      }
      Do not include markdown or extra text.
      `;

      console.log(`[ScrapingAgent] Sending data to LLM for extraction...`);
      const llmResponse = await this.callLLM(mappingPrompt, {});
      
      let extractionPlan;
      try {
        const jsonStr = llmResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        extractionPlan = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error('LLM failed to return valid JSON.');
      }

      const entities = extractionPlan.entities || [];
      let savedCount = 0;

      for (const item of entities) {
        const entityType = item.type || 'WEB_DATA';
        const entityName = item.name || 'Extracted Entity';
        
        const entity = await this.tools.discoverEntity(entityType, entityName, {
          source: sourceName
        });

        if (entity && item.observations && typeof item.observations === 'object') {
          for (const [key, value] of Object.entries(item.observations)) {
            await this.tools.recordObservation(
              entity.id,
              key,
              String(value),
              sourceName
            );
          }
          savedCount++;
        }
      }

      return {
        status: 'success',
        output: {
          answer: `Datos extraídos de la web exitosamente. Se guardaron ${savedCount} entidades en el Knowledge Graph desde ${sourceName}.`
        }
      };

    } catch (error: any) {
      console.error('WebScrapingAgent Failed:', error);
      return { status: 'failed', error: error.message || 'Unknown error' };
    }
  }
}
