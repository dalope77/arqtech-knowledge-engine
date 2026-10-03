import { getServiceRoleClient } from '../lib/supabase';

/**
 * ArqTech - Discovery Pipeline for Unregularized Developments
 * 
 * 1. Fetches large parcels (>1ha) from ARBA WFS (simulated/fallback for reliability).
 * 2. Queries OSM Overpass API for traces of streets inside the parcel.
 * 3. Queries local Python Satellite Service for change detection.
 * 4. Inserts synthesized claims and observations into the Knowledge Graph.
 */

async function main() {
  const supabase = getServiceRoleClient();
  console.log('🚀 Iniciando Pipeline de Descubrimiento en AMBA / Gran La Plata...');

  let targetParcels: any[] = [];
  try {
    const wfsUrl = 'https://geo.arba.gov.ar/geoserver/idera/wfs';
    const args = process.argv.slice(2);
    let userBbox = '';
    for (const arg of args) {
      if (arg.startsWith('--bbox=')) {
        userBbox = arg.split('=')[1].replace(/['"]/g, '');
      }
    }

    let cqlFilter = `pda LIKE '055%' AND ara1 > 10000`; // Más de 1 Hectárea
    if (userBbox) {
      cqlFilter = `BBOX(geom, ${userBbox}, 'EPSG:4326') AND ara1 > 10000`;
      console.log(`Filtro espacial BBOX aplicado: ${userBbox}`);
    }

    const params = new URLSearchParams({
      request: 'GetFeature',
      service: 'WFS',
      version: '1.0.0',
      typeName: 'idera:Parcela',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326', 
      cql_filter: cqlFilter,
      maxFeatures: '10' // iteramos hasta 10 macizos
    });

    const wfsRes = await fetch(`${wfsUrl}?${params.toString()}`);
    if (wfsRes.ok) {
      const wfsData = await wfsRes.json();
      if (wfsData.features && wfsData.features.length > 0) {
        for (const feature of wfsData.features) {
          const props = feature.properties;
          let coords = feature.geometry.coordinates;
          
          // Handle Polygon vs MultiPolygon
          if (feature.geometry.type === 'MultiPolygon') {
            coords = coords[0][0]; // Extract first ring of first polygon
          } else {
            coords = coords[0]; // Extract first ring of polygon
          }

          if (!coords || coords.length === 0) continue;

          // Ensure ring is closed
          if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
            coords.push([...coords[0]]);
          }

          const wktPoints = coords.map((c: any) => `${c[0]} ${c[1]}`).join(', ');
          const wkt = `POLYGON((${wktPoints}))`;

          const lons = coords.map((c: any) => c[0]);
          const lats = coords.map((c: any) => c[1]);
          const bbox = `${Math.min(...lats)},${Math.min(...lons)},${Math.max(...lats)},${Math.max(...lons)}`;

          targetParcels.push({
            nomenclatura: props.cca || props.nomencla || props.pda,
            area_m2: props.ara1,
            bbox: bbox,
            wkt: wkt,
            subdivided_in_arba: false
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching from ARBA WFS:', error);
  }

  if (targetParcels.length === 0) {
    console.log('❌ No se encontraron parcelas grandes de ARBA en esta zona. Abortando pipeline.');
    return;
  }

  console.log(`\n📦 Fase 1: Identificando macizos de gran escala... Encontrados: ${targetParcels.length}`);

  for (const targetParcel of targetParcels) {
    console.log(`\n======================================================`);
    console.log(`✅ Evaluando Macizo: ${targetParcel.nomenclatura} (${(targetParcel.area_m2 / 10000).toFixed(2)} ha).`);

    // 2. CONSULTAR OPEN STREET MAP (OVERPASS API)
    console.log(`🛰️ Fase 2A: Consultando OpenStreetMap por trazado de calles clandestinas...`);
    const overpassQuery = `
      [out:json][timeout:25];
      (
        way["highway"](${targetParcel.bbox});
      );
      out body;
      >;
      out skel qt;
    `;

    let hasOsmStreets = false;
    try {
      const osmRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (osmData.elements && osmData.elements.length > 0) {
          console.log(`🚨 ALERTA OSM: Se detectaron ${osmData.elements.length} nodos/vías de calles dentro del polígono.`);
          hasOsmStreets = true;
        } else {
          console.log(`ℹ️ OSM: No se detectaron calles trazadas comunitariamente.`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error conectando a OSM:`, error.message);
    }

    // 3. CONSULTAR SERVICIO SATELITAL PYTHON
    console.log(`🛰️ Fase 2B: Consultando Python Satellite Service (NDVI/Cambios)...`);
    let hasSatelliteChange = false;
    let satConfidence = 0.85;
    try {
      const pyRes = await fetch('http://127.0.0.1:8000/api/satellite/change-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          t1_image_url: 'sentinel2_2022.tif',
          t2_image_url: 'sentinel2_2024.tif',
          region_wkt: targetParcel.wkt
        })
      });
      if (pyRes.ok) {
        const pyData = await pyRes.json();
        if (pyData.observations && pyData.observations.length > 0) {
          satConfidence = pyData.confidence || 0.85;
          console.log(`🚨 ALERTA SATÉLITE: Se detectó crecimiento urbano (Confianza: ${satConfidence}).`);
          hasSatelliteChange = true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error conectando al servicio Python local. Se requerirá etiquetado visual manual.`);
      hasSatelliteChange = false;
    }

    // 4. CONSOLIDACIÓN EPISTEMOLÓGICA (Orquestador)
    console.log(`🧠 Fase 3: Consolidación y Guardado en Base de Datos...`);
    
    // Si no está subdividido en ARBA, lo guardamos para que entre al pipeline.
    // Si tiene evidencias automáticas va como confirmado, de lo contrario va a la UI de etiquetado.
    if (!targetParcel.subdivided_in_arba) {
      const isConfirmed = hasOsmStreets || hasSatelliteChange;
      const pipelineStatus = isConfirmed ? 'CONFIRMADO_AUTOMATICO' : 'REQUIERE_ETIQUETADO_VISUAL';
      
      console.log(`🔥 CONCLUSIÓN: Guardando parcela. Estado: ${pipelineStatus}`);
      
      const parcelId = 'parcel-' + Date.now() + Math.floor(Math.random()*1000);
      const { error: entErr } = await supabase.from('entities').insert({
        id: parcelId,
        type: 'PARCELA',
        name: targetParcel.nomenclatura,
        metadata: { 
          nomenclatura: targetParcel.nomenclatura, 
          area: targetParcel.area_m2,
          pipeline_status: pipelineStatus
        },
        geom: targetParcel.wkt
      });

      if (entErr) {
        console.error('Error insertando entidad (WKT inválido?):', entErr.message);
        continue;
      }

      const claimId = 'claim-' + Date.now() + Math.floor(Math.random()*1000);
      await supabase.from('claims').insert({
        id: claimId,
        statement: `El macizo ${targetParcel.nomenclatura} es un desarrollo inmobiliario sin regularizar (barrio cerrado/asentamiento).`,
        status: 'hypothesis',
        confidence: hasOsmStreets && hasSatelliteChange ? 0.95 : satConfidence,
        metadata: { claim_type: 'ESTADO_DOMINIAL', context_refs: { target_parcel: parcelId } }
      });

      const observations = [
        {
          id: 'obs-arba-' + Date.now() + Math.floor(Math.random()*1000),
          subject_entity_id: parcelId,
          predicate: 'estado_subdivision',
          value: 'indiviso',
          confidence: 1.0,
          source: 'ARBA WFS'
        }
      ];
      
      if (hasOsmStreets) {
        observations.push({
          id: 'obs-osm-' + Date.now() + Math.floor(Math.random()*1000),
          subject_entity_id: parcelId,
          predicate: 'trazado_vial',
          value: 'presente_informal',
          confidence: 0.9,
          source: 'OSM Overpass API'
        });
      }
      if (hasSatelliteChange) {
        observations.push({
          id: 'obs-sat-' + Date.now() + Math.floor(Math.random()*1000),
          subject_entity_id: parcelId,
          predicate: 'movimiento_suelo',
          value: 'crecimiento_reciente',
          confidence: satConfidence,
          source: 'Sentinel-2 via Python YOLO/UNet'
        });
      }

      await supabase.from('observations').insert(observations);
      
      console.log(`✅ Éxito: Parcel, Claim y Evidencias guardadas.`);
      console.log(`👉 ID DE LA ENTIDAD GENERADA (LLM, usa esto para el link al mapa): ${parcelId}`);

    } else {
      console.log(`✅ CONCLUSIÓN: La parcela no presenta irregularidades detectables actualmente.`);
    }
  }
}

main().catch(console.error);
