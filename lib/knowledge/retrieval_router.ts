import { getServiceRoleClient } from '../supabase';

export interface RetrievalDecision {
  mode: 'STRUCTURED' | 'SPATIAL' | 'SEMANTIC' | 'RELATIONAL';
  query_params?: any;
}

export class RetrievalRouter {
  
  /**
   * Determina la mejor estrategia de recuperación de información
   * y ejecuta la consulta para traer solo lo necesario.
   */
  async retrieve(intent: string, params: Record<string, any> = {}): Promise<any> {
    const decision = this.decideMode(intent, params);
    console.log(`[RetrievalRouter] Using mode: ${decision.mode} for intent: ${intent}`);
    
    switch (decision.mode) {
      case 'STRUCTURED':
        return await this.fetchStructured(params);
      case 'SPATIAL':
        return await this.fetchSpatial(params);
      case 'SEMANTIC':
        return await this.fetchSemantic(params);
      case 'RELATIONAL':
        return await this.fetchRelational(params);
      default:
        return null;
    }
  }

  private decideMode(intent: string, params: Record<string, any>): RetrievalDecision {
    const intentLower = intent.toLowerCase();
    
    // Si buscamos por geometría, coordenadas o cercanía
    if (intentLower.includes('spatial') || intentLower.includes('intersect') || params.wkt) {
      return { mode: 'SPATIAL' };
    }
    
    // Si buscamos normativas por texto o similitud
    if (intentLower.includes('search') || intentLower.includes('similar')) {
      return { mode: 'SEMANTIC' };
    }
    
    // Si buscamos cómo se conectan las entidades
    if (intentLower.includes('relation') || intentLower.includes('graph')) {
      return { mode: 'RELATIONAL' };
    }
    
    // Por defecto, consultas directas SQL (ej. dame la parcela X)
    return { mode: 'STRUCTURED' };
  }

  private async fetchStructured(params: any) {
    const supabase = getServiceRoleClient();
    let query = supabase.from('entities').select('*');
    
    if (params.id) query = query.eq('id', params.id);
    if (params.type) query = query.eq('type', params.type);
    
    const { data } = await query.limit(10);
    return data;
  }

  private async fetchSpatial(params: any) {
    const supabase = getServiceRoleClient();
    // Ejemplo de RPC espacial: get_intersecting_entities
    if (params.wkt) {
       const { data } = await supabase.rpc('get_intersecting_entities', { 
           p_wkt: params.wkt,
           p_type: params.type || null
       });
       return data;
    }
    return [];
  }

  private async fetchSemantic(params: any) {
    // Placeholder para pgvector (match_documents u observaciones)
    console.warn('[RetrievalRouter] Semantic search (pgvector) not fully implemented yet.');
    return [];
  }

  private async fetchRelational(params: any) {
    const supabase = getServiceRoleClient();
    if (params.entity_id) {
       // Buscar grafos de 1 grado de separación
       const { data } = await supabase.from('relations').select('*, to_entity:entities!to_entity_id(*)').eq('from_entity_id', params.entity_id);
       return data;
    }
    return [];
  }
}
