import { db } from '../lib/db';
import { getServiceRoleClient } from '../lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function ingestSpatialData() {
  console.log('Ingesting ALL Spatial Data...');
  const supabase = getServiceRoleClient();
  
  // 1. Ingest KML
  const { XMLParser } = require('fast-xml-parser');
  const kmlPath = path.join(process.cwd(), 'docs', 'barrios.kml');
  if (fs.existsSync(kmlPath)) {
    console.log('Reading KML...');
    const kmlData = fs.readFileSync(kmlPath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(kmlData);
    
    let document = result?.kml?.Document;
    let placemarks: any[] = [];
    if (document) {
      if (document.Folder) {
        const folders = Array.isArray(document.Folder) ? document.Folder : [document.Folder];
        folders.forEach((f: any) => {
          if (f.Placemark) {
            placemarks = placemarks.concat(Array.isArray(f.Placemark) ? f.Placemark : [f.Placemark]);
          }
        });
      } else if (document.Placemark) {
        placemarks = Array.isArray(document.Placemark) ? document.Placemark : [document.Placemark];
      }
    }

    console.log(`Found ${placemarks.length} placemarks. Preparing bulk ingestion...`);
    
    const kmlNodeId = 'DATASET_BARRIOS_KML';
    await supabase.from('entities').upsert([{
      id: kmlNodeId,
      type: 'DATASET',
      name: 'Dataset Barrios KML',
      metadata: { source: 'docs/barrios.kml' }
    }], { onConflict: 'id' });

    let entityBatch = [];
    let relationBatch = [];
    
    for (const p of placemarks) {
      const pId = p['@_id'] || ('BARRIO_' + Math.random().toString(36).substr(2, 9));
      let lat = undefined;
      let lon = undefined;
      if (p.LookAt) {
        lat = p.LookAt.latitude;
        lon = p.LookAt.longitude;
      } else if (p.Point && p.Point.coordinates) {
        const coords = p.Point.coordinates.split(',');
        if (coords.length >= 2) {
          lon = parseFloat(coords[0]);
          lat = parseFloat(coords[1]);
        }
      }
      
      entityBatch.push({
        id: pId,
        type: 'BARRIO',
        name: p.name || 'Barrio',
        metadata: { lat, lon, source: 'KML' }
      });
      
      relationBatch.push({
        id: `REL_KML_${pId}`,
        from_entity_id: kmlNodeId,
        relation_type: 'contiene_barrio',
        to_entity_id: pId,
        metadata: {},
        confidence: 1.0,
      });

      if (entityBatch.length >= 1000) {
        console.log(`Inserting batch of ${entityBatch.length} KML entities...`);
        await supabase.from('entities').upsert(entityBatch, { onConflict: 'id' });
        await supabase.from('relations').upsert(relationBatch, { onConflict: 'id' });
        entityBatch = [];
        relationBatch = [];
      }
    }
    
    if (entityBatch.length > 0) {
      console.log(`Inserting final batch of ${entityBatch.length} KML entities...`);
      await supabase.from('entities').upsert(entityBatch, { onConflict: 'id' });
      await supabase.from('relations').upsert(relationBatch, { onConflict: 'id' });
    }
  }
  
  // 2. Ingest GPKG
  const Database = require('better-sqlite3');
  const gpkgPath = path.join(process.cwd(), 'docs', 'vmn_ci.gpkg');
  let totalGpkg = 0;
  if (fs.existsSync(gpkgPath)) {
    console.log('Reading GPKG...');
    const sqliteDb = new Database(gpkgPath);
    const contents = sqliteDb.prepare("SELECT table_name FROM gpkg_contents").all();
    if (contents.length > 0) {
      const tableName = contents[0].table_name;
      // Fetching all without LIMIT
      const properties = sqliteDb.prepare(`SELECT id, titulo, valor_usd, lat, lon FROM ${tableName}`).all();
      totalGpkg = properties.length;
      console.log(`Found ${totalGpkg} properties. Preparing bulk ingestion...`);
      
      const gpkgNodeId = 'DATASET_VMN_CI';
      await supabase.from('entities').upsert([{
        id: gpkgNodeId,
        type: 'DATASET',
        name: 'Dataset VMN CI',
        metadata: { source: 'docs/vmn_ci.gpkg' }
      }], { onConflict: 'id' });

      let entityBatch = [];
      let relationBatch = [];

      for (const prop of properties) {
        const propId = 'VMN_' + prop.id;
        
        entityBatch.push({
          id: propId,
          type: 'INMUEBLE',
          name: prop.titulo || `Propiedad ${prop.id}`,
          metadata: { 
            precio: prop.valor_usd,
            lat: prop.lat,
            lon: prop.lon,
            source: 'GPKG'
          }
        });
        
        relationBatch.push({
          id: `REL_GPKG_${propId}`,
          from_entity_id: gpkgNodeId,
          relation_type: 'contiene_inmueble',
          to_entity_id: propId,
          metadata: {},
          confidence: 1.0,
        });

        if (entityBatch.length >= 1000) {
          console.log(`Inserting batch of ${entityBatch.length} GPKG entities...`);
          await supabase.from('entities').upsert(entityBatch, { onConflict: 'id' });
          await supabase.from('relations').upsert(relationBatch, { onConflict: 'id' });
          entityBatch = [];
          relationBatch = [];
        }
      }
      
      if (entityBatch.length > 0) {
        console.log(`Inserting final batch of ${entityBatch.length} GPKG entities...`);
        await supabase.from('entities').upsert(entityBatch, { onConflict: 'id' });
        await supabase.from('relations').upsert(relationBatch, { onConflict: 'id' });
      }

      // Asignar el dataset al MARKET_AGENT
      if (totalGpkg > 0) {
        console.log('Asignando tarea al MARKET_AGENT...');
        await db.createAgentRun({
          id: 'RUN_MARKET_' + Date.now(),
          agent_id: 'MARKET_AGENT',
          objective: `Procesar e inferir valoraciones de mercado y tendencias sobre las ${totalGpkg} propiedades (DATASET_VMN_CI).`,
          status: 'pending',
          input: { target_dataset: 'DATASET_VMN_CI', action: 'MARKET_VALUATION_ANALYSIS' }
        });
      }
    }
    sqliteDb.close();
  }

  console.log('✅ Spatial data ingestion complete and agents assigned!');
}

ingestSpatialData().catch(console.error);
