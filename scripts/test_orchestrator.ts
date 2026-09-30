import { OrchestratorAgent } from '../lib/agents/orchestrator_agent';

const tests = [
  // MARKET AGENT
  { q: "Hacé un informe de factibilidad para un terreno", expected: "DELEGATE_MARKET" },
  { q: "¿Me conviene armar un edificio de deptos de 2 o 3 ambientes?", expected: "DELEGATE_MARKET" },
  { q: "¿Cuál es la rentabilidad esperada para un desarrollo en zona sur?", expected: "DELEGATE_MARKET" },
  { q: "Quiero un informe de viabilidad financiera", expected: "DELEGATE_MARKET" },
  { q: "¿Cuánto me cuesta construir un edificio de 10 pisos?", expected: "DELEGATE_MARKET" },
  { q: "Estudiame los precios del mercado en Cañuelas", expected: "DELEGATE_MARKET" },
  { q: "¿A cuánto se vende el m2 en La Plata?", expected: "DELEGATE_MARKET" },
  { q: "Haz un estudio de mercado para un barrio cerrado", expected: "DELEGATE_MARKET" },
  { q: "¿Es buen negocio comprar lotes sin subdividir?", expected: "DELEGATE_MARKET" },
  { q: "Recomendame dónde invertir en el Gran Buenos Aires", expected: "DELEGATE_MARKET" },
  { q: "Dame un informe de costos y sellout para 30 unidades", expected: "DELEGATE_MARKET" },
  { q: "¿Cuántos deptos puedo meter en una planta si quiero optimizar el margen?", expected: "DELEGATE_MARKET" },

  // URBAN AGENT
  { q: "¿Qué dice el código urbano sobre el FOS y FOT en esta partida?", expected: "DELEGATE_URBAN" },
  { q: "Buscame barrios irregulares en La Plata", expected: "DELEGATE_URBAN" },
  { q: "¿Este macizo está subdividido según ARBA?", expected: "DELEGATE_URBAN" },
  { q: "Marcame en el mapa los asentamientos que encuentres", expected: "DELEGATE_URBAN" },
  { q: "¿Cuál es la nomenclatura catastral de la calle 7 y 50?", expected: "DELEGATE_URBAN" },
  { q: "Traeme los datos de la parcela 055-Circ-1", expected: "DELEGATE_URBAN" },
  { q: "¿Qué altura máxima me permite construir la normativa en zona U/C1?", expected: "DELEGATE_URBAN" },
  { q: "¿Hay restricciones patrimoniales en el casco urbano?", expected: "DELEGATE_URBAN" },
  { q: "Quiero ver los polígonos de crecimiento satelital", expected: "DELEGATE_URBAN" },
  { q: "Verificame la partida 114-55829 en UrbaSIG", expected: "DELEGATE_URBAN" },
  { q: "¿Qué zonificación tiene este lote?", expected: "DELEGATE_URBAN" },
  { q: "Mostrame las manzanas sin subdividir en la zona sur", expected: "DELEGATE_URBAN" },

  // DATA ANALYST AGENT
  { q: "¿Cuántas parcelas hay registradas en total?", expected: "DELEGATE_DATA" },
  { q: "Haceme una estadística de los barrios por partido", expected: "DELEGATE_DATA" },
  { q: "Agrupame las observaciones de OSM y contá cuántas hay de cada tipo", expected: "DELEGATE_DATA" },
  { q: "¿Cuál es la cantidad de desarrollos informales detectados?", expected: "DELEGATE_DATA" },
  { q: "Contá cuántos nodos hay en el grafo de conocimiento", expected: "DELEGATE_DATA" },
  { q: "¿Cuántos macizos irregulares encontró el pipeline satelital ayer?", expected: "DELEGATE_DATA" },
  { q: "Dime la cantidad exacta de terrenos en venta", expected: "DELEGATE_DATA" },
  { q: "Quiero ver estadísticas de precios promedio agrupados por municipio", expected: "DELEGATE_DATA" },
  { q: "¿Cuántas calles clandestinas mapeaste?", expected: "DELEGATE_DATA" },
  { q: "Generá un recuento de las entidades de tipo BARRIO", expected: "DELEGATE_DATA" },

  // SYNTHESIZE / CONVERSATIONAL
  { q: "Hola, ¿cómo estás?", expected: "SYNTHESIZE" },
  { q: "Gracias por la información", expected: "SYNTHESIZE" },
  { q: "Ok, entiendo", expected: "SYNTHESIZE" },
  { q: "¿Qué agentes tenés disponibles?", expected: "SYNTHESIZE" },
  { q: "Resumime lo que hablamos hasta ahora", expected: "SYNTHESIZE" },
  { q: "Explicame brevemente qué es el FOT", expected: "SYNTHESIZE" },
  { q: "Perfecto, avanzamos con eso", expected: "SYNTHESIZE" },
  { q: "¿Cuál es tu nombre?", expected: "SYNTHESIZE" },
  { q: "Saludos", expected: "SYNTHESIZE" },
  { q: "Contame qué es lo que hacés", expected: "SYNTHESIZE" },

  // EDGE CASES / INSUFFICIENT KNOWLEDGE
  { q: "¿A qué hora juega River Plate hoy?", expected: "INSUFFICIENT_KNOWLEDGE" },
  { q: "¿Cómo se llama el intendente actual de un pueblo en Noruega?", expected: "INSUFFICIENT_KNOWLEDGE" },
  { q: "Dame la receta para hacer una torta de chocolate", expected: "INSUFFICIENT_KNOWLEDGE" },
  { q: "¿Quién ganó el mundial de 1930?", expected: "INSUFFICIENT_KNOWLEDGE" },
  { q: "¿Cuál es el precio del Bitcoin?", expected: "INSUFFICIENT_KNOWLEDGE" },
  { q: "Traducime este texto al ruso", expected: "INSUFFICIENT_KNOWLEDGE" }
];

