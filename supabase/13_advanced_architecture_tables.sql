-- 13_advanced_architecture_tables.sql
-- Fase 1 y 2: Preparación para Blackboard, Context References y Artifacts

-- 1. Modificar Agent Runs para soportar Blackboard y Context References
ALTER TABLE agent_runs 
ADD COLUMN blackboard JSONB DEFAULT '{}'::jsonb,
ADD COLUMN context_refs JSONB DEFAULT '{"entities": [], "artifacts": [], "evidence": []}'::jsonb;

-- 2. Crear tabla ARTIFACTS
CREATE TABLE artifacts (
    id VARCHAR PRIMARY KEY,
    run_id VARCHAR REFERENCES agent_runs(id) ON DELETE SET NULL,
    agent_id VARCHAR NOT NULL,
    type VARCHAR NOT NULL, -- Ej: 'LEGAL_ANALYSIS', 'SPATIAL_INTERSECTION', 'MARKET_ESTIMATE'
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla CLAIMS (Afirmaciones verificables)
CREATE TABLE claims (
    id VARCHAR PRIMARY KEY,
    artifact_id VARCHAR REFERENCES artifacts(id) ON DELETE CASCADE,
    statement TEXT NOT NULL,
    status VARCHAR DEFAULT 'CANDIDATE', -- 'CANDIDATE', 'VALIDATED', 'REJECTED'
    confidence FLOAT DEFAULT 0.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ
);

-- 4. Crear tabla EVIDENCE (Procedencia de los datos)
CREATE TABLE evidence (
    id VARCHAR PRIMARY KEY,
    claim_id VARCHAR REFERENCES claims(id) ON DELETE CASCADE,
    source_type VARCHAR NOT NULL, -- 'DOCUMENT', 'POSTGIS', 'OBSERVATION', 'API'
    source_ref VARCHAR NOT NULL, -- ID de la observación, polígono, documento, etc.
    provenance_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas de referencias
CREATE INDEX idx_artifacts_run_id ON artifacts(run_id);
CREATE INDEX idx_claims_artifact_id ON claims(artifact_id);
CREATE INDEX idx_evidence_claim_id ON evidence(claim_id);
