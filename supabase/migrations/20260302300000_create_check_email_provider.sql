-- Función RPC para verificar el provider de un email antes de enviar
-- un reset de contraseña. Devuelve 'google', 'email', o 'none'.
-- No expone datos sensibles: solo el tipo de provider.
-- Accesible por anon (necesario desde la pantalla de login sin sesión).

CREATE OR REPLACE FUNCTION public.check_email_provider(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_provider TEXT;
BEGIN
  -- Buscar en auth.identities el provider asociado a este email
  SELECT i.provider INTO found_provider
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;

  IF found_provider IS NULL THEN
    RETURN 'none';
  END IF;

  RETURN found_provider;
END;
$$;

-- Permitir a anon y authenticated llamar esta función
-- (se usa desde la pantalla de login, donde no hay sesión)
GRANT EXECUTE ON FUNCTION public.check_email_provider TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_provider TO authenticated;
