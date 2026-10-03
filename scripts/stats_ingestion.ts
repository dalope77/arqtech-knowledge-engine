import { getServiceRoleClient } from '../lib/supabase';

async function calculateStats() {
  const supabase = getServiceRoleClient();
  
  // 1. Get all ingestions
  const { data: ingestions, error } = await supabase
    .from('file_ingestions')
    .select('id, status, file_type, metadata, filename');
    
  if (error) {
    console.error("Error fetching ingestions:", error);
    return;
  }
  
  // 2. Get claims with ingestion_id
  const { data: claims, error: claimsErr } = await supabase
    .from('claims')
    .select('metadata');
    
  if (claimsErr) {
    console.error("Error fetching claims:", claimsErr);
    return;
  }

  const analyzedIngestionIds = new Set();
  for (const claim of claims || []) {
    if (claim.metadata && claim.metadata.ingestion_id) {
      analyzedIngestionIds.add(claim.metadata.ingestion_id);
    }
  }

  // 3. Group by source / file_type
  const stats: Record<string, { total: number, uploaded: number, processed: number, analyzed: number }> = {};

  for (const doc of ingestions || []) {
    // Determine the source. We'll use file_type or folder for grouping.
    let source = doc.file_type || 'desconocido';
    
    // Grouping PDF files that look like normativas together
    if (source === 'pdf') {
      source = 'Normativas (PDFs)';
    } else if (source === 'kml' || source === 'geojson' || source === 'zip') {
      source = 'Espacial (Mapas)';
    }

    if (!stats[source]) {
      stats[source] = { total: 0, uploaded: 0, processed: 0, analyzed: 0 };
    }

    stats[source].total++;
    
    // Status can be UPLOADED, PROCESSED, FAILED
    if (doc.status === 'UPLOADED') {
      stats[source].uploaded++;
    } else if (doc.status === 'PROCESSED' || doc.status === 'success') {
      stats[source].processed++;
    }

    if (analyzedIngestionIds.has(doc.id)) {
      stats[source].analyzed++;
    }
  }

  console.log("=== ESTADÍSTICAS DE INGESTA DE DATOS ===");
  for (const [source, data] of Object.entries(stats)) {
    console.log(`\nFuente/Tipo: ${source.toUpperCase()}`);
    console.log(`- Total de archivos registrados: ${data.total}`);
    console.log(`- Solo subidos (UPLOADED): ${data.uploaded} (${((data.uploaded / data.total) * 100).toFixed(1)}%)`);
    console.log(`- Procesados (Chunks extraídos): ${data.processed} (${((data.processed / data.total) * 100).toFixed(1)}%)`);
    console.log(`- Analizados (Con Claims extraídos): ${data.analyzed} (${((data.analyzed / data.total) * 100).toFixed(1)}%)`);
    
    const completelyAnalyzed = (data.analyzed / data.total) * 100;
    if (completelyAnalyzed === 100) {
      console.log("✅ 100% Actualizado y Analizado.");
    } else {
      console.log("⚠️ Hay archivos pendientes de procesamiento o análisis en esta fuente.");
    }
  }
}

calculateStats().catch(console.error);
