-- ============================================================
-- Custom Access Token Hook: Enforce exclusive auth providers
--
-- Rules:
-- 1) If a user was created with 'email', block OAuth token issuance
-- 2) If a user was created with 'google', block password token issuance
--
-- IMPORTANT: After deploying this migration, you must enable the hook
-- in the Supabase Dashboard:
--   Authentication > Hooks > Custom Access Token
--   Select function: public.enforce_exclusive_provider_hook
-- ============================================================

-- Helper function: get auth providers for a user (reads auth.identities)
CREATE OR REPLACE FUNCTION public.get_user_auth_providers(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT provider), ARRAY[]::text[])
  FROM auth.identities
  WHERE user_id = p_user_id;
$$;

-- Grant to supabase_auth_admin so the hook can use it
GRANT EXECUTE ON FUNCTION public.get_user_auth_providers TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.get_user_auth_providers FROM authenticated, anon, public;

-- Custom Access Token Hook
CREATE OR REPLACE FUNCTION public.enforce_exclusive_provider_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_providers text[];
  auth_method text;
  user_uuid uuid;
BEGIN
  user_uuid := (event->>'user_id')::uuid;
  auth_method := trim(both '"' from (event->>'authentication_method'));

  -- Get the user's existing providers
  SELECT public.get_user_auth_providers(user_uuid) INTO user_providers;

  -- If no providers found yet (first login), allow
  IF user_providers IS NULL OR array_length(user_providers, 1) IS NULL THEN
    RETURN event;
  END IF;

  -- Email/password user trying to use OAuth
  IF 'email' = ANY(user_providers) AND NOT ('google' = ANY(user_providers)) THEN
    IF auth_method IN ('oauth', 'oauth_provider/authorization_code') THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'http_code', 403,
          'message', 'Esta cuenta está registrada con correo y contraseña. Inicia sesión con ese método.'
        )
      );
    END IF;
  END IF;

  -- Google user trying to use password/recovery
  IF 'google' = ANY(user_providers) AND NOT ('email' = ANY(user_providers)) THEN
    IF auth_method IN ('password', 'recovery', 'magiclink') THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'http_code', 403,
          'message', 'Esta cuenta es de Google. Inicia sesión con Google.'
        )
      );
    END IF;
  END IF;

  -- Allow all other cases
  RETURN event;
END;
$$;

-- Grant to supabase_auth_admin (required for auth hooks)
GRANT EXECUTE ON FUNCTION public.enforce_exclusive_provider_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.enforce_exclusive_provider_hook FROM authenticated, anon, public;

-- Grant read access on auth.identities to supabase_auth_admin
GRANT SELECT ON TABLE auth.identities TO supabase_auth_admin;
