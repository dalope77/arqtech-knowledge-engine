import { getServiceRoleClient } from '../lib/supabase';
import { getDefaultLLMProvider } from '../lib/llm';

/**
 * ArqTech - Phase 2: Context Generation
 * 
 * 1. Toma las parcelas confirmadas (CONFIRMADO_VISUAL o CONFIRMADO_AUTOMATICO).
 * 2. Genera una descripción semántica rica utilizando el LLM.
 * 3. Guarda la descripción como una Observation y actualiza el estado.
 */

async function main() {
  const supabase = getServiceRoleClient();
  const llm = getDefaultLLMProvider();
  
  console.log('🚀 Iniciando Fase 2: Generación de Contexto Semántico...');

  // 1. Obtener parcelas confirmadas que necesitan contexto
  const { data: entities, error } = await supabase
    .from('entities')
    .select('*')
    .eq('type', 'PARCELA')
    .or("metadata->>pipeline_status.eq.CONFIRMADO_VISUAL,metadata->>pipeline_status.eq.CONFIRMADO_AUTOMATICO");

  if (error) {
    console.error('Error buscando parcelas:', error);
    return;
  }

  if (!entities || entities.length === 0) {
    console.log('✅ No hay parcelas pendientes de generación de contexto.');
    return;
  }

  console.log(`Encontradas ${entities.length} parcelas listas para análisis de contexto.`);

  for (const entity of entities) {
    console.log(`\n======================================================`);
    console.log(`Analizando parcela: ${entity.name}`);

    // Generar el prompt con la metadata
    const areaHa = entity.metadata?.area ? (entity.metadata.area / 10000).toFixed(2) : 'desconocida';
    
    const prompt = `
      Eres un experto analista urbano de ArqTech. 
      Analiza la siguiente parcela que acaba de ser confirmada como un nuevo desarrollo o asentamiento.
      
      Nomenclatura / Nombre: ${entity.name}
      Área estimada: ${areaHa} hectáreas.
      Estado de confirmación: ${entity.metadata?.pipeline_status}

      Redacta una descripción concisa (máximo 3 oraciones) que resuma las características urbanísticas de este polígono. 
      Limítate a describir que es un desarrollo en proceso de ${areaHa} hectáreas.
    `;

    try {
      console.log('🤖 Solicitando generación de contexto al LLM...');
      const response = await llm.generateContent([{ role: 'user', content: prompt }]);
      
      const description = response.text?.trim() || 'Desarrollo urbano sin descripción generada.';

      console.log('📝 Descripción generada:');
      console.log(`   "${description}"`);

      // Guardar Observation
      const obsId = 'obs-ctx-' + Date.now() + Math.floor(Math.random() * 1000);
      const { error: obsError } = await supabase.from('observations').insert({
        id: obsId,
        subject_entity_id: entity.id,
        predicate: 'descripcion_semantica',
        value: description,
        confidence: 0.9,
        source: 'LLM Urban Analyst'
      });

      if (obsError) {
        console.error('Error insertando observación:', obsError);
        continue;
      }

      // Actualizar Entity status
      const updatedMetadata = {
        ...entity.metadata,
        pipeline_status: 'CONTEXTO_GENERADO'
      };

      await supabase.from('entities').update({ metadata: updatedMetadata }).eq('id', entity.id);
      console.log('✅ Entidad actualizada a CONTEXTO_GENERADO');

      // TODO: Aquí iría la llamada a crear Embeddings vectoriales si tienes pgvector
      // ej: const emb = await generateEmbedding(description);
      // await supabase.from('embeddings').insert({ entity_id: entity.id, vector: emb })

    } catch (e: any) {
      console.error(`⚠️ Error procesando la parcela ${entity.id}:`, e.message);
    }
  }

  console.log('\n✅ Proceso de generación de contexto finalizado.');
}

main().catch(console.error);
