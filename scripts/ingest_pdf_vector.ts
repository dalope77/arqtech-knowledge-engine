import { db } from '../lib/db';
import crypto from 'crypto';

// Dummy function to simulate embedding generation for a text chunk
function generateDummyEmbedding(): number[] {
  // Return an array of 1536 random floats between -1 and 1
  return Array.from({ length: 1536 }, () => (Math.random() * 2) - 1);
}

async function ingestPDFToVectorStore() {
  console.log('Ingesting Long-Form PDF to Vector Store...');

  const docId = `DOC_${Date.now()}`;
  const ordinanceId = 'ORD_LP_12692_2025'; // La Plata POT

  // 1. Create Document Entity in the new table
  await db.createDocument({
    id: docId,
    title: 'Texto Completo: Plan de Ordenamiento Territorial La Plata (Fase 1)',
    source_url: 'https://urbasig.mgob.gba.gob.ar/ordenanzas/12692.pdf',
    document_type: 'PDF_NORMA',
    metadata: {
      ordinance_id: ordinanceId,
      pages: 80,
      size_mb: 4.5
    }
  });

  console.log(`Created Document Record: ${docId}`);

  // 2. Simulate text extraction and chunking (Recursive Character Text Splitter)
  const simulatedText = `
    VISTO el Expediente N° 4061-123456/24 y la necesidad de actualizar la normativa urbana...
    El Plan de Ordenamiento Territorial (POT) de La Plata establece las directrices...
    Artículo 1: Apruébase la Fase 1 del POT.
    Artículo 12: Se crea el Área de Protección Histórica...
    Artículo 45: Para la Zona Residencial R3 se establece FOS 0.6 y FOT 1.2, con altura máxima de 4 niveles o 12 metros.
    Además, se prohíbe la instalación de industrias peligrosas en esta zona.
    ... [80 pages of text] ...
  `;

  // Split into paragraphs/chunks
  const rawChunks = simulatedText.split('\n').map(c => c.trim()).filter(c => c.length > 20);

  const documentChunks = rawChunks.map((content, index) => ({
    id: `CHUNK_${docId}_${index}`,
    document_id: docId,
    chunk_index: index,
    content: content,
    embedding: generateDummyEmbedding()
  }));

  // 3. Insert chunks with embeddings into the Vector Store
  await db.createDocumentChunks(documentChunks);
  console.log(`Successfully embedded and inserted ${documentChunks.length} chunks into pgvector.`);

  // 4. Finally, link the Document to the Knowledge Graph so it's discoverable!
  // This is the beautiful part: The Graph only holds the REFERENCE, not the text.
  await db.createObservation({
    id: `OBS_DOC_REF_${docId}`,
    subject_entity_id: ordinanceId,
    predicate: 'tiene_documento_asociado',
    value: docId,
    source: 'Vector_Store_Ingestion',
    agent_id: 'SYSTEM',
    confidence: 1.0
  });

  console.log(`Linked Document ${docId} to Ordinance ${ordinanceId} in the Master Graph!`);
  console.log('✅ PDF Ingestion to Vector Store Complete!');
}

ingestPDFToVectorStore().catch(console.error);
