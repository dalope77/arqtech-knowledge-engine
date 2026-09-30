import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { ingestion_id, url, filename } = await req.json();

    if (!ingestion_id || !url) {
      return NextResponse.json({ error: 'Falta ingestion_id o url' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // 1. Update status to PROCESSING
    await supabase.from('file_ingestions').update({ status: 'PROCESSING' }).eq('id', ingestion_id);

    // 2. Enqueue background work (fire and forget for local dev)
    processPdfBackground(ingestion_id, url, filename).catch(async (err) => {
      console.error('[Background Task] Error procesando PDF async:', err);
      await supabase.from('file_ingestions').update({ status: 'FAILED' }).eq('id', ingestion_id);
    });

    return NextResponse.json({ success: true, message: 'Procesamiento en background iniciado.' }, { status: 202 });
  } catch (error: any) {
    console.error('Error iniciando pipeline async:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processPdfBackground(ingestionId: string, url: string, filename: string) {
  const supabase = getServiceRoleClient();
  
  console.log(`[Background Task] Llamando a Python docTR para ${filename}...`);
  
  // Llama al microservicio Python
  const response = await fetch('http://localhost:8002/api/ocr/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf_url: url })
  });

  if (!response.ok) {
    throw new Error(`Python OCR falló: ${response.statusText}`);
  }

  const ocrData = await response.json();
  
  // Transformar la salida de docTR a texto
  const paragraphs: string[] = [];
  
  if (ocrData.pages) {
    for (const page of ocrData.pages) {
      for (const block of page.blocks || []) {
        const blockLines = [];
        for (const line of block.lines || []) {
          const words = (line.words || []).map((w: any) => w.value).join(' ');
          blockLines.push(words);
        }
        const text = blockLines.join('\n').trim();
        if (text.length > 20) {
          paragraphs.push(text);
        }
      }
    }
  }

  if (paragraphs.length === 0) {
    throw new Error('No se encontró texto en el PDF.');
  }

  console.log(`[Background Task] Python docTR extrajo ${paragraphs.length} bloques. Inyectando al grafo...`);

  const docId = `DOC_${ingestionId.split('-')[0].toUpperCase()}`;
  
  // 3. Crear el documento maestro
  const docEntity = {
    id: docId,
    type: 'NORMATIVA',
    name: filename,
    metadata: {
      ingestion_id: ingestionId,
      source: 'python_doctr',
      pages: ocrData.pages?.length || 1,
    }
  };

  await supabase.from('entities').upsert(docEntity, { onConflict: 'id' });

  // 4. Crear los chunks reales
  const chunkEntities = paragraphs.map((p, index) => ({
    id: `${docId}_CHUNK_${index}`,
    type: 'PDF_CHUNK',
    name: `Bloque Visual ${index + 1} - ${filename}`,
    metadata: {
      ingestion_id: ingestionId,
      content: p,
      chunk_index: index,
      source: docId
    }
  }));

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
  console.log(`[Background Task] Terminado con éxito para ${filename}`);
}
