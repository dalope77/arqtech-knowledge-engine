import { Claim, KnowledgeScope } from '@/types';
import { getServiceRoleClient } from '../supabase';
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

    // No longer fetching all observations blindly. Evidence is checked per claim.
    const allowedObservations: any[] = [];

    for (const claim of claims) {
      const result = await this.validateSingleClaim(claim, scope);
      
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

  private async validateSingleClaim(claim: Claim, scope: KnowledgeScope): Promise<ValidationResult> {
    const supabase = getServiceRoleClient();

    // 1. Fetch the actual claim and evidence from the database
    const { data: dbClaim } = await supabase.from('claims').select('*').eq('id', claim.id).single();
    const { data: evidenceItems } = await supabase.from('evidence').select('*').eq('claim_id', claim.id);

    if (!dbClaim) {
       // Si el claim viene en memoria (ej. de un agente en transición), saltamos a validación básica
       if (!claim.evidence_ids || claim.evidence_ids.length === 0) {
         return { isValid: false, claim, reason: 'No evidence provided.' };
       }
    } else {
       if (!evidenceItems || evidenceItems.length === 0) {
         return { isValid: false, claim, reason: 'No evidence linked in the database.' };
       }
    }

    const evidenceToEvaluate = evidenceItems || claim.evidence_ids;

    // 2. Check if evidence belongs to the KnowledgeScope (ContextRefs)
    // En la nueva arquitectura verificamos si la entidad/observación de la evidencia está en las referencias
    // Por simplicidad en esta iteración omitimos el match estricto y vamos a la validación semántica
    
    // 3. Epistemological / Semantic Validation: Does the evidence actually support the claim?
    // Using a fast LLM verification call
    const prompt = `
    You are a strict Epistemological Claim Validator for ArqTech.
    
    Claim to verify: "${claim.claim || dbClaim?.statement}"
    
    Evidence provided:
    ${JSON.stringify(evidenceToEvaluate, null, 2)}
    
    Rules:
    1. Check if evidence explicitly supports the claim.
    2. Distinguish between facts (OBSERVED), logical deductions (DERIVED), and guesses (HYPOTHESIS).
    3. Do not validate hypotheses as facts.
    
    Does the evidence FULLY support the claim without any assumptions? 
    If yes, respond with {"supported": true, "level": "VALIDATED", "reason": "ok"}.
    If no, respond with {"supported": false, "level": "HYPOTHESIS", "reason": "Explanation of why it fails"}.
    `;

    try {
      const response = await this.llm.generateContent([
        { role: 'system', content: 'You are a strict validation engine.' },
        { role: 'user', content: prompt }
      ], { response_format: { type: 'json_object' } });
      
      const responseText = response.text || "{}";
      const analysis = JSON.parse(responseText);
      
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
