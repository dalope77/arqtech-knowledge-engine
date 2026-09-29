import { BaseAgent, AgentContext, AgentResult } from './index';
import { getServiceRoleClient } from '../supabase';

export class SatelliteAgent extends BaseAgent {
  private pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

  constructor() {
    super('SATELLITE_AGENT', process.env.LLM_MODEL || 'default-model');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const supabase = getServiceRoleClient();
    const { t1_url, t2_url, regionWKT } = context.input;
    if (!t1_url || !t2_url || !regionWKT) {
       return { status: 'failed', error: 'Missing parameters' };
    }

    try {
      console.log(`[SatelliteAgent] Iniciando análisis temporal T1 -> T2...`);
      
      // 1. Llamar al microservicio Python
      const response = await fetch(`${this.pythonServiceUrl}/api/satellite/change-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          t1_image_url: t1_url,
          t2_image_url: t2_url,
          region_wkt: regionWKT
        })
      });

      if (!response.ok) {
        throw new Error(`Error en Python Service: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status !== 'success') {
        throw new Error('El servicio de Python no retornó success.');
      }

      // 2. Guardar cada área de crecimiento detectada en PostGIS
      const entityIds = [];
      for (const obs of result.observations) {
        if (obs.type === 'URBAN_GROWTH_AREA') {
          const entityId = `GROWTH_AREA_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          
          // Guardar Entidad Espacial (WKT -> PostGIS geometry)
          await supabase.from('entities').upsert({
            id: entityId,
            type: 'URBAN_GROWTH_AREA',
            name: `Expansión Urbana Detectada (${result.model})`,
            geom: obs.geometry_wkt,
            metadata: { area_m2: obs.area_m2, confidence: result.confidence }
          });
          
          // Guardar la Observación (Provenance)
          await supabase.from('observations').insert({
            id: `OBS_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            subject_entity_id: entityId,
            predicate: 'expansion_area_m2',
            value: obs.area_m2.toString(),
            source: 'Satellite Change Detection Pipeline',
            evidence: `Job Run ID: ${context.runId}`,
            confidence: result.confidence
          });

          entityIds.push(entityId);
        }
      }

      // FASE 8: Crear un Artifact que contenga el resumen del análisis satelital
      const artifactId = await this.produceArtifact(context.runId, 'SATELLITE_ANALYSIS', {
        t1_url,
        t2_url,
        areas_detected: entityIds.length,
        model_used: result.model,
        summary: `Detectadas ${entityIds.length} áreas de expansión urbana.`
      });

      console.log(`[SatelliteAgent] Guardadas ${entityIds.length} áreas y creado Artifact ${artifactId}.`);
      
      return {
        status: 'success',
        output: {
          artifact_id: artifactId,
          entity_ids: entityIds,
          evidence: entityIds
        }
      };

    } catch (error: any) {
      console.error('[SatelliteAgent] Error:', error);
      return { status: 'failed', error: error.message };
    }
  }

  /**
   * Este método simula la acción del Discovery Engine para buscar intersecciones.
   */
  async findIntersectingParcels(targetWKT: string): Promise<any[]> {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('get_intersecting_entities', {
      target_type: 'PARCELA',
      target_wkt: targetWKT
    });

    if (error) {
      console.error('[SatelliteAgent] Error buscando intersecciones:', error);
      return [];
    }

    return data || [];
  }
}
