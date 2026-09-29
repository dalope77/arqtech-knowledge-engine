-- Add mcp_config column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS mcp_config JSONB;
