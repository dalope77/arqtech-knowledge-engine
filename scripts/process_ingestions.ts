import { getServiceRoleClient } from '../lib/supabase';

async function processIngestions() {
  console.log('🤖 INGESTION_AGENT initializing...');
  const supabase = getServiceRoleClient();

  // 1. Fetch pending ingestions
  const { data: pendingFiles, error: fetchErr } = await supabase
    .from('file_ingestions')
    .select('*')
    .eq('status', 'UPLOADED');

  if (fetchErr) {
    console.error('Error fetching pending ingestions:', fetchErr);
    return;
  }

  if (!pendingFiles || pendingFiles.length === 0) {
    console.log('No pending files to process.');
    return;
  }

  console.log(`Found ${pendingFiles.length} files to process.`);

  for (const file of pendingFiles) {
    console.log(`\nProcessing ${file.filename} (Hash: ${file.file_hash.substring(0,8)}...)`);
    
    if (file.file_type === 'pdf') {
      // Create main Document Entity
      const docId = `DOC_${file.file_hash.substring(0, 16).toUpperCase()}`;
      const docEntity = {
        id: docId,
        type: 'NORMATIVA',
        name: file.filename,
        metadata: {
          ingestion_id: file.id,
          source: 'user_upload',
          hash: file.file_hash
        }
      };

      await supabase.from('entities').upsert(docEntity, { onConflict: 'id' });
      
      // Simulate chunking
      const chunkEntities = Array.from({ length: 3 }).map((_, index) => ({
        id: `${docId}_CHUNK_${index}`,
        type: 'PDF_CHUNK',
        name: `Sección ${index + 1} - ${file.filename}`,
        metadata: {
          ingestion_id: file.id,
          content: `Texto extraído simulado del bloque ${index + 1} de la normativa ${file.filename}.`,
          chunk_index: index,
          source: docId
        }
      }));

      await supabase.from('entities').upsert(chunkEntities, { onConflict: 'id' });

      // Create relations
      const relations = chunkEntities.map(chunk => ({
        id: `REL_${chunk.id}_BELONGS_${docId}`,
        from_entity_id: chunk.id,
        relation_type: 'extraido_de',
        to_entity_id: docId,
        metadata: { ingestion_id: file.id },
        confidence: 1.0
      }));

      await supabase.from('relations').upsert(relations, { onConflict: 'id' });
      console.log(`✅ Extracted 1 NORMATIVA and ${chunkEntities.length} chunks into the graph.`);
      
    } else {
      console.log(`File type ${file.file_type} processing logic not implemented yet. Skipping.`);
    }

    // Update status to PROCESSED
    await supabase.from('file_ingestions').update({ status: 'PROCESSED' }).eq('id', file.id);
  }

  console.log('\n🎉 All pending ingestions processed!');
}

processIngestions().catch(console.error);
