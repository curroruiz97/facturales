-- Función RPC para obtener el uso de almacenamiento del usuario
-- en el bucket document-pdfs. Los archivos se guardan en {user_id}/...
-- Devuelve el total en bytes.

CREATE OR REPLACE FUNCTION public.get_user_storage_bytes()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum((metadata->>'size')::bigint), 0)
  FROM storage.objects
  WHERE bucket_id = 'document-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_storage_bytes TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_storage_bytes FROM anon;
