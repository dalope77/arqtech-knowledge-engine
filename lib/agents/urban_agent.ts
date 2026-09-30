import { BaseAgent, AgentContext, AgentResult } from './index';
import { LLMMessage } from '../llm';
import { getServiceRoleClient } from '../supabase';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
      If they ask for specific parcels, irregular neighborhoods ("barrios irregulares") or un-subdivided parcels, USE THE query_knowledge_graph TOOL to find them in our database. NEVER say "I don't have records" without using the tool first. 
      If the user explicitly asks you to RUN the pipeline, DISCOVER new irregular neighborhoods, or EXECUTE the detection process, use the run_discovery_pipeline TOOL.
      If you find them using the tools, YOU MUST generate a markdown link to mark them on the map: [Ver en el Mapa](/dashboard/map?entityId=ENTITY_ID). 
      IMPORTANT: The concept of FOS and FOT in Argentina means "Factor de Ocupación del Suelo" and "Factor de Ocupación Total". NEVER invent alternative acronym meanings.
      `;

      const messages: LLMMessage[] = [
        { role: 'user', content: prompt }
      ];

      const tools = [
        {
          type: 'function',
          function: {
            name: 'query_knowledge_graph',
            description: 'Busca en la base de datos interna de claims y entidades (ej. barrios irregulares, parcelas específicas). Úsalo si te preguntan por casos específicos que no tienes en contexto.',
            parameters: {
              type: 'object',
              properties: {
                search_term: { type: 'string', description: 'El término a buscar (ej. "irregular", "barrio cerrado")' }
              },
              required: ['search_term']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'run_discovery_pipeline',
            description: 'Ejecuta el pipeline real de descubrimiento (ARBA + OSM + Satélite) en AMBA para encontrar NUEVOS barrios irregulares o macizos sin subdividir.',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        }
      ];

      let response = await this.callLLMWithTools(messages, { tools });

      // Handle tool call
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];
        
        if (toolCall.function?.name === 'query_knowledge_graph') {
          console.log('[UrbanAgent] LLM requested database query:', toolCall.function.arguments);
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const term = args.search_term || 'regular';
          
          // Perform robust DB query
          const supabase = getServiceRoleClient();
          const { data: claims } = await supabase
            .from('claims')
            .select('statement, confidence, metadata')
            .or(`statement.ilike.%regular%,statement.ilike.%asentamiento%,statement.ilike.%barrio%,statement.ilike.%${term}%`)
            .limit(10);

          let dbResults = 'No se encontraron resultados en la base de datos.';
          if (claims && claims.length > 0) {
            dbResults = "Encontré los siguientes registros (Claims):\n" + claims.map((c: any) => 
              `- Afirmación: "${c.statement}" (Confianza: ${c.confidence})\n  ID Entidad (para el mapa): ${c.metadata?.context_refs?.target_parcel || 'desconocido'}`
            ).join('\n');
            dbResults += "\n\nINSTRUCCIÓN CRÍTICA: Debes proveer un enlace al mapa usando este ID. Usa el formato Markdown: [Ver en el Mapa](/dashboard/map?entityId=ID_ENTIDAD). Reemplaza ID_ENTIDAD con el ID Entidad indicado.";
          }

          // Add tool result to conversation and call LLM again
          messages.push({ role: 'assistant', content: null, tool_calls: response.tool_calls });
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: dbResults });
          
          response = await this.callLLMWithTools(messages, { tools });
        } else if (toolCall.function?.name === 'run_discovery_pipeline') {
          console.log('[UrbanAgent] LLM requested execution of discovery pipeline.');
          let toolResult = '';
          try {
            // Assuming we run in the project root
            const { stdout, stderr } = await execAsync('npx tsx --env-file=.env.local scripts/discovery_amba.ts');
            toolResult = `Pipeline Output:\n${stdout}\n${stderr}\n(Nota para el LLM: El pipeline fue ejecutado con éxito. Extrae la información y dale un buen resumen al usuario, e intenta extraer el ID de la parcela si se insertó para enviarlo al mapa)`;
          } catch (e: any) {
            toolResult = `Error executing pipeline: ${e.message}`;
          }

          messages.push({ role: 'assistant', content: null, tool_calls: response.tool_calls });
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult });
          
          response = await this.callLLMWithTools(messages, { tools });
        }
      }

      return {
        status: 'success',
        output: {
          answer: response.text || 'Sin respuesta.',
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
