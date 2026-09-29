import { BaseAgent, AgentContext, AgentResult } from './index';

export class UrbanAgent extends BaseAgent {
  constructor() {
    super('URBAN_AGENT', process.env.LLM_MODEL || 'gpt-4');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { query, lat, lon, address } = context.input;

      let targetLat = lat;
      let targetLon = lon;

      // 1. Geocode if address provided but no coordinates
      if (address && (!targetLat || !targetLon)) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData && geoData.length > 0) {
              targetLat = parseFloat(geoData[0].lat);
              targetLon = parseFloat(geoData[0].lon);
            }
          }
        } catch (e) {
          console.error('Geocoding failed:', e);
        }
      }

      let wfsData = "";

      // 2. Query WFS if coordinates OR nomenclature are available
      let cqlFilter = '';
      let wkt = '';
      let currentSrid = '4326'; // Default to GPS coordinates

      if (targetLat && targetLon) {
        wkt = `POINT(${targetLon} ${targetLat})`;
        cqlFilter = `INTERSECTS(geom, SRID=4326;${wkt})`;
      } else {
        // Try to extract partido and partida from query
        const matchPartido = query.match(/partido\s*[=:]?\s*(\d+)/i);
        const matchPartida = query.match(/partida\s*[=:]?\s*(\d+)/i);
        if (matchPartido && matchPartida) {
           const pdo = matchPartido[1].padStart(3, '0');
           const par = matchPartida[1].padStart(6, '0');
           cqlFilter = `pda='${pdo}${par}'`;
        }
      }

      if (cqlFilter) {
        // Query ARBA
        try {
          const arbaRes = await fetch('https://geo.arba.gov.ar/geoserver/idera/wfs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              request: 'GetFeature', service: 'WFS', version: '1.0.0', typeName: 'idera:Parcela',
              outputFormat: 'application/json', srsName: 'EPSG:4326',
              cql_filter: cqlFilter
            })
          });
          if (arbaRes.ok) {
            const arbaJson = await arbaRes.json();
            if (arbaJson.features && arbaJson.features.length > 0) {
              const feat = arbaJson.features[0];
              wfsData += `\nDatos Catastrales (ARBA):\n- Nomenclatura: ${feat.properties.cca || 'N/A'}\n- Área (m2): ${feat.properties.ara1 || 'N/A'}`;
              
              // If we didn't have coordinates, let's try to get them from the geometry to query UrbaSIG next
              if (!targetLat && !targetLon && feat.geometry && feat.geometry.coordinates) {
                 try {
                   let coords = feat.geometry.coordinates;
                   while(Array.isArray(coords[0])) { coords = coords[0]; }
                   targetLon = coords[0];
                   targetLat = coords[1];
                   // If coordinates are clearly not lat/lon (e.g. 5000000), it's EPSG:5347
                   if (Math.abs(targetLon) > 180) {
                     currentSrid = '5347';
                   }
                   wkt = `POINT(${targetLon} ${targetLat})`;
                 } catch(e) {}
              }
            }
          }
        } catch (e) { console.error('ARBA WFS Error:', e); }

        // Query UrbaSIG if we have WKT (from coordinates or extracted from ARBA)
        if (wkt) {
          try {
            const urbaRes = await fetch('https://urbasig.mgob.gba.gob.ar/geoserver/urbasig/wfs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                request: 'GetFeature', service: 'WFS', version: '1.0.0', typeName: 'urbasig:_zonificacion',
                outputFormat: 'application/json',
                cql_filter: `INTERSECTS(geom, SRID=${currentSrid};${wkt})`
              })
            });
            if (urbaRes.ok) {
              const urbaJson = await urbaRes.json();
              if (urbaJson.features && urbaJson.features.length > 0) {
                const props = urbaJson.features[0].properties;
                wfsData += `\nIndicadores Urbanísticos (UrbaSIG):\n- Zona: ${props.designacio || 'N/A'}\n- FOS: ${props.fos || 'N/A'}\n- FOT: ${props.fota || 'N/A'}\n- Densidad: ${props.dena || 'N/A'}\n- Altura Máx: ${props.hmax || 'N/A'}\n- Usos Dominantes: ${props.ud || 'N/A'}\n- Usos Complementarios (¡Incluye Residencial si dice Habitacional!): ${props.uc || 'N/A'}`;
              }
            }
          } catch (e) { console.error('UrbaSIG WFS Error:', e); }
        }
      }

      // 3. Synthesize response using LLM
      console.log('--- WFS DEBUG ---');
      console.log('WKT:', wkt);
      console.log('WFS DATA:', wfsData);
      console.log('-----------------');

      const prompt = `
      You are the ArqTech Urban Agent, an expert architect and urban planner in Buenos Aires (especially La Plata).
      
      User Query: "${query || 'Análisis de lote'}"
      
      Live WFS Data retrieved for this request:
      ${wfsData ? wfsData : "No specific coordinates were provided, so no live WFS data could be fetched. Please answer theoretically based on the query, and gently remind the user that to give exact FOS/FOT they need to provide a location or address."}
      
      Your task:
      Answer the user's query clearly, professionally, and creatively. 
      If WFS data is present, explicitly calculate the building potential (e.g., if Area is 300m2 and FOT is 2, then max buildable area is 600m2). 
      If the user asked generally (like "a 300m2 lot in La Plata" without address), explain what FOS and FOT mean, give an example for a common zone in La Plata (like U/R2 or U/C1), and tell them to provide an address next time for an exact calculation.
      `;

      const responseText = await this.callLLM(prompt);

      return {
        status: 'success',
        output: {
          answer: responseText,
          wfs_data_used: !!wfsData
        }
      };

    } catch (error: any) {
      console.error('UrbanAgent Error:', error);
      return {
        status: 'failed',
        error: error.message
      };
    }
  }
}
