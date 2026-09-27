import { Entity, Relation, Observation, Event, AgentRun, RealWorldEvent } from '@/types';
import { getServiceRoleClient } from './supabase';

export const db = {
  // Entities
  getEntities: async (): Promise<Entity[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('entities').select('*');
    if (error) console.error('getEntities error:', error);
    return data || [];
  },
  getEntity: async (id: string): Promise<Entity | undefined> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('entities').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') console.error('getEntity error:', error);
    return data || undefined;
  },
  createEntity: async (entity: Omit<Entity, 'created_at' | 'updated_at'>): Promise<Entity> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('entities').insert([entity]).select().single();
    if (error) throw new Error(`createEntity failed: ${error.message}`);
    return data;
  },

  // Relations
  getRelations: async (): Promise<Relation[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('relations').select('*');
    if (error) console.error('getRelations error:', error);
    return data || [];
  },
  getRelationsForEntity: async (entityId: string): Promise<Relation[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('relations').select('*')
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
    if (error) console.error('getRelationsForEntity error:', error);
    return data || [];
  },
  createRelation: async (relation: Omit<Relation, 'created_at'>): Promise<Relation> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('relations').insert([relation]).select().single();
    if (error) throw new Error(`createRelation failed: ${error.message}`);
    return data;
  },

  // Observations
  getObservations: async (): Promise<Observation[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('observations').select('*');
    if (error) console.error('getObservations error:', error);
    return data || [];
  },
  getObservationsForEntity: async (entityId: string): Promise<Observation[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('observations').select('*')
      .or(`subject_entity_id.eq.${entityId},object_entity_id.eq.${entityId}`);
    if (error) console.error('getObservationsForEntity error:', error);
    return data || [];
  },
  createObservation: async (observation: Omit<Observation, 'created_at' | 'observed_at' | 'status'>): Promise<Observation> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('observations').insert([observation]).select().single();
    if (error) throw new Error(`createObservation failed: ${error.message}`);
    return data;
  },

  // Events
  getEvents: async (): Promise<Event[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('events').select('*');
    if (error) console.error('getEvents error:', error);
    return data || [];
  },
  createEvent: async (event: Omit<Event, 'created_at'>): Promise<Event> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('events').insert([event]).select().single();
    if (error) throw new Error(`createEvent failed: ${error.message}`);
    return data;
  },

  // Agent Runs
  getAgentRuns: async (): Promise<AgentRun[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('agent_runs').select('*');
    if (error) console.error('getAgentRuns error:', error);
    return data || [];
  },
  createAgentRun: async (run: Omit<AgentRun, 'started_at'>): Promise<AgentRun> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('agent_runs').insert([run]).select().single();
    if (error) throw new Error(`createAgentRun failed: ${error.message}`);
    return data;
  },
  updateAgentRun: async (id: string, updates: Partial<AgentRun>): Promise<AgentRun | undefined> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('agent_runs').update(updates).eq('id', id).select().single();
    if (error) console.error('updateAgentRun error:', error);
    return data || undefined;
  },
  
  // Real World Events
  getRealWorldEvents: async (): Promise<RealWorldEvent[]> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('real_world_events').select('*');
    if (error) console.error('getRealWorldEvents error:', error);
    return data || [];
  },
  
  recordRealWorldEvent: async (event: RealWorldEvent): Promise<RealWorldEvent> => {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('real_world_events').insert([event]).select().single();
    if (error) throw new Error(`recordRealWorldEvent failed: ${error.message}`);
    return data;
  }
};
