import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import pdfParse from 'pdf-parse';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ingestionId = formData.get('ingestion_id') as string;
    
    if (!file || !ingestionId) {
      return NextResponse.json({ error: 'Falta archivo o ID de ingesta' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Extraer texto real usando pdf-parse
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // 2. Fragmentar el documento (Chunking simple)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    
    if (paragraphs.length === 0) {
      // Intentar dividir por salto de linea simple si no hay dobles
      paragraphs.push(...text.split('\n').filter(p => p.trim().length > 50));
    }

    const docId = `DOC_${ingestionId.split('-')[0].toUpperCase()}`;
    
    // 3. Crear el documento maestro
    const docEntity = {
      id: docId,
      type: 'NORMATIVA',
      name: file.name,
      metadata: {
        ingestion_id: ingestionId,
        source: 'user_upload',
        pages: pdfData.numpages,
        info: pdfData.info
      }
    };

    await supabase.from('entities').upsert(docEntity, { onConflict: 'id' });

    // 4. Crear los chunks reales
    const chunkEntities = paragraphs.map((p, index) => ({
      id: `${docId}_CHUNK_${index}`,
      type: 'PDF_CHUNK',
      name: `Sección ${index + 1} - ${file.name}`,
      metadata: {
        ingestion_id: ingestionId,
        content: p.trim(),
        chunk_index: index,
        source: docId
      }
    }));

    // Ingestar en lotes de 100 para no romper limites de payload
    const batchSize = 100;
    for (let i = 0; i < chunkEntities.length; i += batchSize) {
      await supabase.from('entities').upsert(chunkEntities.slice(i, i + batchSize), { onConflict: 'id' });
    }

    // 5. Crear relaciones
    const relations = chunkEntities.map(chunk => ({
      id: `REL_${chunk.id}_BELONGS_${docId}`,
      from_entity_id: chunk.id,
      relation_type: 'extraido_de',
      to_entity_id: docId,
      metadata: { ingestion_id: ingestionId },
      confidence: 1.0
    }));

    for (let i = 0; i < relations.length; i += batchSize) {
      await supabase.from('relations').upsert(relations.slice(i, i + batchSize), { onConflict: 'id' });
    }

    // 6. Actualizar status
    await supabase.from('file_ingestions').update({ status: 'PROCESSED' }).eq('id', ingestionId);

    // 7. Log del agente
    await supabase.from('agent_runs').insert({
      id: 'RUN_INGEST_PDF_' + Date.now(),
      agent_id: 'INGESTION_AGENT',
      objective: `Procesamiento de PDF real: ${file.name}`,
      status: 'success',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      output: { document: docId, chunks: chunkEntities.length, pages: pdfData.numpages }
    });

    return NextResponse.json({ success: true, chunks: chunkEntities.length });
  } catch (error: any) {
    console.error('Error procesando PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
