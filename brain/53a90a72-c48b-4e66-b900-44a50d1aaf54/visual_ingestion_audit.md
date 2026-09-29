# Auditoría Técnica y Propuesta Arquitectónica: Visual Ingestion Agent en ArqTech

En respuesta a la necesidad de transformar información visual (planos, mapas, tablas, procesos) en **conocimiento estructurado, trazable y reutilizable**, presento la auditoría del estado actual de ArqTech y la propuesta de integración del *Visual Ingestion Agent*.

La premisa central de esta arquitectura es **la modularidad y la trazabilidad epistemológica**: un píxel debe poder rastrearse desde la imagen original hasta el claim validado por el orquestador. No acoplaremos el sistema a YOLO ni a ningún modelo único, sino que definiremos *Visual Pipelines* especializados.

---

## A. Qué ya existe en ArqTech

Revisando el repositorio actual y los esquemas de bases de datos (`types/index.ts`, `lib/agents/`):
*   **Knowledge Fabric Base:** Existen `Entities`, `Observations`, `Relations` y `Hypotheses`.
*   **Procesamiento de Documentos:** Existe un modelo básico para `Document` y `DocumentChunk` orientado a texto (RAG clásico) y un `IngestionAgent` que mapea esquemas SQL a EAV, pero carece de pipelines visuales.
*   **Evidencia y Trazabilidad:** La entidad `Observation` soporta trazabilidad básica (`source`, `source_document`, `source_location`, `evidence`, `confidence`, `status`). 
*   **Agent Runs y Eventos:** Contamos con `AgentRun` para rastrear ejecuciones y `Event` para la memoria de eventos.
*   **Niveles Epistemológicos:** El sistema maneja rudimentos de epistemología con `status: 'active' | 'superseded' | 'invalidated'` en `Observation` y `ClaimValidator` en los loops de chat, además de la entidad `Hypothesis`.
*   **Discovery Engine / Context Builder:** Existe un `ContextBuilder` escalable y un scope paramétrico (`KnowledgeScope`).

## B. Qué puede reutilizarse

*   **`Observation` y `Relation`**: Pueden absorber la información extraída de los intérpretes visuales. El campo `source_location` puede evolucionar (o sobrecargarse mediante JSON) para guardar los Bounding Boxes (`bbox`).
*   **`Claim` y `ClaimValidator`**: Pueden usarse para el Human-in-the-Loop o para cruzar la inferencia visual con normativas de texto.
*   **`Hypothesis`**: Es el contenedor perfecto para cuando el *Map Interpreter* cree detectar una correlación espacial pero la confianza visual sea media.
*   **`AgentRun`**: Documentará qué pipeline visual y versión de modelo generó la observación.
*   **BaseAgent / Orchestrator**: El flujo de ejecución es reutilizable para orquestar la delegación a pipelines visuales especializados.

## C. Qué falta (Componentes Inexistentes)

*   **Visual Classifier & Object Detectors**: Faltan los conectores a modelos de visión (ej. adaptadores para YOLO, VLMs como Claude 3.5 Sonnet / GPT-4o, o motores OCR avanzados como **docTR** de Mindee para extracción geométrica de texto).
*   **Pipeline Routers Visuales**: Falta la lógica que tome el output del *Classifier* y despache la imagen al *Map Agent*, *Table Agent*, etc.
*   **Intérpretes Especializados**: No existen las reglas ni las lógicas de reconstrucción para extraer entidades desde geometrías de CAD/PDF (Map Interpreter) ni para reconstruir tablas y procesos.
*   **Object Storage**: El código no revela un servicio centralizado de almacenamiento de *assets* (imágenes recortadas, páginas rasterizadas) vinculado a Supabase Storage / S3.
*   **Visual Evidence Schema**: Falta un modelo que registre de manera estandarizada las coordenadas espaciales dentro de un plano 2D de la imagen (Bounding Boxes) acopladas a la entidad documental.

