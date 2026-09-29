-- 08_spatial_queries.sql
-- Función RPC para buscar entidades que intersectan con una geometría dada (WKT)
CREATE OR REPLACE FUNCTION get_intersecting_entities(
    target_type VARCHAR,
    target_wkt TEXT
) 
RETURNS TABLE (
    id VARCHAR,
    name VARCHAR
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.name
    FROM entities e
    WHERE e.type = target_type
    AND ST_Intersects(e.geom, ST_GeomFromText(target_wkt, 4326));
END;
$$;