async function runTests() {
  console.log("🚀 Iniciando Batería de Pruebas: Orchestrator Routing (50 tests concurrentes)");
  const orchestrator = new OrchestratorAgent();
  
  let passed = 0;
  let failed = 0;
  let failedTests = [];

  const chunkSize = 5;
  for (let i = 0; i < tests.length; i += chunkSize) {
    const chunk = tests.slice(i, i + chunkSize);
    const promises = chunk.map(async (test, index) => {
      try {
        const result = await orchestrator.execute({
          runId: `test-${i + index}`,
          objective: 'Test routing',
          input: { query: test.q }
        });
        let action = result.status === 'insufficient_knowledge' ? 'INSUFFICIENT_KNOWLEDGE' : result.output?.action;
        return { test, action, plan: result.output?.plan, error: null };
      } catch (e) {
        return { test, action: 'ERROR', plan: null, error: e };
      }
    });

    const results = await Promise.all(promises);
    
    for (const r of results) {
      if (r.action === r.test.expected) {
        process.stdout.write("✅ ");
        passed++;
      } else {
        process.stdout.write("❌ ");
        failed++;
        failedTests.push({ q: r.test.q, expected: r.test.expected, got: r.action, plan: r.plan });
      }
    }
  }

  console.log(`\n\n📊 Resultados: ${passed} exitosos, ${failed} fallidos.`);
  
  if (failed > 0) {
    console.log("\n⚠️ Detalles de fallos:");
    failedTests.forEach(f => {
      console.log(` - Q: "${f.q}"\n   Esperaba: ${f.expected} | Obtuvo: ${f.got}\n   LLM Plan: ${f.plan || 'N/A'}\n`);
    });
  } else {
    console.log("\n🏆 ¡El Orquestador enruta perfectamente el 100% de las consultas!");
  }
}

runTests();
