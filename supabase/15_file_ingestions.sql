-- 15_file_ingestions.sql
-- Tabla para registrar archivos ingresados al sistema y sus hashes

CREATE TABLE IF NOT EXISTS file_ingestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,
    file_hash VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'PENDING',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(filename, file_hash)
);

-- Habilitar RLS
ALTER TABLE file_ingestions ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "file_ingestions_select" ON file_ingestions FOR SELECT USING (true);
CREATE POLICY "file_ingestions_insert" ON file_ingestions FOR INSERT WITH CHECK (true);
CREATE POLICY "file_ingestions_update" ON file_ingestions FOR UPDATE USING (true);
CREATE POLICY "file_ingestions_delete" ON file_ingestions FOR DELETE USING (true);
