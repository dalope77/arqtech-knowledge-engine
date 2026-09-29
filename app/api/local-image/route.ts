import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');
  
  if (!filename) {
    return new NextResponse('No file specified', { status: 400 });
  }

  // Look for the file in the public directory
  const filePath = path.join(process.cwd(), 'public', filename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse(`File not found: ${filename}`, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
