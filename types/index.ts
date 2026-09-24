export type EntityType = 
  | 'PARCELA' 
  | 'ZONA' 
  | 'LOCALIDAD' 
  | 'MUNICIPIO' 
  | 'NORMA' 
  | 'ORGANISMO' 
  | 'OFICINA' 
  | 'INMUEBLE' 
  | 'OFERTA' 
  | 'PRODUCTO' 
  | 'PROYECTO' 
  | 'DESARROLLADOR' 
  | 'PROVEEDOR' 
  | 'COSTO' 
  | 'DEMANDA' 
  | 'OPORTUNIDAD' 
  | 'HIPOTESIS' 
  | 'RESULTADO';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  external_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Relation {
  id: string;
  from_entity_id: string;
  relation_type: string;
  to_entity_id: string;
  source_observation_id?: string;
  confidence: number;
  valid_from?: string;
  valid_to?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Observation {
  id: string;
  subject_entity_id: string;
  predicate: string;
  object_entity_id?: string;
  value?: string;
  source?: string;
  source_document?: string;
  source_location?: string;
  evidence?: string;
  observed_at: string;
  valid_from?: string;
  valid_to?: string;
  agent_id?: string;
  confidence: number;
  status: 'active' | 'superseded' | 'invalidated';
  created_at: string;
}

export interface Event {
  id: string;
  actor_id: string;
  event_type: string;
  entity_id?: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  objective: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  model?: string;
  started_at: string;
  finished_at?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

export interface Hypothesis {
  id: string;
  title: string;
  description?: string;
  status: 'candidate' | 'investigating' | 'supported' | 'rejected' | 'uncertain';
  confidence: number;
  created_by?: string;
  created_at: string;
  validated_at?: string;
}
