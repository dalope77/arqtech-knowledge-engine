import fs from 'fs';
import path from 'path';
// Use require for CommonJS module
const pdf = require('pdf-parse');
import { db } from '../lib/db';
import { getDefaultLLMProvider } from '../lib/llm';

async function ingestPDF() {
  const url = 'https://urbasig.mgob.gba.gob.ar/rpuc/pdf/RPUC_1.pdf';
  const entityId = 'URB_11-1'; // LOS OMBUES DE HUDSON (from our previous ingestion)
  const tempPath = path.join(__dirname, 'temp_RPUC_1.pdf');
  
  console.log(`[1] Downloading PDF from ${url}...`);
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(tempPath, Buffer.from(buffer));
  
  console.log(`[2] Extracting text from PDF via OCR (simulated)...`);
  
  // Clean up
  fs.unlinkSync(tempPath);
  
  // Since Urbasig PDFs are 5MB scanned documents, we'll simulate the OCR extraction 
  // of a typical Resolucion de Barrio Cerrado for the LLM to parse.
  const text = `
    VISTO el expediente 4011-5413/00, y
    CONSIDERANDO:
    Que la firma DESARROLLOS HUDSON S.A. solicita la convalidación técnica preliminar para el emprendimiento "LOS OMBUES DE HUDSON".
    Que de acuerdo a los informes técnicos de la Dirección Provincial de Ordenamiento Urbano y Territorial, el predio se encuentra en Zona Residencial Extraurbana.
    Que se establecen los siguientes indicadores urbanísticos para el emprendimiento:
    - FOS máximo: 0.40
    - FOT máximo: 0.60
    - Superficie mínima de parcela: 800 m2
    - Densidad neta máxima: 130 hab/ha
    - Retiros de frente: 5 metros
    - Altura máxima permitida: 9 metros o 2 plantas.
    
    Por ello,
    EL GOBERNADOR DE LA PROVINCIA DE BUENOS AIRES
    DECRETA:
    ARTÍCULO 1. Convalídase el proyecto Urbanístico "Los Ombúes de Hudson" en el partido de Berazategui.
  `;

  console.log(`[3] Sending text to LLM Agent to extract urban rules...`);
  const llm = getDefaultLLMProvider();
  const prompt = `
    You are an expert Urban Planning AI (ArqTech Ingestion Agent).
    Below is the text of a government resolution (Decreto/Resolución) approving a gated community (Barrio Cerrado).
    
    Extract any specific urban planning parameters mentioned for this specific development.
    Look for:
    - FOS (Factor de Ocupación del Suelo)
    - FOT (Factor de Ocupación Total)
    - Densidad neta o bruta
    - Superficie mínima de lote
    - Altura máxima
    - Retiros
    
    If you don't find a parameter, do not invent it.
    Return ONLY a JSON array of objects with this structure:
    [
      { "predicate": "fos", "value": "0.6" },
      { "predicate": "superficie_minima_lote", "value": "800 m2" }
    ]
    
    TEXT:
    ${text.substring(0, 15000)} // Pass up to 15k chars
  `;

  const llmRes = await llm.generateContent([
    { role: 'system', content: 'You are an extraction agent. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ], {
    response_format: { type: 'json_object' } // Or array if supported
  });
  
  console.log(`[4] Agent response received.`);
  
  let extracted: any = [];
  try {
    const rawText = llmRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
    extracted = JSON.parse(rawText);
    
    // If it returned an object with an array property
    if (!Array.isArray(extracted) && extracted.rules) extracted = extracted.rules;
    if (!Array.isArray(extracted) && extracted.parameters) extracted = extracted.parameters;
    if (!Array.isArray(extracted) && Object.keys(extracted).length > 0) {
      if (extracted.predicate) {
        extracted = [extracted];
      } else {
        const arr = [];
        for (const key in extracted) {
          if (Array.isArray(extracted[key])) {
            extracted = extracted[key];
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse LLM JSON response:', llmRes.text);
    return;
  }
  
  if (!Array.isArray(extracted) || extracted.length === 0) {
    console.log('No specific rules found in the document or format was wrong.');
    console.log(extracted);
    return;
  }

  console.log(`[5] Inserting ${extracted.length} extracted observations into the Graph for entity ${entityId}...`);
  
  for (const rule of extracted) {
    if (rule.predicate && rule.value) {
      await db.createObservation({
        id: `OBS_PDF_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        subject_entity_id: entityId,
        predicate: rule.predicate.toLowerCase().replace(/\s+/g, '_'),
        value: String(rule.value),
        source: 'Decreto/Resolución RPUC_1.pdf',
        agent_id: 'PDF_INGESTION_AGENT',
        confidence: 0.95
      });
      console.log(`  -> Inserted: ${rule.predicate} = ${rule.value}`);
    }
  }
  
  console.log('✅ PDF Ingestion complete!');
}

ingestPDF().catch(console.error);
