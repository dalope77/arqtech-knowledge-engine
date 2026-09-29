CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    system_prompt TEXT,
    context TEXT,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposed_changes (
    id VARCHAR PRIMARY KEY,
    agent_id VARCHAR REFERENCES agents(id),
    change_type VARCHAR NOT NULL, -- 'ADD_ENTITY', 'ADD_RELATION', 'ADD_OBSERVATION'
    payload JSONB NOT NULL, -- The data for the proposed change
    reason TEXT,
    status VARCHAR DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by VARCHAR,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed an example agent
INSERT INTO agents (id, name, description, system_prompt, context) VALUES
('graph_explorer_agent', 'Explorador de Grafo', 'Busca relaciones implícitas entre entidades en el mapa.', 'Eres un agente experto en urbanismo. Tu tarea es encontrar relaciones faltantes o deducciones lógicas entre entidades (parcelas, normativas, etc).', 'El modelo del dominio incluye PARCELA, ZONA, NORMA.')
ON CONFLICT (id) DO NOTHING;
