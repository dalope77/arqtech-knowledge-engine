export interface RouteDecision {
  type: 'DETERMINISTIC' | 'ANALYTICAL';
  action?: string;
  targetRef?: string;
}

export interface UserContext {
  userId?: string;
  sessionContext?: any;
}

export interface QueryRouter {
  route(query: string, context?: UserContext): RouteDecision;
}

export class RuleRouter implements QueryRouter {
  route(query: string, context?: UserContext): RouteDecision {
    const q = query.toLowerCase().trim();

    // 1. Regex definitions for deterministic actions
    const getParcelRegex = /^(?:mostrar|ver|buscar|dame|obtener).*(?:parcela|lote|terreno)\s+([a-zA-Z0-9-]+)/i;
    const listNormativesRegex = /^(?:listar|mostrar|ver).*(?:normativas|leyes|ordenanzas)/i;

    // 2. Check deterministic routes
    const parcelMatch = q.match(getParcelRegex);
    if (parcelMatch && parcelMatch[1]) {
      return {
        type: 'DETERMINISTIC',
        action: 'VIEW_PARCEL',
        targetRef: parcelMatch[1]
      };
    }

    if (listNormativesRegex.test(q)) {
      return {
        type: 'DETERMINISTIC',
        action: 'LIST_NORMATIVES'
      };
    }

    // 3. Fallback to analytical LLM orchestrator
    return {
      type: 'ANALYTICAL'
    };
  }
}
