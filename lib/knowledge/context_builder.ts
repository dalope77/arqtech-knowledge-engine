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
    
    // 2. Scalable database search using keywords
    const searchTerms = [...keywords, ...entitiesToSearch];
    const matchedEntities = await db.searchEntities(searchTerms, 10);
    const entityIds = matchedEntities.map(e => e.id);

    // Get relations connected to matched entities
    let matchedRelations = [];
    if (entityIds.length > 0) {
      // In a real production app we would do a single query `in (entityIds)`
      // for relations, but we can iterate or rely on a new db method.
      // For now we simulate with a limited query (we should add getRelationsForEntities later)
      for (const id of entityIds) {
        const rels = await db.getRelationsForEntity(id);
        matchedRelations.push(...rels);
      }
    }
    // Deduplicate
    matchedRelations = Array.from(new Map(matchedRelations.map(r => [r.id, r])).values()).slice(0, 20);
    const relationIds = matchedRelations.map(r => r.id);

    // Bring in connected entities that were missed by text search
    matchedRelations.forEach(r => {
      if (!entityIds.includes(r.from_entity_id)) entityIds.push(r.from_entity_id);
      if (!entityIds.includes(r.to_entity_id)) entityIds.push(r.to_entity_id);
    });

    // Get observations for all included entities
    let matchedObservations = [];
    if (entityIds.length > 0) {
      for (const id of entityIds) {
        const obs = await db.getObservationsForEntity(id);
        matchedObservations.push(...obs);
      }
    }
    // Deduplicate
    matchedObservations = Array.from(new Map(matchedObservations.map(o => [o.id, o])).values()).slice(0, 30);
    const observationIds = matchedObservations.map(o => o.id);

    const conflictResolver = new ConflictResolver();
    const conflicts = await conflictResolver.detectAndEvaluateConflicts(matchedObservations);

    // 3. Construct KnowledgeScope
    const scope: KnowledgeScope = {
      query,
      userContext,
      entityIds,
      relationIds,
      observationIds,
      conflicts,
      documentIds: [],
      eventIds: [],
      vectorResults: [],
      allowedAgentIds: this.determineAllowedAgents(analysis.requiredDomains),
      maxDepth: 3,
      missingInformation: [],
      expansionRequests: []
    };

    return scope;
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
