import fs from 'fs';
import pdfParse from 'pdf-parse';
import { getServiceRoleClient } from '../lib/supabase';

async function ingestLegalPDF() {
  console.log('🤖 INGESTION_AGENT (Legal) initializing...');
  const supabase = getServiceRoleClient();

  const filePath = './instructivo.pdf';
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const dataBuffer = fs.readFileSync(filePath);
  
  console.log(`Parsing PDF...`);
  const data = await pdfParse(dataBuffer);
  const text = data.text;

  // Simple chunking by paragraphs (double line break)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  
  console.log(`Extracted ${paragraphs.length} substantial paragraphs from the document.`);

  // Create the main Document Entity
  const docId = `DOC_LEGAL_INSTRUCTIVO_FACTIBILIDAD`;
  const docEntity = {
    id: docId,
    type: 'NORMA',
    name: 'Instructivo Factibilidad Conjuntos Inmobiliarios',
    metadata: {
      source: 'local_ordinances',
      pages: data.numpages,
      info: data.info
    }
  };

  await supabase.from('entities').upsert(docEntity, { onConflict: 'id' });

  // Create chunks as Document Sections
  const chunkEntities = paragraphs.map((p, index) => ({
    id: `${docId}_CHUNK_${index}`,
    type: 'REQUISITO',
    name: `Sección ${index + 1} - Instructivo`,
    metadata: {
      content: p.trim(),
      chunk_index: index,
      source: docId
    }
  }));

  // Chunk ingestion in batches to avoid payload limits
  const batchSize = 100;
  for (let i = 0; i < chunkEntities.length; i += batchSize) {
    const batch = chunkEntities.slice(i, i + batchSize);
    await supabase.from('entities').upsert(batch, { onConflict: 'id' });
  }

  // Relate chunks to the main document
  const relations = chunkEntities.map(chunk => ({
    id: `REL_${chunk.id}_BELONGS_${docId}`,
    from_entity_id: chunk.id,
    relation_type: 'extraido_de',
    to_entity_id: docId,
    confidence: 1.0
  }));

  for (let i = 0; i < relations.length; i += batchSize) {
    const batch = relations.slice(i, i + batchSize);
    await supabase.from('relations').upsert(batch, { onConflict: 'id' });
  }

  console.log(`✅ Ingested 1 NORMA entity and ${chunkEntities.length} REQUISITO entities.`);

  // Log the run
  await supabase.from('agent_runs').insert({
    id: 'RUN_INGEST_PDF_' + Date.now(),
    agent_id: 'INGESTION_AGENT',
    objective: 'Ingesta del Instructivo Legal (PDF) para factibilidad de conjuntos inmobiliarios.',
    status: 'success',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    output: { document: docId, chunks: chunkEntities.length }
  });

  console.log('🎉 Legal PDF Ingestion Complete!');
}

ingestLegalPDF().catch(console.error);
