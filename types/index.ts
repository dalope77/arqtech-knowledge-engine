export type EntityType = 
  | 'PARCELA' 
  | 'ZONA' 
  | 'LOCALIDAD' 
  | 'MUNICIPIO' 
  | 'NORMA' 
  | 'NORMA_ARTICULO'
  | 'ZONIFICACION'
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
  | 'RESULTADO'
  | 'URBAN_FOOTPRINT'
  | 'URBAN_GROWTH_AREA';

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

export interface DocumentAsset {
  id: string;
  document_id: string;
  asset_type: 'page_image' | 'extracted_region';
  page_number: number;
  storage_path: string;
  resolution: { width: number; height: number };
}

export interface VisualEvidence {
  asset_id: string;
  bbox: [number, number, number, number];
  extraction_method: 'YOLO_v8' | 'docTR' | 'OCR_Tesseract' | 'VLM_GPT4o' | 'Table_Transformer' | string;
  confidence_metrics: {
    detection: number;
    ocr?: number;
    semantic_interpretation?: number;
  };
}

export interface VisualTaxonomy {
  id: string;
  category: 'PLANO' | 'MAPA' | 'PROCESO' | 'TABLA' | 'GENERAL';
  label: string;
  description?: string;
}

export interface VisualAnnotation {
  id: string;
  asset_id: string;
  taxonomy_id: string;
  bbox: [number, number, number, number];
  value?: string;
  created_by: string;
  created_at: string;
  used_in_training: boolean;
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
  visual_evidence?: VisualEvidence;
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

export interface UserContext {
  id: string;
  role: string;
  objective: string;
  process_stage: string;
  experience_level: 'beginner' | 'intermediate' | 'expert';
  known_information: string[];
  preferences: {
    depth: 'summary' | 'detailed';
    technical_jargon: boolean;
  };
  previous_decisions: string[];
}

export interface RealWorldEvent {
  id: string;
  entity_id: string;
  event_type: 'DECISION' | 'OUTCOME' | 'TRANSACTION' | 'REGULATORY_ACTION' | 'OTHER';
  description: string;
  timestamp: string;
  metadata: Record<string, any>;
  source: string;
}

export interface Conflict {
  id: string;
  description: string;
  evidence_ids: string[];
  resolved: boolean;
  resolution?: string;
  evaluation?: {
    latest_timestamp_id: string;
    highest_hierarchy_id: string;
  };
}

export interface Document {
  id: string;
  title: string;
  source_url?: string;
  document_type?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  created_at?: string;
}

export interface KnowledgeScope {
  query: string;
  userContext?: UserContext;
  entityIds: string[];
  relationIds: string[];
  observationIds: string[];
  documentIds?: string[];
  eventIds?: string[];
  vectorResults?: any[];
  conflicts?: Conflict[];
  allowedAgentIds?: string[];
  maxDepth: number;
  missingInformation: string[];
  expansionRequests: any[];
  artifactIds?: string[];
  evidenceIds?: string[];
}

export interface Claim {
  id: string;
  claim: string;
  evidence_ids: string[];
  confidence: number;
  status: 'pending' | 'validated' | 'rejected';
}

export interface CandidateAnswer {
  id: string;
  perspective: 'normativa' | 'economica' | 'desarrollador' | 'consumidor' | 'resumen' | 'riesgo' | 'general';
  content: string;
  claims?: Claim[];
}

export interface StructuredAgentOutput {
  observations?: Partial<Observation>[];
  relations?: Partial<Relation>[];
  evidence?: any[];
  claims?: Claim[];
  missing_information?: string[];
  conflicts?: Conflict[];
  hypotheses?: Partial<Hypothesis>[];
  next_tasks?: any[];
  answer?: string;
  candidate_answers?: CandidateAnswer[];
}