## D. Qué está conceptualmente mal (Fricciones Arquitectónicas)

*   **Sobrecarga del modelo RAG**: Actualmente, los documentos se parten ciegamente en `DocumentChunk` (probablemente texto). Aplicar esto a un PDF con planos destruirá el contexto espacial y visual.
*   **Falta de `VisualAsset` / `Region`**: La trazabilidad actual en `Observation` se basa en strings (`source_document`, `source_location`). Guardar un Bounding Box o metadata compleja en un string rompe la estructurabilidad. Debería formalizarse un `Evidence` de tipo visual.
*   **Unicidad del Agente de Ingesta**: Actualmente `IngestionAgent` asume entradas de bases de datos tabulares (`externalDataSchema`). Asumir que existe un único modelo de entrada choca con la naturaleza caótica de los PDFs municipales.

## E. Análisis de Riesgos

*   **Costo Computacional y Económico**: Procesar VLMs (ej. GPT-4V) por cada página de un PDF gigante puede disparar los costos exponencialmente. **Mitigación:** Clasificadores ligeros locales (YOLOv8, ResNet) para decidir si vale la pena enviar la región al VLM caro.
*   **Falsos Positivos y Alucinaciones (VLM)**: Los modelos visuales inventan números o relaciones espaciales inexistentes (especialmente en planos). **Mitigación:** Uso estricto de OCR determinista validado contra VLM, priorizando `Hypothesis` antes que `Observation`.
*   **Duplicación de Imágenes**: Extraer regiones genera almacenamiento redundante. **Mitigación:** Guardar solo la imagen original de la página y registrar coordenadas lógicas (`bbox`), renderizando al vuelo en frontend si es necesario.
*   **Perdida de Trazabilidad / "Black Box"**: Si pasamos todo el plano a un modelo multimodal y este devuelve un JSON, no sabremos de qué píxel sacó el FOT. **Mitigación:** Obligar al intérprete a devolver coordenadas `[x, y, w, h]` por cada *Claim* o rechazar el output.

---

## F. Arquitectura Propuesta (El Flujo Visual)

```text
1. UPLOAD (PDF / Img)
       ↓
2. DOCUMENT INGESTION (Rasterizado de páginas, guardado en Object Storage)
       ↓
3. PAGE ANALYSIS & VISUAL CLASSIFICATION (Agente ligero / Clasificador local)
       ├── Clasifica regiones: TABLA (0.96), MAPA (0.90), TEXTO (0.99)
       └── Genera VisualRegions (Coordenadas)
       ↓
4. ROUTER / PIPELINE DISPATCHER
       ├── Region TABLA  → Table Agent (OCR Estructural)
       ├── Region MAPA   → Map Agent (Segmentación / Geometría)
       ├── Region PLANO  → Plan Agent (Cotas, Usos)
       └── Region DIAGR. → Process Agent (Nodos, Edges)
       ↓
5. SPECIALIZED INTERPRETERS (Generan Raw Claims con Confidence visual y semántico)
       ↓
6. EVIDENCE & EPISTEMOLOGY ENGINE
       ├── Confidence alto (>0.90) → Crea OBSERVATION (estado: active)
       ├── Confidence medio (0.7-0.9) → Crea HYPOTHESIS (requiere validación)
       └── Confidence bajo (<0.7) → Envía a HUMAN REVIEW QUEUE
       ↓
7. KNOWLEDGE FABRIC (Almacenamiento)
       ├── Imágenes y Recortes → Object Storage
       ├── Tablas              → Structured Data DB
       ├── Relaciones / Hechos → Knowledge Graph (Entities / Relations)
       └── Textos Visuales     → Vector Memory (Embeddings)
       ↓
8. DISCOVERY ENGINE (Consume las nuevas relaciones independientemente de su origen)
```

## G. Cambios al Modelo de Datos (Minimizados)

No debemos duplicar el Grafo, sino **enriquecer la capa Documental y la Evidencia**.

