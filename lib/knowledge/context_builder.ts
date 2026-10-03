import { KnowledgeScope, Entity, Relation, Observation } from '@/types';
import { db } from '../db';
import { getDefaultLLMProvider } from '../llm';
import { ConflictResolver } from './conflict_resolver';
import { RetrievalRouter } from './retrieval_router';

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
  private retrievalRouter = new RetrievalRouter();

  async buildInitialScope(query: string, userContext?: any): Promise<KnowledgeScope> {
    // 1. Analyze Query
    const analysis = await this.queryAnalyzer.analyze(query, userContext);
    const keywords = analysis.keywords || [];
    const entitiesToSearch = analysis.entitiesToSearch || [];
    const requiredDomains = analysis.requiredDomains || [];
    
    // 2. Scalable database search using keywords to grab ENTITY IDs ONLY
    const searchTerms = [...keywords, ...entitiesToSearch];
    const matchedEntities = await db.searchEntities(searchTerms, 10);
    const entityIds = matchedEntities.map(e => e.id);

    // 3. Obtain Relevant Artifacts and Evidence using RetrievalRouter (The "Ontological Graph" query)
    const artifactIds: string[] = [];
    const evidenceIds: string[] = [];
    
    let intent = 'general';
    if (requiredDomains.includes('normativa') || requiredDomains.includes('legal')) intent = 'search normative';
    if (requiredDomains.includes('espacial')) intent = 'spatial';
    if (requiredDomains.includes('mercado')) intent = 'relational';

    const routerResults = await this.retrievalRouter.retrieve(intent, { 
      query, 
      searchTerms,
      domains: requiredDomains
    });

    if (routerResults && Array.isArray(routerResults)) {
      for (const item of routerResults) {
        if (item.id) {
          if (item.statement) {
            // It's a claim (evidence)
            if (!evidenceIds.includes(item.id)) evidenceIds.push(item.id);
          } else if (item.type && !entityIds.includes(item.id)) {
            // It's an entity
            entityIds.push(item.id);
          }
        }
      }
    }

    // 4. Scope Validator
    // Nos aseguramos de no incluir información de más para no ahogar al LLM y ahorrar tokens
    const finalEntities = entityIds.slice(0, 8);
    const finalEvidence = evidenceIds.slice(0, 10);
    
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
      allowedAgentIds: this.determineAllowedAgents(requiredDomains),
      maxDepth: 1,
      missingInformation: [],
      expansionRequests: [],
      // Referencias del universo reducido que se pasan al Agente
      artifactIds: artifactIds,
      evidenceIds: finalEvidence
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
