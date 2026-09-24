import { getEntity, createEntity } from '../knowledge/entities';
import { createRelation } from '../knowledge/relations';
import { createObservation } from '../knowledge/observations';
import { logEvent } from '../events';
import { EntityType } from '../../types';

export class AgentTools {
  constructor(private agentId: string) {}

  /**
   * Retrieves an entity from the knowledge graph and logs a consultation event.
   */
  async consultEntity(entityId: string) {
    const entity = await getEntity(entityId);
    if (entity) {
      await logEvent(this.agentId, 'consulted_entity', entityId, { found: true });
    } else {
      await logEvent(this.agentId, 'consulted_entity', entityId, { found: false });
    }
    return entity;
  }

  /**
   * Registers a new entity in the knowledge graph.
   */
  async discoverEntity(type: EntityType, name: string, metadata?: Record<string, any>) {
    const entity = await createEntity(type, name, undefined, metadata);
    if (entity) {
      await logEvent(this.agentId, 'discovered_entity', entity.id, { type, name });
    }
    return entity;
  }

  /**
   * Adds an observation about a specific entity.
   */
  async recordObservation(
    subjectEntityId: string, 
    predicate: string, 
    value: string, 
    evidence?: string
  ) {
    const observation = await createObservation({
      subject_entity_id: subjectEntityId,
      predicate,
      value,
      evidence,
      agent_id: this.agentId,
      source: 'LLM_INFERENCE'
    });

    if (observation) {
      await logEvent(this.agentId, 'created_observation', subjectEntityId, { predicate, value });
    }
    return observation;
  }

  /**
   * Links two entities together in the knowledge graph.
   */
  async linkEntities(
    fromEntityId: string, 
    relationType: string, 
    toEntityId: string, 
    confidence = 1.0
  ) {
    const relation = await createRelation(
      fromEntityId, 
      relationType, 
      toEntityId, 
      undefined, 
      confidence
    );

    if (relation) {
      await logEvent(this.agentId, 'created_relation', fromEntityId, { relationType, toEntityId });
    }
    return relation;
  }
}
