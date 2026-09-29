-- 12_get_wkt.sql
CREATE OR REPLACE FUNCTION get_entity_wkt(p_id VARCHAR)
RETURNS TEXT 
LANGUAGE plpgsql
AS $$
DECLARE 
  v_wkt TEXT;
BEGIN
  SELECT ST_AsText(geom) INTO v_wkt FROM entities WHERE id = p_id;
  RETURN v_wkt;
END;
$$;
