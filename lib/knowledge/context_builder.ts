import { KnowledgeScope, Entity, Relation, Observation } from '@/types';
import { db } from '../db';
import { getDefaultLLMProvider } from '../llm';
import { ConflictResolver } from './conflict_resolver';

export class QueryAnalyzer {
  private llm = getDefaultLLMProvider();

  async analyze(query: string, userContext?: any): Promise<{ keywords: string[]; entitiesToSearch: string[]; requiredDomains: string[] }> {
    const prompt = `
    Analyze the following user query for a Real Estate / Urban Planning knowledge engine.
    User Context (if any): ${userContext ? JSON.stringify(userContext) : 'None provided'}
    
    Extract the main keywords, potential entity names (like parcel numbers, neighborhoods, zones), 
    and required domains (e.g., 'normativa', 'mercado', 'espacial', 'hidraulica').
    CRITICAL: For any acronyms or common terms (e.g., "POT", "FOS"), include their expanded forms or synonyms as additional keywords (e.g., "Plan de Ordenamiento Territorial", "Factor de Ocupacion").
    
    Query: "${query}"
    
    Return a JSON containing:
    {
      "keywords": ["keyword1", "synonym1", "expanded_acronym"],
      "entitiesToSearch": ["entity name 1"],
      "requiredDomains": ["normativa", "mercado"]
    }`;

    try {
      const response = await this.llm.generateContent([
        { role: 'system', content: 'You are the Query Analyzer.' },
        { role: 'user', content: prompt }
      ], { response_format: { type: 'json_object' } });

      const text = response.text || '{}';
      const match = text.match(/\{[\s\S]*\}/);
      const cleaned = match ? match[0] : '{}';
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('QueryAnalyzer failed, falling back to basic extraction.', e);
      return {
        keywords: query.toLowerCase().split(' ').filter(w => w.length > 3),
        entitiesToSearch: [],
        requiredDomains: ['general']
      };
    }
  }
}

export class ContextBuilder {
  private queryAnalyzer = new QueryAnalyzer();

  async buildInitialScope(query: string, userContext?: any): Promise<KnowledgeScope> {
    // 1. Analyze Query
    const analysis = await this.queryAnalyzer.analyze(query, userContext);
    const keywords = analysis.keywords || [];
    const entitiesToSearch = analysis.entitiesToSearch || [];
    
    // 2. Scalable database search using keywords to grab ENTITY IDs ONLY
    const searchTerms = [...keywords, ...entitiesToSearch];
    const matchedEntities = await db.searchEntities(searchTerms, 10);
    const entityIds = matchedEntities.map(e => e.id);

    // 3. Obtain Relevant Artifacts and Evidence
    // (Por ahora un stub, en el futuro usaremos RetrievalRouter para buscar artifacts semánticamente)
    const artifactIds: string[] = [];
    const evidenceIds: string[] = [];

    // 4. Scope Validator (Fase 6 incrustada parcialmente)
    // Nos aseguramos de no incluir información de más.
    const finalEntities = entityIds.slice(0, 5); // Limitar a las 5 más relevantes
    
    return {
      query,
      userContext,
      entityIds: finalEntities,
      relationIds: [],
      observationIds: [],
      conflicts: [],
      documentIds: [],
      eventIds: [],
      vectorResults: [],
      allowedAgentIds: this.determineAllowedAgents(analysis.requiredDomains),
      maxDepth: 1,
      missingInformation: [],
      expansionRequests: [],
      // Nuevos campos de referencias para la Fase 5
      artifactIds: artifactIds,
      evidenceIds: []
    };
  }

  async expandScope(currentScope: KnowledgeScope, missingInformation: string[]): Promise<KnowledgeScope> {
    currentScope.expansionRequests.push(...missingInformation);
    
    // Expansion: scalable search
    const newEntities = await db.searchEntities(missingInformation, 5);
    
    const newEntityIds = newEntities.map(e => e.id).filter(id => !currentScope.entityIds.includes(id));
    
    currentScope.entityIds.push(...newEntityIds);
    
    for (const id of newEntityIds) {
      const obs = await db.getObservationsForEntity(id);
      for (const o of obs) {
        if (!currentScope.observationIds.includes(o.id)) {
          currentScope.observationIds.push(o.id);
        }
      }
    }
    
    return currentScope;
  }

  private determineAllowedAgents(domains: string[] = []): string[] {
    const agents = ['ORCHESTRATOR_AGENT'];
    if (!domains) domains = ['general'];
    if (domains.includes('normativa') || domains.includes('general')) agents.push('PARCEL_AGENT');
    return agents;
  }
}
