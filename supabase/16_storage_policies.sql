-- Habilita permisos públicos para el bucket de ingestas

-- 1. Permitir a cualquier usuario anónimo subir archivos al bucket "ingestions"
CREATE POLICY "Allow public uploads to ingestions bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'ingestions');

-- 2. Permitir a cualquier usuario leer archivos
CREATE POLICY "Allow public read of ingestions bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ingestions');

-- 3. Permitir a cualquier usuario borrar archivos (útil para nuestro botón Borrar)
CREATE POLICY "Allow public delete of ingestions bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'ingestions');
