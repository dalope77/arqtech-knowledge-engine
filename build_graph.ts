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

  const graphData = { nodes, links };
  fs.writeFileSync(path.join(process.cwd(), 'public', 'graph_data.json'), JSON.stringify(graphData, null, 2));
  
  console.log(`Successfully generated graph with ${nodes.length} nodes and ${links.length} links.`);
}

buildGraph();
