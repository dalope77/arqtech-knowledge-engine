import { getServiceRoleClient } from '../lib/supabase';
import crypto from 'crypto';

const BATCH_SIZE = 5; // Empezamos probando con 5

async function runScraper() {
  console.log('🤖 URBASIG_SCRAPER inicializando...');
  const supabase = getServiceRoleClient();

  let start = 0;
  let hasMore = true;
  let totalProcessed = 0;

  while (hasMore) {
    console.log(`\n📡 Consultando URBASIG API por ${BATCH_SIZE} registros (start=${start})...`);
    const dataRes = await fetch('https://urbasig.mgob.gba.gob.ar/ordenanzas/data.php', {
      method: 'POST',
      body: `start=${start}&length=${BATCH_SIZE}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const json = await dataRes.json();
    const records = json.data || [];
    
    if (records.length === 0) {
      console.log('No hay más registros. Terminando paginación.');
      hasMore = false;
      break;
    }
    
    console.log(`Obtenidos ${records.length} registros de la base provincial.`);

  for (const record of records) {
    const pdfsToProcess = [
      { name: `${record.n_orde_pdf}.pdf`, type: 'Ordenanza' },
      { name: `${record.n_dec_pdf}.pdf`, type: 'Decreto' }
    ].filter(p => p.name !== '.pdf' && p.name !== 'null.pdf' && p.name !== 'undefined.pdf');

    for (const pdfItem of pdfsToProcess) {
      const pdfUrl = `https://urbasig.mgob.gba.gob.ar/ordenanzas/pdf/${pdfItem.name}`;
      console.log(`\n⬇️ Descargando ${pdfItem.name}...`);
      
      try {
        const pdfRes = await fetch(pdfUrl);
        if (!pdfRes.ok) {
          console.warn(`⚠️ No se pudo descargar ${pdfUrl} (HTTP ${pdfRes.status})`);
          continue;
        }

        const arrayBuffer = await pdfRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Generar hash
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // Comprobar si ya existe
        const { data: existing } = await supabase.from('file_ingestions').select('id').eq('file_hash', hash).single();
        if (existing) {
          console.log(`⏩ Archivo ${pdfItem.name} ya existe en el grafo (Hash: ${hash.substring(0,8)}). Omitiendo.`);
          continue;
        }

        // Insertar en file_ingestions
        const { data: ingestion, error: dbErr } = await supabase.from('file_ingestions').insert({
          filename: pdfItem.name,
          file_type: 'pdf',
          file_hash: hash,
          status: 'UPLOADED',
          metadata: { folder: 'documents', size: buffer.length, source: 'urbasig', type: pdfItem.type }
        }).select().single();

        if (dbErr) throw dbErr;

        console.log(`✅ Registrado en BD. Subiendo al bucket...`);
        
        // Subir al bucket (Usamos admin auth via service role)
        const storagePath = `documents/${ingestion.id}_${pdfItem.name}`;
        const { error: uploadErr } = await supabase.storage.from('ingestions').upload(storagePath, buffer, { contentType: 'application/pdf' });
        
        if (uploadErr) throw uploadErr;
        
        const { data: publicUrlData } = supabase.storage.from('ingestions').getPublicUrl(storagePath);

        console.log(`🚀 Archivo encolado exitosamente (estado: UPLOADED). El Worker OCR se encargará de procesarlo.`);

      } catch (err: any) {
        console.error(`Error procesando ${pdfItem.name}:`, err.message);
      }
    }
  }
  
  start += BATCH_SIZE;
  totalProcessed += records.length;
  console.log(`✅ Lote completado. Total procesados hasta ahora: ${totalProcessed}`);
}
  
  console.log(`\n🏁 Scraper finalizado. Total registros explorados: ${totalProcessed}`);
}

runScraper();
