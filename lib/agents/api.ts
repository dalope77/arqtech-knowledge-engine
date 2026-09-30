import { supabase } from '../supabase';

export interface Agent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  context: string;
  mcp_config?: any;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProposedChange {
  id: string;
  agent_id: string;
  change_type: 'ADD_ENTITY' | 'ADD_RELATION' | 'ADD_OBSERVATION';
  payload: any;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
}

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase.from('agents').select('*').order('name');
  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
  return data || [];
}

export async function getAgent(id: string): Promise<Agent | null> {
  const { data, error } = await supabase.from('agents').select('*').eq('id', id).single();
  if (error) {
    console.error('Error fetching agent:', error);
    return null;
  }
  return data;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<boolean> {
  const { error } = await supabase.from('agents').upsert({ id, ...updates });
  if (error) {
    console.error('Error updating/upserting agent:', error);
    return false;
  }
  return true;
}

export async function getPendingProposals(): Promise<ProposedChange[]> {
  const { data, error } = await supabase
    .from('proposed_changes')
    .select('*, agents(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
  return data || [];
}

export async function reviewProposal(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
  const { error } = await supabase
    .from('proposed_changes')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) {
    console.error('Error reviewing proposal:', error);
    return false;
  }

  if (status === 'approved') {
    // Ideally we apply the change to the entities/relations tables here.
    // This could be done by calling an API route that processes the approved change.
    // For now we just mark it as approved.
  }
  return true;
}
