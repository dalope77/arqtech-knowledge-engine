-- Drop existing tables if re-running
DROP TABLE IF EXISTS hypotheses CASCADE;
DROP TABLE IF EXISTS agent_runs CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS real_world_events CASCADE;
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS relations CASCADE;
DROP TABLE IF EXISTS entities CASCADE;

-- ENTITIES
CREATE TABLE entities (
    id VARCHAR PRIMARY KEY, -- Using VARCHAR to support mock data IDs like 'PARCELA_001'
    type VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    external_id VARCHAR,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONS
CREATE TABLE relations (
    id VARCHAR PRIMARY KEY,
    from_entity_id VARCHAR REFERENCES entities(id),
    relation_type VARCHAR NOT NULL,
    to_entity_id VARCHAR REFERENCES entities(id),
    source_observation_id VARCHAR,
    confidence FLOAT DEFAULT 1.0,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OBSERVATIONS
CREATE TABLE observations (
    id VARCHAR PRIMARY KEY,
    subject_entity_id VARCHAR REFERENCES entities(id),
    predicate VARCHAR NOT NULL,
    object_entity_id VARCHAR REFERENCES entities(id),
    value TEXT,
    source VARCHAR,
    source_document VARCHAR,
    source_location VARCHAR,
    evidence TEXT,
    observed_at TIMESTAMPTZ DEFAULT NOW(),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    agent_id VARCHAR,
    confidence FLOAT DEFAULT 1.0,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS (System Events)
CREATE TABLE events (
    id VARCHAR PRIMARY KEY,
    actor_id VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL,
    entity_id VARCHAR REFERENCES entities(id),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REAL WORLD EVENTS (Phase 9)
CREATE TABLE real_world_events (
    id VARCHAR PRIMARY KEY,
    entity_id VARCHAR REFERENCES entities(id),
    event_type VARCHAR NOT NULL, -- 'DECISION', 'OUTCOME', 'TRANSACTION', 'REGULATORY_ACTION', 'OTHER'
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    source VARCHAR NOT NULL
);

-- AGENT RUNS
CREATE TABLE agent_runs (
    id VARCHAR PRIMARY KEY,
    agent_id VARCHAR NOT NULL,
    objective TEXT NOT NULL,
    status VARCHAR NOT NULL,
    model VARCHAR,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    input JSONB,
    output JSONB,
    error TEXT
);

-- HYPOTHESES
CREATE TABLE hypotheses (
    id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'candidate',
    confidence FLOAT DEFAULT 0.0,
    created_by VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ
);

-- ==========================================
-- SEED DATA (MOCK DATA)
-- ==========================================

INSERT INTO entities (id, type, name, metadata) VALUES
('PARCELA_001', 'PARCELA', 'Parcela 001 - Centro', '{"area": 300, "frontage": 10}'),
('ZONA_R3', 'ZONA', 'Zona Residencial 3', '{"fot": 1.5, "fos": 0.6}'),
('LOCALIDAD_LP', 'LOCALIDAD', 'La Plata', '{}'),
('NORMA_001', 'NORMA', 'Ordenanza 1234/20', '{"source": "Municipalidad"}'),
('PRODUCTO_001', 'PRODUCTO', 'Edificio Residencial 4 Pisos', '{"units": 8, "sellable_area": 400}'),
('COSTO_001', 'COSTO', 'Costo Construcción Base', '{"value_per_sqm": 800, "currency": "USD"}');

INSERT INTO relations (id, from_entity_id, relation_type, to_entity_id, confidence) VALUES
('REL_1', 'PARCELA_001', 'pertenece_a', 'ZONA_R3', 1.0),
('REL_2', 'ZONA_R3', 'regulada_por', 'NORMA_001', 1.0),
('REL_3', 'ZONA_R3', 'pertenece_a', 'LOCALIDAD_LP', 1.0);

INSERT INTO observations (id, subject_entity_id, predicate, value, source, agent_id, confidence, status) VALUES
('OBS_1', 'ZONA_R3', 'altura_maxima', '12m', 'Ordenanza 1234/20', 'municipal_normative_agent', 0.94, 'active');

INSERT INTO real_world_events (id, entity_id, event_type, description, source) VALUES
('RWE_1', 'PARCELA_001', 'DECISION', 'El usuario decidió analizar factibilidad para edificio.', 'SYSTEM'),
('RWE_2', 'PARCELA_001', 'REGULATORY_ACTION', 'Se clausuró obra lindera por falta de permiso.', 'MUNICIPALIDAD');
