-- Fix for Anon Client reading the tables (Dashboard)

-- 1. Ensure permissions are granted to the anonymous role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 2. If you enabled Row Level Security (RLS) from the UI, you need to add a read policy:
-- Run these JUST IN CASE RLS was accidentally enabled:

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read access to entities" ON entities;
CREATE POLICY "Allow anonymous read access to entities" ON entities FOR SELECT USING (true);

ALTER TABLE relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read access to relations" ON relations;
CREATE POLICY "Allow anonymous read access to relations" ON relations FOR SELECT USING (true);

ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read access to observations" ON observations;
CREATE POLICY "Allow anonymous read access to observations" ON observations FOR SELECT USING (true);
