# ArqTech Knowledge Engine 🧠

Prototipo funcional de un "Knowledge Acquisition Engine" basado en agentes especializados para ArqTech. 
Este proyecto no es un chatbot tradicional, sino un motor autónomo donde agentes con LLM adquieren, estructuran y vinculan información para construir progresivamente un **Grafo de Conocimiento** (Knowledge Graph) "append-only".

## 🚀 Arquitectura

El proyecto está diseñado de forma modular y _serverless_ para un despliegue directo en **Vercel** + **Supabase**:

- **Motor Central (Next.js App Router)**: Provee endpoints de API y el Dashboard UI.
- **Agentes (lib/agents)**: Agentes especializados (ej. `ParcelAgent`) que reciben un objetivo, evalúan información y ejecutan llamadas estructuradas al Grafo.
- **Tools (lib/tools)**: Interfaz controlada que usan los agentes para `consultEntity`, `discoverEntity`, `linkEntities` y `recordObservation`. Estas tools automáticamente registran eventos en el sistema.
- **Discovery Engine (lib/discovery)**: Un motor asíncrono diseñado para buscar patrones simples en el grafo (ej. relaciones inferidas) y emitir "Hipótesis".
- **Storage (Supabase/PostgreSQL)**: Diseño relacional preparado para vectorización (pgvector). La información no se sobrescribe, creando un histórico perfecto (provenance).

## 🛠️ Instalación Local

1. Instala las dependencias:
```bash
npm install
```

2. Configura las variables de entorno. Copia `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

3. Completa `.env.local` con tus credenciales de Supabase y tu API Key del LLM.

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000/dashboard](http://localhost:3000/dashboard) con tu navegador. Si no posees llaves, el sistema usa un `MockLLMProvider` interno para que la interfaz siga siendo 100% funcional.

## 🗄️ Base de Datos (Supabase)

Para inicializar la base de datos, debes ejecutar el script SQL de migración incluido:

1. Ingresa al panel SQL Editor de Supabase.
2. Copia y ejecuta el contenido del archivo `supabase/migrations/0000_initial_schema.sql`.
3. Esto creará las tablas: `entities`, `relations`, `observations`, `events`, `agent_runs` y `hypotheses`.

## 🤖 Creación de un Agente Nuevo

Para crear un nuevo agente:
1. Crea una clase que extienda de `BaseAgent` en `lib/agents/`.
2. Implementa el método `execute(context: AgentContext)`.
3. Llama a `this.tools.discoverEntity()` u otras tools dentro de tu lógica.
4. Regístralo en el endpoint `app/api/agents/run/route.ts` y en el Dashboard de Runs.

## ☁️ Despliegue en Vercel

Este proyecto está optimizado para **Vercel**:

1. Sube este repositorio a GitHub.
2. En el panel de Vercel, crea un nuevo proyecto e importa tu repositorio.
3. En la sección **Environment Variables**, asegúrate de agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LLM_API_KEY`
4. Presiona **Deploy**. 

El framework Next.js será detectado automáticamente. En minutos, tu Knowledge Engine estará en producción.
