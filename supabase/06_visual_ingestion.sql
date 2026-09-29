-- Phase 1: Visual Ingestion Data Models
-- Document Assets: Stores references to images (rasterized PDF pages, crops, etc.)
CREATE TABLE IF NOT EXISTS document_assets (
    id VARCHAR PRIMARY KEY,
    document_id VARCHAR REFERENCES documents(id) ON DELETE CASCADE,
    asset_type VARCHAR NOT NULL CHECK (asset_type IN ('page_image', 'extracted_region')),
    page_number INTEGER,
    storage_path VARCHAR NOT NULL,
    resolution_width INTEGER,
    resolution_height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visual Taxonomy: Dynamic categories for annotations (e.g., COTA, AMBIENTE, LEYENDA)
CREATE TABLE IF NOT EXISTS visual_taxonomy (
    id VARCHAR PRIMARY KEY,
    category VARCHAR NOT NULL CHECK (category IN ('PLANO', 'MAPA', 'PROCESO', 'TABLA', 'GENERAL')),
    label VARCHAR NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visual Annotations: Bounding boxes generated manually for Active Learning
CREATE TABLE IF NOT EXISTS visual_annotations (
    id VARCHAR PRIMARY KEY,
    asset_id VARCHAR REFERENCES document_assets(id) ON DELETE CASCADE,
    taxonomy_id VARCHAR REFERENCES visual_taxonomy(id) ON DELETE CASCADE,
    bbox_x NUMERIC NOT NULL,
    bbox_y NUMERIC NOT NULL,
    bbox_width NUMERIC NOT NULL,
    bbox_height NUMERIC NOT NULL,
    transcribed_value TEXT,
    created_by VARCHAR NOT NULL,
    used_in_training BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: 'observations' table already exists. To support visual evidence cleanly without
-- massive schema changes, we can store visual_evidence as a JSONB field or
-- simply rely on the 'evidence' JSONB field if we alter it.
-- Let's add a visual_evidence JSONB column to observations to strictly type it if needed,
-- or just assume the existing JSON/String field will hold the structure.
ALTER TABLE observations ADD COLUMN IF NOT EXISTS visual_evidence JSONB;
