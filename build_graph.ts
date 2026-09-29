import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const url = 'https://qrkntouvuyumvnnvkyau.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya250b3V2dXl1bXZubnZreWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzcxNzcsImV4cCI6MjA4MDExMzE3N30.RL2V06MVJ79Sdo6g8DkOnTLn-PAfu-XpTpgtgUhJgqM';

const client = createClient(url, key);

async function buildGraph() {
  console.log('Fetching development_edits...');
  const { data: edits, error: editsErr } = await client.from('development_edits').select('*');
  
  console.log('Fetching market_comparables...');
  const { data: comparables, error: compErr } = await client.from('market_comparables').select('*');

  if (editsErr) console.error(editsErr);
  if (compErr) console.error(compErr);

  const nodes: any[] = [];
  const links: any[] = [];

  // Group edits by development_id to get the latest state
  const devMap = new Map();
  if (edits) {
    for (const edit of edits) {
      if (edit.development_id && edit.data) {
        devMap.set(edit.development_id, edit.data);
      }
    }
  }

  // Create nodes for each development
  for (const [id, dev] of devMap.entries()) {
    nodes.push({
      id: id,
      name: dev.name || 'Desarrollo Desconocido',
      type: 'PROYECTO',
      val: 20
    });

    // Create a node for the zone/zoning if exists
    if (dev.technicalData?.indicators?.zoning) {
      const zoneId = 'ZONE_' + dev.technicalData.indicators.zoning;
      if (!nodes.find(n => n.id === zoneId)) {
        nodes.push({
          id: zoneId,
          name: 'Zona ' + dev.technicalData.indicators.zoning,
          type: 'ZONA',
          val: 15
        });
      }
      links.push({
        source: id,
        target: zoneId,
        type: 'se_ubica_en'
      });
    }

    // Connect parcels
    if (dev.technicalData?.parcels) {
      for (const parcel of dev.technicalData.parcels) {
        const parcelId = 'PARCEL_' + parcel;
        if (!nodes.find(n => n.id === parcelId)) {
          nodes.push({
            id: parcelId,
            name: 'Parcela ' + parcel.substring(0, 8) + '...',
            type: 'PARCELA',
            val: 10
          });
        }
        links.push({
          source: id,
          target: parcelId,
          type: 'incluye_parcela'
        });
      }
    }
  }

  // Add comparables
  if (comparables) {
    for (const comp of comparables) {
      nodes.push({
        id: comp.id,
        name: comp.address || 'Inmueble Comparable',
        type: 'INMUEBLE',
        val: 10
      });

      // Link to development if development_id is present
      if (comp.development_id && devMap.has(comp.development_id)) {
        links.push({
          source: comp.id,
          target: comp.development_id,
          type: 'comparable_de'
        });
      }
    }
  }

  // Add geopackage nodes
  try {
    const Database = require('better-sqlite3');
    const gpkgPath = path.join(process.cwd(), 'docs', 'vmn_ci.gpkg');
    if (fs.existsSync(gpkgPath)) {
      const db = new Database(gpkgPath);
      // Add a central node for the geopackage dataset
      const gpkgNodeId = 'DATASET_VMN_CI';
      nodes.push({
        id: gpkgNodeId,
        name: 'Dataset VMN CI',
        type: 'DATASET',
        val: 20
      });

      // Get table name (assuming vmn_2024_completo__vnm2104_pdo)
      const contents = db.prepare("SELECT table_name FROM gpkg_contents").all();
      if (contents.length > 0) {
        const tableName = contents[0].table_name;
        // Fetch a sample of properties so we don't overwhelm the graph, or fetch all.
        // Let's limit to 500 nodes to keep the frontend graph performant.
        const properties = db.prepare(`SELECT id, titulo, valor_usd, lat, lon FROM ${tableName} LIMIT 500`).all();
        
        console.log(`Found ${properties.length} properties in ${tableName}`);
        
        for (const prop of properties) {
          const propId = 'VMN_' + prop.id;
          nodes.push({
            id: propId,
            name: prop.titulo || `Propiedad ${prop.id}`,
            type: 'INMUEBLE',
            val: 8,
            lat: prop.lat,
            lon: prop.lon,
            precio: prop.valor_usd
          });

          // Link to dataset
          links.push({
            source: gpkgNodeId,
            target: propId,
            type: 'contiene_inmueble'
          });
        }
      }
      db.close();
    }
  } catch (err) {
    console.error('Error reading geopackage:', err);
  }

  // Add KML nodes
  try {
    const { XMLParser } = require('fast-xml-parser');
    const kmlPath = path.join(process.cwd(), 'docs', 'barrios.kml');
    if (fs.existsSync(kmlPath)) {
      const kmlData = fs.readFileSync(kmlPath, 'utf8');
      const parser = new XMLParser({ ignoreAttributes: false });
      const result = parser.parse(kmlData);
      
      let document = result?.kml?.Document;
      let placemarks = [];
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

      console.log(`Found ${placemarks.length} placemarks in KML`);

      // Add a central node for the KML dataset
      const kmlNodeId = 'DATASET_BARRIOS_KML';
      nodes.push({
        id: kmlNodeId,
        name: 'Dataset Barrios KML',
        type: 'DATASET',
        val: 20
      });

      // Fetch a sample or all. Limiting to 500 for performance
      const samplePlacemarks = placemarks.slice(0, 500);
      
      for (const p of samplePlacemarks) {
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
        
        nodes.push({
          id: pId,
          name: p.name || 'Barrio',
          type: 'BARRIO',
          val: 8,
          lat,
          lon
        });

        // Link to dataset
        links.push({
          source: kmlNodeId,
          target: pId,
          type: 'contiene_barrio'
        });
      }
    }
  } catch (err) {
    console.error('Error reading KML:', err);
  }

  const graphData = { nodes, links };
  fs.writeFileSync(path.join(process.cwd(), 'public', 'graph_data.json'), JSON.stringify(graphData, null, 2));
  
  console.log(`Successfully generated graph with ${nodes.length} nodes and ${links.length} links.`);
}

buildGraph();
