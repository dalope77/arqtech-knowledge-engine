import { Entity, Relation, Observation, Event, AgentRun, RealWorldEvent } from '@/types';
import { supabase } from './supabase';

export const db = {
  // Entities
  getEntities: async (): Promise<Entity[]> => {
    const { data } = await supabase.from('entities').select('*');
    return data || [];
  },
  getEntity: async (id: string): Promise<Entity | undefined> => {
    const { data } = await supabase.from('entities').select('*').eq('id', id).single();
    return data || undefined;
  },
  createEntity: async (entity: Omit<Entity, 'created_at' | 'updated_at'>): Promise<Entity> => {
    const { data } = await supabase.from('entities').insert([entity]).select().single();
    return data;
  },

  // Relations
  getRelations: async (): Promise<Relation[]> => {
    const { data } = await supabase.from('relations').select('*');
    return data || [];
  },
  getRelationsForEntity: async (entityId: string): Promise<Relation[]> => {
    const { data } = await supabase.from('relations').select('*')
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
    return data || [];
  },
  createRelation: async (relation: Omit<Relation, 'created_at'>): Promise<Relation> => {
    const { data } = await supabase.from('relations').insert([relation]).select().single();
    return data;
  },

  // Observations
  getObservations: async (): Promise<Observation[]> => {
    const { data } = await supabase.from('observations').select('*');
    return data || [];
  },
  getObservationsForEntity: async (entityId: string): Promise<Observation[]> => {
    const { data } = await supabase.from('observations').select('*')
      .or(`subject_entity_id.eq.${entityId},object_entity_id.eq.${entityId}`);
    return data || [];
  },
  createObservation: async (observation: Omit<Observation, 'created_at' | 'observed_at' | 'status'>): Promise<Observation> => {
    const { data } = await supabase.from('observations').insert([observation]).select().single();
    return data;
  },

  // Events
  getEvents: async (): Promise<Event[]> => {
    const { data } = await supabase.from('events').select('*');
    return data || [];
  },
  createEvent: async (event: Omit<Event, 'created_at'>): Promise<Event> => {
    const { data } = await supabase.from('events').insert([event]).select().single();
    return data;
  },

  // Agent Runs
  getAgentRuns: async (): Promise<AgentRun[]> => {
    const { data } = await supabase.from('agent_runs').select('*');
    return data || [];
  },
  createAgentRun: async (run: Omit<AgentRun, 'started_at'>): Promise<AgentRun> => {
    const { data } = await supabase.from('agent_runs').insert([run]).select().single();
    return data;
  },
  updateAgentRun: async (id: string, updates: Partial<AgentRun>): Promise<AgentRun | undefined> => {
    const { data } = await supabase.from('agent_runs').update(updates).eq('id', id).select().single();
    return data || undefined;
  },
  
  // Real World Events
  getRealWorldEvents: async (): Promise<RealWorldEvent[]> => {
    const { data } = await supabase.from('real_world_events').select('*');
    return data || [];
  },
  
  recordRealWorldEvent: async (event: RealWorldEvent): Promise<RealWorldEvent> => {
    const { data } = await supabase.from('real_world_events').insert([event]).select().single();
    return data;
  }
};
