import { getServiceRoleClient } from '../lib/supabase';

async function run() {
  const supabase = getServiceRoleClient();
  const sql = `
    CREATE OR REPLACE FUNCTION get_entities_in_bbox(
        min_lon FLOAT,
        min_lat FLOAT,
        max_lon FLOAT,
        max_lat FLOAT
    )
    RETURNS TABLE (
        id VARCHAR,
        type VARCHAR,
        name VARCHAR,
        metadata JSONB,
        geojson JSON
    ) 
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            e.id, 
            e.type, 
            e.name, 
            e.metadata, 
            ST_AsGeoJSON(e.geom)::json AS geojson
        FROM entities e
        WHERE e.geom IS NOT NULL
          AND ST_Intersects(e.geom, ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326))
        ORDER BY e.created_at DESC;
    END;
    $$;
  `;
  
  // Actually, wait, supabase-js v2 doesn't have a direct raw SQL execution unless you use an RPC that executes SQL, 
  // which is typically not exposed by default for security. 
  console.log("We need to run this SQL in Supabase SQL Editor manually or via migrations.");
}

run();
