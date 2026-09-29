import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { agent_id } = await req.json();

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    // In a real scenario, this would trigger an LLM run, which reads the graph
    // and produces changes. Here we simulate the agent finding a missing relation.

    const proposal = {
      id: `PROP_${Date.now()}`,
      agent_id,
      change_type: 'ADD_RELATION',
      payload: {
        from_entity_id: 'PRODUCTO_001',
        relation_type: 'permitido_en',
        to_entity_id: 'ZONA_R3',
        confidence: 0.85
      },
      reason: 'Basado en la Ordenanza 1234/20 que regula ZONA_R3, el producto Edificio Residencial 4 Pisos (PRODUCTO_001) es factible y está permitido.',
      status: 'pending'
    };

    const { error } = await supabase.from('proposed_changes').insert(proposal);

    if (error) {
      console.error('Error inserting proposal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