1.  **Nuevo Tipo `DocumentAsset`** (Para guardar la referencia al archivo físico/página):
    ```typescript
    export interface DocumentAsset {
      id: string;
      document_id: string;
      asset_type: 'page_image' | 'extracted_region';
      page_number: number;
      storage_path: string; // URL al Object Storage
      resolution: { width: number, height: number };
    }
    ```
2.  **Extensión del Sistema de Evidencia** (Actualizar cómo las `Observation` apuntan a la fuente):
    ```typescript
    export interface VisualEvidence {
      asset_id: string; // ID del DocumentAsset
      bbox: [number, number, number, number]; // [x, y, w, h]
      extraction_method: 'YOLO_v8' | 'OCR_Tesseract' | 'VLM_GPT4o' | 'Table_Transformer';
      confidence_metrics: {
        detection: number;
        ocr?: number;
        semantic_interpretation?: number;
      };
    }
    
    // En types/index.ts: actualizar Observation y Claim
    // Agregar `visual_evidence?: VisualEvidence` a las interfaces existentes.
    ```
3.  **Epistemología (Ampliación implícita)**:
    Las `Observations` ya cuentan con `status` y `confidence`. Las interpretaciones visuales dudosas se insertarán directamente como entidades de tipo `HIPOTESIS` utilizando el modelo existente de `Hypothesis`.

4.  **Sistema de Etiquetado (NUEVO)**:
    Para soportar el entrenamiento continuo, necesitamos estructuras de taxonomía y anotación.
    ```typescript
    export interface VisualTaxonomy {
      id: string;
      category: 'PLANO' | 'MAPA' | 'PROCESO' | 'GENERAL';
      label: string; // ej. "COTA", "ROTULO", "AMBIENTE", "ACCION"
      description?: string;
    }

    export interface VisualAnnotation {
      id: string;
      asset_id: string;
      taxonomy_id: string;
      bbox: [number, number, number, number];
      value?: string; // Texto opcional transcrito por el humano
      created_by: string; // ID del usuario humano o revisor
      created_at: string;
      used_in_training: boolean; // Flag para exportación de datasets
    }
    ```

## H. Estrategia de Tests

Para certificar que el agente transforma píxeles en conocimiento y retiene la trazabilidad:

1.  **Test de Clasificación Mixta**: Inyectar una página PDF que contenga texto, un cuadro y un plano. Afirmar que el *Visual Classifier* detecta 3 regiones distintas con `bbox` válidos sin solaparse destructivamente.
2.  **Test de Trazabilidad Absoluta**: Mockear una extracción de una *Tabla de FOS/FOT*. Afirmar que la `Observation` generada (ej. "ZONA_R2 -> tiene FOS -> 0.6") contiene el objeto `VisualEvidence` donde `bbox` corresponde estrictamente a la celda original, y el `extraction_method` corresponde al modelo usado.
3.  **Test Anti-Alucinación (Epistemológico)**: Entregar un mapa borroso al agente. Afirmar que, debido a la baja confianza del modelo, el sistema NO crea una `Observation`, sino que genera una `Hypothesis` o enruta el asset a la *Human Review Queue*.
4.  **Test de Ingesta Idempotente**: Subir el mismo plano arquitectónico dos veces. Comprobar que el grafo no duplica entidades ni observaciones (resolución de entidades).
5.  **Test de Destilación Estructural**: Entregar un Diagrama de Flujo municipal. Afirmar que el sistema genera una cadena de `Entities` (tipo Evento/Proceso) conectadas por `Relations` ("REQUIERE", "PRODUCE"), abandonando el formato visual pero manteniendo la referencia al nodo origen.

---

## I. Sistema de Anotación y Entrenamiento Continuo (Active Learning)

Para lograr que los modelos de visión (como YOLO o LayoutLM) mejoren con el tiempo y reconozcan estructuras específicas de arquitectura y urbanismo, el sistema debe incluir una interfaz y estructura de **Data Labeling**.

