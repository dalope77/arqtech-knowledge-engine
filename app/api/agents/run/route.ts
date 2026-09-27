import { NextResponse } from 'next/server';
import { ParcelAgent } from '@/lib/agents/parcel_agent';
import { IngestionAgent } from '@/lib/agents/ingestion_agent';
import { OrchestratorAgent } from '@/lib/agents/orchestrator_agent';
import { getServiceRoleClient } from '@/lib/supabase';
import { ContextBuilder } from '@/lib/knowledge/context_builder';
import { ClaimValidator } from '@/lib/knowledge/claim_validator';
import { ResponseEvaluator } from '@/lib/knowledge/response_evaluator';

export async function POST(request: Request) {
  try {
    const { agentType, input, objective } = await request.json();

    let agent;
    if (agentType === 'PARCEL_AGENT') {
      agent = new ParcelAgent();
    } else if (agentType === 'INGESTION_AGENT') {
      agent = new IngestionAgent();
    } else if (agentType === 'ORCHESTRATOR_AGENT') {
      agent = new OrchestratorAgent();
    } else {
      return NextResponse.json({ error: 'Agent type not supported' }, { status: 400 });
    }
    
    // Create Agent Run in DB
    const client = getServiceRoleClient();
    const { data: run, error: runError } = await client
      .from('agent_runs')
      .insert({
        agent_id: agent.agentId,
        objective: objective || 'Analyze parcel',
        status: 'running',
        model: agent.model,
        input: input
      })
      .select()
      .single();

    let runId = run?.id || `run-${Date.now()}`;
    if (runError || !run) {
      console.error('Failed to create agent run.', runError);
    }

    let knowledgeScope = undefined;
    let contextBuilder = undefined;
    if (agentType === 'ORCHESTRATOR_AGENT' && input?.query) {
      contextBuilder = new ContextBuilder();
      knowledgeScope = await contextBuilder.buildInitialScope(input.query, input?.userContext);
    }

    const MAX_EXPANSIONS = 3;
    let expansions = 0;
    let result: any = null;

    while (expansions <= MAX_EXPANSIONS) {
      result = await agent.execute({
        runId: runId,
        objective: objective || 'Analyze parcel',
        input: input,
        knowledgeScope: knowledgeScope
      });

      if (
        result.status === 'insufficient_knowledge' && 
        result.output?.missing_information && 
        result.output.missing_information.length > 0 &&
        contextBuilder &&
        knowledgeScope
      ) {
        console.log(`[Expansion] Missing info detected: ${result.output.missing_information.join(', ')}. Expanding scope... (Expansion ${expansions + 1}/${MAX_EXPANSIONS})`);
        knowledgeScope = await contextBuilder.expandScope(knowledgeScope, result.output.missing_information);
        expansions++;
      } else {
        break; // Success, hard failure, or no more expansions needed
      }
    }

    // 5. Validate Claims if present
    if (result.output?.claims && result.output.claims.length > 0 && knowledgeScope) {
      const validator = new ClaimValidator();
      const validation = await validator.validateClaims(result.output.claims, knowledgeScope);
      
      // If too many claims are rejected, we could reject the entire response.
      // For now, we just pass the status back to the client.
      result.output.claims = [...validation.validClaims, ...validation.rejectedClaims];
      
      if (!validation.allValid) {
        console.warn(`Some claims were rejected by the ClaimValidator.`);
      }
    }

    // 6. Evaluate Candidate Answers if present
    let evaluatedAnswers = undefined;
    if (result.output?.candidate_answers && result.output.candidate_answers.length > 0 && knowledgeScope) {
      const evaluator = new ResponseEvaluator();
      evaluatedAnswers = await evaluator.evaluateAnswers(
        input?.query || objective,
        result.output.candidate_answers,
        knowledgeScope,
        input?.userContext
      );
      
      // Optionally attach it to the output
      (result.output as any).evaluated_candidate_answers = evaluatedAnswers;
    }

    // Update run in DB if we have a real run ID
    if (!runId.startsWith('run-')) {
      await client
        .from('agent_runs')
        .update({
          status: result.status,
          output: result.output || null,
          error: result.error || null,
          finished_at: new Date().toISOString()
        })
        .eq('id', runId);
    }

    return NextResponse.json({
      runId,
      output: result.output || result.error,
      result
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
