import { Claim, KnowledgeScope } from '@/types';
import { db } from '../db';
import { getDefaultLLMProvider } from '../llm';

export interface ValidationResult {
  isValid: boolean;
  claim: Claim;
  reason: string;
}

export class ClaimValidator {
  private llm = getDefaultLLMProvider();

  async validateClaims(claims: Claim[], scope: KnowledgeScope): Promise<{ validClaims: Claim[], rejectedClaims: Claim[], allValid: boolean }> {
    const validClaims: Claim[] = [];
    const rejectedClaims: Claim[] = [];

    // Pre-fetch scope observations once
    const scopeObservations = await db.getObservations();
    const allowedObservations = scopeObservations.filter(o => scope.observationIds.includes(o.id));

    for (const claim of claims) {
      const result = await this.validateSingleClaim(claim, scope, allowedObservations);
      
      claim.status = result.isValid ? 'validated' : 'rejected';

      if (result.isValid) {
        validClaims.push(claim);
      } else {
        console.warn(`Claim rejected: "${claim.claim}". Reason: ${result.reason}`);
        rejectedClaims.push(claim);
      }
    }

    return {
      validClaims,
      rejectedClaims,
      allValid: rejectedClaims.length === 0
    };
  }

  private async validateSingleClaim(claim: Claim, scope: KnowledgeScope, allowedObservations: any[]): Promise<ValidationResult> {
    // 1. Check if evidence is provided
    if (!claim.evidence_ids || claim.evidence_ids.length === 0) {
      return { isValid: false, claim, reason: 'No evidence provided.' };
    }

    // 2. Check if evidence belongs to the KnowledgeScope
    const outOfScopeEvidence = claim.evidence_ids.filter(id => !scope.observationIds.includes(id));
    if (outOfScopeEvidence.length > 0) {
      return { isValid: false, claim, reason: `Evidence IDs [${outOfScopeEvidence.join(', ')}] are out of the KnowledgeScope.` };
    }

    // 3. Fetch evidence content
    const evidenceItems = allowedObservations.filter(o => claim.evidence_ids.includes(o.id));
    if (evidenceItems.length !== claim.evidence_ids.length) {
      return { isValid: false, claim, reason: 'Some evidence IDs do not exist in the database.' };
    }

    // 4. (Optional/Future) Date/Validity check
    // const now = new Date();
    // if (evidenceItems.some(e => e.valid_to && new Date(e.valid_to) < now)) {
    //   return { isValid: false, claim, reason: 'Some evidence has expired.' };
    // }

    // 5. Semantic Validation: Does the evidence actually support the claim?
    // Using a fast LLM verification call
    const prompt = `
    You are a strict Claim Validator.
    
    Claim to verify: "${claim.claim}"
    
    Evidence provided:
    ${JSON.stringify(evidenceItems, null, 2)}
    
    Does the evidence FULLY support the claim without any assumptions? 
    If yes, respond with {"supported": true, "reason": "ok"}.
    If no, respond with {"supported": false, "reason": "Explanation of why it fails"}.
    `;

    try {
      const response = await this.llm.generateContent([
        { role: 'system', content: 'You are a strict validation engine.' },
        { role: 'user', content: prompt }
      ], { response_format: { type: 'json_object' } });
      
      const analysis = JSON.parse(response.text);
      
      if (!analysis.supported) {
        return { isValid: false, claim, reason: analysis.reason };
      }
    } catch (e) {
      console.error('Claim semantic validation failed:', e);
      // Fallback: if LLM fails, we reject to be safe (Strict mode)
      return { isValid: false, claim, reason: 'Semantic validation error' };
    }

    return { isValid: true, claim, reason: 'Supported by evidence.' };
  }
}
