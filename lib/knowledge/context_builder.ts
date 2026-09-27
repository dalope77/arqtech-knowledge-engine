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
    
    Query: "${query}"
    
    Return a JSON containing:
    {
      "keywords": ["keyword1", "keyword2"],
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
    
    // 2. Retrieve initial Universe (simulated retrieval from DB)
    const allEntities = await db.getEntities();
    const allRelations = await db.getRelations();
    const allObservations = await db.getObservations();

    const keywords = analysis.keywords || [];
    const entitiesToSearch = analysis.entitiesToSearch || [];
    const requiredDomains = analysis.requiredDomains || ['general'];

    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Naive local search for entities matching keywords or names or observation contents
    const matchedEntities = allEntities.filter(e => {
      const eName = normalize(e.name);
      const eType = normalize(e.type);
      
      const entityMatches = keywords.some(k => eName.includes(normalize(k)) || eType.includes(normalize(k))) ||
             entitiesToSearch.some(es => eName.includes(normalize(es)));
             
      if (entityMatches) return true;

      // Search inside observations for this entity
      const entityObservations = allObservations.filter(o => o.subject_entity_id === e.id);
      return entityObservations.some(o => {
        const val = normalize(o.value || '');
        return keywords.some(k => val.includes(normalize(k))) || entitiesToSearch.some(es => val.includes(normalize(es)));
      });
    }).slice(0, 10);

    const entityIds = matchedEntities.map(e => e.id);

    // Get relations connected to matched entities
    const matchedRelations = allRelations.filter(r => 
      entityIds.includes(r.from_entity_id) || entityIds.includes(r.to_entity_id)
    ).slice(0, 20);
    const relationIds = matchedRelations.map(r => r.id);

    // Bring in connected entities that were missed by text search
    matchedRelations.forEach(r => {
      if (!entityIds.includes(r.from_entity_id)) entityIds.push(r.from_entity_id);
      if (!entityIds.includes(r.to_entity_id)) entityIds.push(r.to_entity_id);
    });

    // Get observations for all included entities
    const matchedObservations = allObservations.filter(o => 
      entityIds.includes(o.subject_entity_id) || (o.object_entity_id && entityIds.includes(o.object_entity_id))
    ).slice(0, 30);
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
    
    // In a real implementation, we would query the DB (Vector Search or SQL) 
    // for the specific missing information requested by the agent.
    
    const allEntities = await db.getEntities();
    const allObservations = await db.getObservations();

    // Expansion: search for entities that match the missing information terms
    const newEntities = allEntities.filter(e => {
      if (currentScope.entityIds.includes(e.id)) return false;
      
      const eMatch = missingInformation.some(mi => 
        e.name.toLowerCase().includes(mi.toLowerCase()) || 
        e.type.toLowerCase().includes(mi.toLowerCase())
      );
      if (eMatch) return true;

      const entityObservations = allObservations.filter(o => o.subject_entity_id === e.id);
      return entityObservations.some(o => {
        const val = (o.value || '').toLowerCase();
        return missingInformation.some(mi => val.includes(mi.toLowerCase()));
      });
    }).slice(0, 5);
    const newEntityIds = newEntities.map(e => e.id);
    
    currentScope.entityIds.push(...newEntityIds);
    
    const newObservations = allObservations.filter(o => 
      newEntityIds.includes(o.subject_entity_id) && !currentScope.observationIds.includes(o.id)
    );
    currentScope.observationIds.push(...newObservations.map(o => o.id));
    
    return currentScope;
  }

  private determineAllowedAgents(domains: string[] = []): string[] {
    const agents = ['ORCHESTRATOR_AGENT'];
    if (!domains) domains = ['general'];
    if (domains.includes('normativa') || domains.includes('general')) agents.push('PARCEL_AGENT');
    return agents;
  }
}
