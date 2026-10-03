import { getServiceRoleClient } from '../lib/supabase';
import { getDefaultLLMProvider } from '../lib/llm';

async function extractClaims() {
  const supabase = getServiceRoleClient();
  const llm = getDefaultLLMProvider();

  // 1. Get processed normativas (or uploaded)
  const { data: ingestions, error } = await supabase
    .from('file_ingestions')
    .select('*')
    .in('file_type', ['pdf'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching ingestions:", error);
    return;
  }

  console.log(`Found ${ingestions?.length || 0} PDF ingestions to process for claims.`);

  for (const ingestion of ingestions || []) {
    console.log(`\nProcessing: ${ingestion.filename} (${ingestion.id})`);
    
    // Find the chunks in entities table for this ingestion
    const { data: chunks } = await supabase
      .from('entities')
      .select('metadata')
      .eq('type', 'PDF_CHUNK')
      .contains('metadata', { ingestion_id: ingestion.id });

    if (!chunks || chunks.length === 0) {
      console.log(`No text chunks found for ${ingestion.filename}. Make sure it was processed first.`);
      continue;
    }

    let fullText = chunks.map(c => c.metadata.content).join('\n\n');
    if (fullText.length > 20000) fullText = fullText.substring(0, 20000);

    const prompt = `
    You are the ArqTech Legal Extraction Agent.
    Read the following text from an Ordinance/Decree: ${ingestion.filename}
    
    Text snippet:
    """
    ${fullText}
    """
    
    Extract ONLY explicit regulatory relationships:
    1. Derogations (e.g., "Derógase la Ordenanza X")
    2. Modifications (e.g., "Modifícase el artículo Y")
    3. Zoning exceptions (e.g., "Otórgase vía de excepción...")
    
    Return a JSON object containing an array of 'claims':
    {
      "claims": [
        { "statement": "Ordenanza 123 deroga Ordenanza 45", "confidence": 0.9, "metadata": { "target": "Ordenanza 45" } }
      ]
    }
    If no explicit relationships are found, return { "claims": [] }.
    `;

    try {
      const response = await llm.generateContent([
        { role: 'system', content: 'You are an ETL & Legal Ingestion Agent.' },
        { role: 'user', content: prompt }
      ], { response_format: { type: 'json_object' } });

      const text = response.text || '{}';
      const match = text.match(/\{[\s\S]*\}/);
      const cleaned = match ? match[0] : '{}';
      const result = JSON.parse(cleaned);

      if (result.claims && result.claims.length > 0) {
        console.log(`Extracted ${result.claims.length} claims.`);
        
        const claimsToInsert = result.claims.map((c: any) => ({
          id: `claim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          statement: c.statement,
          confidence: c.confidence || 0.8,
          metadata: { ...c.metadata, ingestion_id: ingestion.id, source_file: ingestion.filename },
          agent_id: 'LEGAL_INGESTION_AGENT',
          source: 'LLM_INFERENCE'
        }));

        const { error: insErr } = await supabase.from('claims').insert(claimsToInsert);
        if (insErr) console.error("Error inserting claims:", insErr);
        else console.log("Successfully inserted claims.");
      } else {
        console.log("No relationships found.");
      }

    } catch (e) {
      console.error("Error processing LLM extraction:", e);
    }
  }
}

extractClaims().then(() => console.log('Done.')).catch(console.error);
