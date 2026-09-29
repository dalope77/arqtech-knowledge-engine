import fs from 'fs';
import path from 'path';
import ClientPage from './ClientPage';

export default async function VisualServerPage() {
  // Read images directly from the filesystem on the server to completely bypass Next.js static serving bugs
  const publicDir = path.join(process.cwd(), 'public');
  const files = fs.readdirSync(publicDir).filter(file => file.endsWith('.png'));

  const images = files.map(file => {
    const filePath = path.join(publicDir, file);
    const base64Data = fs.readFileSync(filePath, 'base64');
    return {
      name: file,
      dataUri: `data:image/png;base64,${base64Data}`
    };
  });

  return <ClientPage images={images} />;
}
