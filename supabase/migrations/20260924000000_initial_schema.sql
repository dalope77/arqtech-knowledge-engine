-- ENTITIES
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR NOT NULL, -- PARCELA, ZONA, NORMA, etc.
    name VARCHAR NOT NULL,
    external_id VARCHAR,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONS
CREATE TABLE relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id UUID REFERENCES entities(id),
    relation_type VARCHAR NOT NULL, -- pertenece_a, regulada_por
    to_entity_id UUID REFERENCES entities(id),
    source_observation_id UUID, -- Referencia opcional a la observación que generó esto
    confidence FLOAT DEFAULT 1.0,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OBSERVATIONS
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_entity_id UUID REFERENCES entities(id),
    predicate VARCHAR NOT NULL, -- altura_maxima, uso_permitido
    object_entity_id UUID REFERENCES entities(id), -- Opcional, si el valor es otra entidad
    value TEXT, -- Si es un valor escalar
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

-- EVENTS
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR NOT NULL, -- USER_001, PARCEL_AGENT
    event_type VARCHAR NOT NULL, -- consulted, created, discovered
    entity_id UUID REFERENCES entities(id),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT RUNS
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR NOT NULL,
    objective TEXT NOT NULL,
    status VARCHAR NOT NULL, -- pending, running, success, failed
    model VARCHAR,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    input JSONB,
    output JSONB,
    error TEXT
);

-- HYPOTHESES
CREATE TABLE hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'candidate', -- candidate, investigating, supported, rejected, uncertain
    confidence FLOAT DEFAULT 0.0,
    created_by VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ
);
