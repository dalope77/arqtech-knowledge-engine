-- 11_kml_ingestion.sql
-- RPC para ingestar geometrías desde cadenas KML

CREATE OR REPLACE FUNCTION insert_kml_entity(
  p_id VARCHAR,
  p_type VARCHAR,
  p_name VARCHAR,
  p_metadata JSONB,
  p_kml_geom TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO entities (id, type, name, metadata, geom)
  VALUES (
      p_id, 
      p_type, 
      p_name, 
      p_metadata, 
      ST_SetSRID(ST_Force2D(ST_GeomFromKML(p_kml_geom)), 4326)
  )
  ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name,
      geom = EXCLUDED.geom, 
      metadata = EXCLUDED.metadata;
END;
$$ LANGUAGE plpgsql;
