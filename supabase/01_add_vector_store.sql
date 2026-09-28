-- ==========================================
-- PHASE 2: VECTOR & DOCUMENT STORE
-- ==========================================

-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- DOCUMENTS
-- Stores the metadata of a long-form document (PDF, HTML, Doc)
CREATE TABLE documents (
    id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    source_url VARCHAR,
    document_type VARCHAR, -- 'PDF_NORMA', 'EXPEDIENTE', 'INFORME', 'MANUAL'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCUMENT CHUNKS
-- Stores the actual text chunks of the documents with their embeddings
CREATE TABLE document_chunks (
    id VARCHAR PRIMARY KEY,
    document_id VARCHAR REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- Assuming OpenAI text-embedding-3-small or ada-002
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEX for fast similarity search using HNSW
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- CREATE A POSTGRES FUNCTION FOR VECTOR SEARCH
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id varchar,
    document_id varchar,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
