import { Conflict, Observation } from '@/types';
import { getDefaultLLMProvider } from '../llm';
import { db } from '../db';

export class ConflictResolver {
  private llm = getDefaultLLMProvider();

  /**
   * Scans a set of observations to detect and evaluate conflicts.
   * A conflict occurs when two observations assert different values for the same predicate on the same entity.
   */
  async detectAndEvaluateConflicts(observations: Observation[]): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    // Group observations by subject_entity_id + predicate
    const groups: Record<string, Observation[]> = {};
    for (const obs of observations) {
      const key = `${obs.subject_entity_id}_${obs.predicate}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(obs);
    }

    // Detect contradictions (same entity, same predicate, different value)
    for (const [key, obsGroup] of Object.entries(groups)) {
      if (obsGroup.length > 1) {
        // Compare values
        const distinctValues = new Set(obsGroup.map(o => o.value));
        if (distinctValues.size > 1) {
          // A conflict is detected
          const conflict = await this.evaluateConflict(obsGroup);
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private async evaluateConflict(conflictingObs: Observation[]): Promise<Conflict> {
    const evidence_ids = conflictingObs.map(o => o.id);
    
    // Simple heuristic: most recent observation
    const sortedByDate = [...conflictingObs].sort((a, b) => 
      new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
    );
    const latestId = sortedByDate[0].id;
    
    // Fallback hierarchy evaluation if source is present (e.g. 'Municipalidad' beats 'User')
    let highestHierarchyId = conflictingObs[0].id;
    const hierarchyScores: Record<string, number> = {
      'boletin_oficial': 100,
      'codigo_urbanistico': 90,
      'catastro': 80,
      'user_input': 10
    };

    let maxScore = -1;
    for (const obs of conflictingObs) {
      const score = hierarchyScores[obs.source || 'user_input'] || 0;
      if (score > maxScore) {
        maxScore = score;
        highestHierarchyId = obs.id;
      }
    }

    // LLM synthesis for a description
    const prompt = `
    Analyze this conflicting information.
    ${JSON.stringify(conflictingObs, null, 2)}
    
    Describe the conflict briefly in one sentence. Do not resolve it.
    `;
    
    let description = "Conflict in observations.";
    try {
      const response = await this.llm.generateContent([
        { role: 'user', content: prompt }
      ]);
      description = (response.text || "Conflict in observations.").trim();
    } catch (e) {
      console.warn('LLM failed to summarize conflict.');
    }

    return {
      id: `conflict-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description,
      evidence_ids,
      resolved: false,
      evaluation: {
        latest_timestamp_id: latestId,
        highest_hierarchy_id: highestHierarchyId
      }
    };
  }
}
