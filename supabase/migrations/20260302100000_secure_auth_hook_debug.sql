-- ============================================================
-- Securizar la tabla auth_hook_debug
--
-- Supabase crea esta tabla automáticamente al activar Custom
-- Access Token Hooks. Por defecto viene con RLS desactivado
-- y permisos completos para anon/authenticated, lo cual es
-- un riesgo de seguridad.
--
-- Esta migración:
-- 1) Activa RLS
-- 2) Revoca todos los permisos de anon y authenticated
-- 3) Solo permite acceso al service_role (backend)
-- ============================================================

-- Solo ejecutar si la tabla existe (Supabase la crea dinámicamente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'auth_hook_debug'
  ) THEN
    -- Activar RLS
    ALTER TABLE public.auth_hook_debug ENABLE ROW LEVEL SECURITY;

    -- Revocar TODOS los permisos de anon y authenticated
    REVOKE ALL ON public.auth_hook_debug FROM anon;
    REVOKE ALL ON public.auth_hook_debug FROM authenticated;

    -- Asegurar que solo service_role y postgres tienen acceso
    GRANT ALL ON public.auth_hook_debug TO service_role;
    GRANT ALL ON public.auth_hook_debug TO postgres;

    RAISE NOTICE 'auth_hook_debug: RLS activado y permisos restringidos';
  ELSE
    RAISE NOTICE 'auth_hook_debug: tabla no encontrada, omitiendo';
  END IF;
END $$;