1.  **Taxonomía Dinámica:** El usuario podrá definir categorías y etiquetas específicas según el dominio.
    *   *Planos:* "COTA", "ROTULO", "AMBIENTE", "MURO_CARGA", "PUERTA".
    *   *Mapas:* "MANZANA", "PARCELA", "CALLE", "ZONIFICACION", "LEYENDA".
    *   *Procesos:* "ACCION", "DECISION", "DICTAMEN".
2.  **Interfaz Human-in-the-Loop (HITL):** Cuando el modelo arroje una confianza baja o falle en detectar una región, el usuario podrá trazar manualmente el Bounding Box (caja delimitadora) sobre la imagen y asignarle una etiqueta de la taxonomía.
3.  **Exportación Automática (Dataset Generation):** Las anotaciones manuales (`VisualAnnotation`) se almacenarán vinculadas a las imágenes originales. El sistema podrá exportar automáticamente estos datasets anotados en formatos estándar (como YOLO txt o COCO JSON) para reentrenar o hacer fine-tuning a los modelos locales, cerrando así el ciclo de aprendizaje continuo.

---

## J. Plan de Implementación por Fases

Para integrar orgánicamente el Visual Ingestion Agent sin romper la estructura actual del Knowledge Fabric, propongo las siguientes fases de desarrollo:

### Fase 1: Cimientos y Modelos de Datos (Semana 1)
*   **Objetivo:** Preparar la base de datos y los tipos TypeScript sin tocar la lógica de los agentes.
*   **Tareas:**
    *   Crear migraciones SQL para `DocumentAsset`, `VisualTaxonomy` y `VisualAnnotation`.
    *   Actualizar `types/index.ts` con las interfaces `VisualEvidence` acopladas a `Observation`.
    *   Implementar repositorios en `lib/db.ts` para crear y leer estos assets.

### Fase 2: Infraestructura y Ruteador Visual Básico (Semana 2)
*   **Objetivo:** Permitir que un documento sea subido, sus páginas rasterizadas a imágenes (Object Storage), y enrutadas.
*   **Tareas:**
    *   Crear `lib/agents/visual_ingestion_agent.ts` (solo como coordinador).
    *   Implementar un `MockClassifier` que devuelva regiones estáticas para testear el flujo.
    *   Integrar con Supabase Storage (Subida de imágenes).

### Fase 3: Intérpretes Especializados (Table & Plan Agents) (Semanas 3-4)
*   **Objetivo:** Empezar a extraer conocimiento real de las regiones.
*   **Tareas:**
    *   Crear `TableAgent` usando un VLM ligero o motor de extracción estructural.
    *   Crear `PlanAgent` (enfocado en detectar áreas y cotas).
    *   Conectar el output de estos agentes a la creación de `Observations` con `VisualEvidence`.

### Fase 4: Bucle de Anotación y Human-in-the-Loop (Semana 5)
*   **Objetivo:** Interfaz gráfica para que el humano asista al agente.
*   **Tareas:**
    *   Construir un componente UI (Canvas) en el dashboard de Next.js donde se pueda dibujar un `bbox`.
    *   Guardar la anotación humana directamente en la tabla `VisualAnnotation`.
    *   Crear un script de exportación para empaquetar anotaciones en formato COCO/YOLO.

---
**Conclusión Arquitectónica Final:** 
La arquitectura actual de ArqTech basada en *KnowledgeScope* y entidades abstractas es **sumamente robusta** para soportar este flujo. El principal desafío técnico será orquestar los *Pipelines Routers* para evitar el envío de PDFs en masa a modelos costosos, utilizando clasificadores locales livianos en el primer nodo del embudo (Page Analysis) y delegando la interpretación profunda a Agentes Especializados, mientras un sistema de Etiquetado permite al usuario entrenar la precisión visual del sistema día a día.
