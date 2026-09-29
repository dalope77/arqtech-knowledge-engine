-- Migration: 05_add_chat_memory.sql
-- Description: Adds tables for conversational memory (threads and messages)

CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR DEFAULT 'Nueva Conversación',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    agent_id VARCHAR REFERENCES agents(id) ON DELETE SET NULL, -- Which agent generated this message (if applicable)
    metadata JSONB, -- For storing tool calls, intermediate states, or WFS data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (since there is no auth yet, we keep it open for the prototype)
CREATE POLICY "Allow public all threads" ON threads FOR ALL USING (true);
CREATE POLICY "Allow public all messages" ON messages FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
