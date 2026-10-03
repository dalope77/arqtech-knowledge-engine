async function runTest() {
  console.log("=== INICIANDO PRUEBA END-TO-END ===");
  const query = "Quiero saber la información urbanística y regulatoria de un lote en el partido 1. ¿Hay ordenanzas o excepciones vigentes que deba considerar?";
  
  console.log(`\nQuery del usuario: "${query}"`);
  console.log("Llamando a la API de Orquestación...");

  try {
    const response = await fetch('http://localhost:3000/api/agents/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentType: 'ORCHESTRATOR_AGENT',
        input: { query }
      })
    });

    const data = await response.json();
    console.log("\n=== RESPUESTA DEL SISTEMA ===");
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error("Error ejecutando la prueba:", error);
  }
}

runTest().catch(console.error);
