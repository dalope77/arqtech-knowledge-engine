import { ContextBuilder } from './lib/knowledge/context_builder';
import { OrchestratorAgent } from './lib/agents/orchestrator_agent';
import { ClaimValidator } from './lib/knowledge/claim_validator';
import { ResponseEvaluator } from './lib/knowledge/response_evaluator';
import { UserContext } from './types';

async function runVerticalSlice() {
  console.log('=== ARQTECH KNOWLEDGE ENGINE: VERTICAL SLICE ===\n');

  const query = "Qué normativa aprueba la primera fase del POT en La Plata";
  const userContext: UserContext = {
    id: "user-1",
    role: "Desarrollador Inmobiliario",
    objective: "Evaluar rentabilidad de lote",
    process_stage: "Factibilidad",
    experience_level: "expert",
    known_information: ["El lote mide 10x30"],
    preferences: {
      depth: "detailed",
      technical_jargon: true
    },
    previous_decisions: []
  };

  console.log('1. User Query:', query);
  console.log('2. User Context Role:', userContext.role);
  
  // 1. Context Builder (Universe Builder)
  const contextBuilder = new ContextBuilder();
  let knowledgeScope = await contextBuilder.buildInitialScope(query, userContext);
  console.log('\n[Context Builder] Initial Scope built. Allowed Agents:', knowledgeScope.allowedAgentIds);

  const orchestrator = new OrchestratorAgent();
  
  const MAX_EXPANSIONS = 2;
  let expansions = 0;
  let result: any = null;

  // 2. Iterative Expansion Loop & Orchestrator Coordination
  while (expansions <= MAX_EXPANSIONS) {
    console.log(`\n--- Execution Loop (Expansion ${expansions}) ---`);
    result = await orchestrator.execute({
      runId: 'test-run-1',
      objective: 'Answer user query',
      input: { query, userContext },
      contextRefs: { 
        entities: knowledgeScope.entityIds, 
        artifacts: knowledgeScope.artifactIds || [], 
        evidence: knowledgeScope.evidenceIds || [] 
      }
    });

    if (result.status === 'insufficient_knowledge' && result.output?.missing_information) {
      console.log('[Orchestrator] Reported Insufficient Knowledge:', result.output.missing_information);
      knowledgeScope = await contextBuilder.expandScope(knowledgeScope, result.output.missing_information);
      console.log('[Context Builder] Scope Expanded.');
      expansions++;
    } else {
      console.log('[Orchestrator] Execution completed with status:', result.status);
      break;
    }
  }

  if (result.status !== 'success') {
    console.log('\nProcess failed to answer the query:', result);
    return;
  }

  // 3. Claim Validator
  if (result.output?.claims && result.output.claims.length > 0) {
    console.log('\n[Claim Validator] Validating claims...');
    const validator = new ClaimValidator();
    const validation = await validator.validateClaims(result.output.claims, knowledgeScope);
    console.log(`Valid Claims: ${validation.validClaims.length}, Rejected: ${validation.rejectedClaims.length}`);
    result.output.claims = [...validation.validClaims, ...validation.rejectedClaims];
  } else {
    console.log('\n[Claim Validator] No factual claims generated to validate.');
  }

  // 4. Response Evaluator
  if (result.output?.candidate_answers && result.output.candidate_answers.length > 0) {
    console.log('\n[Response Evaluator] Evaluating Candidate Answers...');
    const evaluator = new ResponseEvaluator();
    const evaluatedAnswers = await evaluator.evaluateAnswers(
      query,
      result.output.candidate_answers,
      knowledgeScope,
      userContext
    );
    
    console.log('\n=== FINAL CANDIDATE ANSWERS ===');
    for (const ans of evaluatedAnswers) {
      console.log(`\nPerspective: ${ans.answer.perspective.toUpperCase()}`);
      console.log(`Content: ${ans.answer.content}`);
      console.log(`Metrics (Score): QueryFit(${ans.metrics.query_fit}), Completeness(${ans.metrics.completeness})`);
      console.log(`Explanation: ${ans.metrics.explanation}`);
    }
  }

  console.log('\n=== TEST COMPLETE ===');
}

runVerticalSlice().catch(console.error);
