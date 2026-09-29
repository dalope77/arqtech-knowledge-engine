-- 07_satellite_gis.sql
-- Habilitar extensión PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Agregar columna espacial a la tabla entities
-- Usamos Geometry genérico en proyección WGS84 (SRID 4326)
ALTER TABLE entities ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326);

-- Crear un índice espacial para acelerar las consultas de intersección
CREATE INDEX IF NOT EXISTS entities_geom_idx ON entities USING GIST (geom);

-- Crear una tabla específica para las imágenes satelitales (Catálogo)
CREATE TABLE IF NOT EXISTS satellite_catalog (
    id VARCHAR PRIMARY KEY,
    source VARCHAR NOT NULL, -- Ej: 'Sentinel-2', 'Landsat-8'
    acquisition_date TIMESTAMPTZ NOT NULL,
    cloud_cover FLOAT,
    resolution_m FLOAT,
    geom geometry(Polygon, 4326) NOT NULL, -- El footprint de la imagen
    storage_path VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS satellite_catalog_geom_idx ON satellite_catalog USING GIST (geom);
