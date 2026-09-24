import { Entity, Relation, Observation, Event, AgentRun } from '@/types';
import { mockEntities, mockRelations, mockObservations, mockEvents, mockAgentRuns } from './mockData';

// In-memory store for mock execution (until Supabase is connected)
let entities = [...mockEntities];
let relations = [...mockRelations];
let observations = [...mockObservations];
let events = [...mockEvents];
let agentRuns = [...mockAgentRuns];

export const db = {
  // Entities
  getEntities: async (): Promise<Entity[]> => [...entities],
  getEntity: async (id: string): Promise<Entity | undefined> => entities.find(e => e.id === id),
  createEntity: async (entity: Omit<Entity, 'created_at' | 'updated_at'>): Promise<Entity> => {
    const newEntity: Entity = {
      ...entity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    entities.push(newEntity);
    return newEntity;
  },

  // Relations
  getRelations: async (): Promise<Relation[]> => [...relations],
  getRelationsForEntity: async (entityId: string): Promise<Relation[]> => 
    relations.filter(r => r.from_entity_id === entityId || r.to_entity_id === entityId),
  createRelation: async (relation: Omit<Relation, 'created_at'>): Promise<Relation> => {
    const newRelation: Relation = {
      ...relation,
      created_at: new Date().toISOString(),
    };
    relations.push(newRelation);
    return newRelation;
  },

  // Observations
  getObservations: async (): Promise<Observation[]> => [...observations],
  getObservationsForEntity: async (entityId: string): Promise<Observation[]> =>
    observations.filter(o => o.subject_entity_id === entityId || o.object_entity_id === entityId),
  createObservation: async (observation: Omit<Observation, 'created_at' | 'observed_at' | 'status'>): Promise<Observation> => {
    const newObservation: Observation = {
      ...observation,
      status: 'active',
      observed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    observations.push(newObservation);
    return newObservation;
  },

  // Events
  getEvents: async (): Promise<Event[]> => [...events],
  createEvent: async (event: Omit<Event, 'created_at'>): Promise<Event> => {
    const newEvent: Event = {
      ...event,
      created_at: new Date().toISOString(),
    };
    events.push(newEvent);
    return newEvent;
  },

  // Agent Runs
  getAgentRuns: async (): Promise<AgentRun[]> => [...agentRuns],
  createAgentRun: async (run: Omit<AgentRun, 'started_at'>): Promise<AgentRun> => {
    const newRun: AgentRun = {
      ...run,
      started_at: new Date().toISOString(),
    };
    agentRuns.push(newRun);
    return newRun;
  },
  updateAgentRun: async (id: string, updates: Partial<AgentRun>): Promise<AgentRun | undefined> => {
    const index = agentRuns.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    agentRuns[index] = { ...agentRuns[index], ...updates };
    return agentRuns[index];
  }
};
