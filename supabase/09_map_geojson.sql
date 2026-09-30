-- 09_map_geojson.sql
-- Función RPC para obtener las entidades espaciales directamente en formato GeoJSON
-- Esto permite que React Leaflet pueda dibujarlas fácilmente sin tener que decodificar binarios.

CREATE OR REPLACE FUNCTION get_entities_geojson()
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
    ORDER BY e.created_at DESC
    LIMIT 2000;
END;
$$;
