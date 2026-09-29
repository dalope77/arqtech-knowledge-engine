-- 10_seed_barrios.sql
-- Inserción de Barrios y Parcelas con coordenadas (lat/lon en metadata) 
-- y geometrías en PostGIS para que se vean en el mapa.

INSERT INTO entities (id, type, name, metadata, geom) VALUES
(
    'BARRIO_CENTRO', 
    'BARRIO', 
    'Centro La Plata', 
    '{"lat": -34.9205, "lon": -57.9536, "precio": 1200}'::jsonb,
    ST_SetSRID(ST_MakePoint(-57.9536, -34.9205), 4326)
),
(
    'BARRIO_SUR', 
    'BARRIO', 
    'Zona Expansión Sur', 
    '{"lat": -34.9250, "lon": -57.9450, "precio": 450}'::jsonb,
    ST_SetSRID(ST_MakePoint(-57.9450, -34.9250), 4326)
),
(
    'PARCELA_AFECTADA_1', 
    'PARCELA', 
    'Parcela Loteo Nuevo', 
    '{"lat": -34.9250, "lon": -57.9410}'::jsonb,
    ST_SetSRID(ST_MakePoint(-57.9410, -34.9250), 4326)
)
ON CONFLICT (id) DO UPDATE SET 
    metadata = EXCLUDED.metadata,
    geom = EXCLUDED.geom;
