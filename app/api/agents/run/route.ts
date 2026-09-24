import { NextResponse } from 'next/server';
import { ParcelAgent } from '@/lib/agents/parcel_agent';
import { IngestionAgent } from '@/lib/agents/ingestion_agent';
import { OrchestratorAgent } from '@/lib/agents/orchestrator_agent';
import { getServiceRoleClient } from '@/lib/supabase';

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

    let runId = 'mock-run-' + Date.now();
    if (runError || !run) {
      console.error('Failed to create agent run (table might not exist in La Plata DB). Using fallback mock ID.', runError);
    } else {
      runId = run.id;
    }

    // Note: For a true serverless environment with long execution, 
    // we would trigger this via a queue or Edge function. 
    // Here we run it synchronously for the prototype.
    const result = await agent.execute({
      runId: runId,
      objective: objective || 'Analyze parcel',
      input: input
    });

    // Update run in DB if we have a real run ID
    if (!runId.startsWith('mock-run')) {
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
