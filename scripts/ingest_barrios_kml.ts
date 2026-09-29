import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const filePath = path.join(process.cwd(), 'docs', 'barrios.kml');
  console.log(`Leyendo archivo KML: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error('El archivo no existe.');
    process.exit(1);
  }

  const kmlContent = fs.readFileSync(filePath, 'utf8');
  console.log(`Archivo cargado en memoria (${(kmlContent.length / 1024 / 1024).toFixed(2)} MB). Buscando Placemarks...`);

  // Extraer todos los bloques <Placemark>
  const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g;
  let match;
  let totalProcessed = 0;
  let totalInserted = 0;
  let errors = 0;

  const BATCH_SIZE = 50;
  let batchPromises = [];

  while ((match = placemarkRegex.exec(kmlContent)) !== null) {
    totalProcessed++;
    const placemarkContent = match[0]; // Texto completo del placemark (incluye etiquetas)
    
    // Extraer ID del placemark
    const idMatch = placemarkContent.match(/<Placemark id="([^"]+)">/);
    const rawId = idMatch ? idMatch[1] : `BARRIO_KML_${totalProcessed}`;
    const id = `KML_${rawId}`;
    
    // Extraer Nombre
    const nameMatch = placemarkContent.match(/<name>([\s\S]*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : `Barrio ${rawId}`;

    // Buscar geometría (<Polygon> o <MultiGeometry>)
    const geomMatch = placemarkContent.match(/<(Polygon|MultiGeometry)>[\s\S]*?<\/\1>/);
    if (!geomMatch) {
      console.warn(`[!] Placemark ${id} sin geometría. Saltando...`);
      continue;
    }
    
    const kmlGeom = geomMatch[0];

    // Extraer alguna metadata básica para el JSON (tipo_uc, tipo_subdi, etc)
    const metadata: any = { source: 'barrios.kml' };
    
    const tipoUcMatch = placemarkContent.match(/<SimpleData name="COL5383F8CF39596C3A">([^<]+)<\/SimpleData>/);
    if (tipoUcMatch) metadata.tipo_uc = tipoUcMatch[1].trim();

    // Promesa de inserción
    const insertPromise = supabase.rpc('insert_kml_entity', {
      p_id: id,
      p_type: 'BARRIO_CERRADO',
      p_name: name,
      p_metadata: metadata,
      p_kml_geom: kmlGeom
    }).then(({ error }) => {
      if (error) {
        console.error(`Error guardando ${id}:`, error.message);
        errors++;
      } else {
        totalInserted++;
      }
    });

    batchPromises.push(insertPromise);

    if (batchPromises.length >= BATCH_SIZE) {
      process.stdout.write(`Insertando lote de ${BATCH_SIZE}... `);
      await Promise.all(batchPromises);
      process.stdout.write(`Progreso: ${totalInserted}/${totalProcessed}\n`);
      batchPromises = [];
    }
  }

  // Insertar los restantes
  if (batchPromises.length > 0) {
    await Promise.all(batchPromises);
  }

  console.log('\n--- RESUMEN ---');
  console.log(`Total Placemarks encontrados: ${totalProcessed}`);
  console.log(`Total Insertados: ${totalInserted}`);
  console.log(`Errores: ${errors}`);
  console.log('Ingesta Finalizada.');
}

main().catch(console.error);
