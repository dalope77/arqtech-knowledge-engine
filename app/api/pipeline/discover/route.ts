import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { bbox } = await req.json();
    
    if (!bbox) {
      return NextResponse.json({ error: 'Falta el bounding box' }, { status: 400 });
    }

    console.log(`[API] Ejecutando discovery en bbox: ${bbox}`);
    
    // Ejecutar el script pasándole el bbox como variable de entorno o argumento
    const { stdout, stderr } = await execAsync(`npx tsx --env-file=.env.local scripts/discovery_amba.ts --bbox="${bbox}"`);
    
    return NextResponse.json({ success: true, output: stdout, errorOutput: stderr });
  } catch (error: any) {
    console.error('Discovery Pipeline Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
