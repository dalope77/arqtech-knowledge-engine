import { Entity, Relation, Observation, Event, AgentRun } from '@/types';

export const mockEntities: Entity[] = [
  {
    id: 'PARCELA_001',
    type: 'PARCELA',
    name: 'Parcela 001 - Centro',
    metadata: { area: 300, frontage: 10 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ZONA_R3',
    type: 'ZONA',
    name: 'Zona Residencial 3',
    metadata: { fot: 1.5, fos: 0.6 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'LOCALIDAD_LP',
    type: 'LOCALIDAD',
    name: 'La Plata',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'NORMA_001',
    type: 'NORMA',
    name: 'Ordenanza 1234/20',
    metadata: { source: 'Municipalidad' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'PRODUCTO_001',
    type: 'PRODUCTO',
    name: 'Edificio Residencial 4 Pisos',
    metadata: { units: 8, sellable_area: 400 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'COSTO_001',
    type: 'COSTO',
    name: 'Costo Construcción Base',
    metadata: { value_per_sqm: 800, currency: 'USD' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const mockRelations: Relation[] = [
  {
    id: 'REL_1',
    from_entity_id: 'PARCELA_001',
    relation_type: 'pertenece_a',
    to_entity_id: 'ZONA_R3',
    confidence: 1.0,
    metadata: {},
    created_at: new Date().toISOString(),
  },
  {
    id: 'REL_2',
    from_entity_id: 'ZONA_R3',
    relation_type: 'regulada_por',
    to_entity_id: 'NORMA_001',
    confidence: 1.0,
    metadata: {},
    created_at: new Date().toISOString(),
  },
  {
    id: 'REL_3',
    from_entity_id: 'ZONA_R3',
    relation_type: 'pertenece_a',
    to_entity_id: 'LOCALIDAD_LP',
    confidence: 1.0,
    metadata: {},
    created_at: new Date().toISOString(),
  }
];

export const mockObservations: Observation[] = [
  {
    id: 'OBS_1',
    subject_entity_id: 'ZONA_R3',
    predicate: 'altura_maxima',
    value: '12m',
    source: 'Ordenanza 1234/20',
    agent_id: 'municipal_normative_agent',
    confidence: 0.94,
    status: 'active',
    observed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
];

export const mockEvents: Event[] = [
  {
    id: 'EVT_1',
    actor_id: 'SYSTEM',
    event_type: 'system_initialized',
    payload: { message: 'Mock data loaded' },
    created_at: new Date().toISOString(),
  }
];

export const mockAgentRuns: AgentRun[] = [];
