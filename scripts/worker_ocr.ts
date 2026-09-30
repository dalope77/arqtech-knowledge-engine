import { getServiceRoleClient } from '../lib/supabase';

async function runWorker() {
  console.log('👷 WORKER OCR inicializando...');
  const supabase = getServiceRoleClient();

  while (true) {
    // 1. Buscar un registro pendiente (UPLOADED)
    const { data: records, error: fetchErr } = await supabase
      .from('file_ingestions')
      .select('*')
      .eq('status', 'UPLOADED')
      .limit(1);

    if (fetchErr) {
      console.error('Error buscando pendientes:', fetchErr.message);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (!records || records.length === 0) {
      console.log('💤 No hay archivos pendientes. Esperando 10 segundos...');
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }

    const record = records[0];
    console.log(`\n⚙️ Procesando: ${record.filename}...`);

    try {
      // 2. Marcar como PROCESSING
      await supabase.from('file_ingestions').update({ status: 'PROCESSING' }).eq('id', record.id);

      // 3. Obtener URL pública
      const storagePath = `documents/${record.id}_${record.filename}`;
      const { data: publicUrlData } = supabase.storage.from('ingestions').getPublicUrl(storagePath);
      const url = publicUrlData.publicUrl;

      // 4. Llamar a Python secuencialmente y ESPERAR
      console.log(`🧠 Ejecutando IA (docTR) en Python (esto puede tardar unos minutos)...`);
      const response = await fetch('http://localhost:8002/api/ocr/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_url: url })
      });

      if (!response.ok) {
        throw new Error(`Python OCR falló: ${response.statusText}`);
      }

      const ocrData = await response.json();
      
      // Transformar salida a texto
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
        throw new Error('No se encontró texto útil en el PDF.');
      }

      console.log(`✅ Extraídos ${paragraphs.length} bloques. Inyectando al grafo...`);

      const docId = `DOC_${record.id.split('-')[0].toUpperCase()}`;
      
      // 5. Inyectar en BD
      await supabase.from('entities').upsert({
        id: docId, type: 'NORMATIVA', name: record.filename,
        metadata: { ingestion_id: record.id, source: 'python_doctr', pages: ocrData.pages?.length || 1 }
      }, { onConflict: 'id' });

      const chunkEntities = paragraphs.map((p, index) => ({
        id: `${docId}_CHUNK_${index}`, type: 'PDF_CHUNK', name: `Bloque Visual ${index + 1} - ${record.filename}`,
        metadata: { ingestion_id: record.id, content: p, chunk_index: index, source: docId }
      }));

      for (let i = 0; i < chunkEntities.length; i += 100) {
        await supabase.from('entities').upsert(chunkEntities.slice(i, i + 100), { onConflict: 'id' });
      }

      const relations = chunkEntities.map(chunk => ({
        id: `REL_${chunk.id}_BELONGS_${docId}`, from_entity_id: chunk.id, relation_type: 'extraido_de', to_entity_id: docId,
        metadata: { ingestion_id: record.id }, confidence: 1.0
      }));

      for (let i = 0; i < relations.length; i += 100) {
        await supabase.from('relations').upsert(relations.slice(i, i + 100), { onConflict: 'id' });
      }

      // 6. Marcar PROCESSED
      await supabase.from('file_ingestions').update({ status: 'PROCESSED' }).eq('id', record.id);
      console.log(`🎉 Finalizado con éxito: ${record.filename}`);

    } catch (err: any) {
      console.error(`❌ Error procesando ${record.filename}:`, err.message);
      await supabase.from('file_ingestions').update({ status: 'FAILED' }).eq('id', record.id);
    }
  }
}

runWorker();
