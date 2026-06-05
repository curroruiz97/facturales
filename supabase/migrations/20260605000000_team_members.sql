-- Migración: equipo real (multiusuario, KD §1.1)
-- Fecha: 2026-06-05
-- Sustituye el almacenamiento en localStorage (falso, ni persiste ni aísla) por una tabla real
-- con RLS acotada al titular de la cuenta.
--
-- Alcance de esta fase (Gestión de equipo real):
--  - El TITULAR (owner_user_id) crea/lista/edita/revoca a los miembros de su equipo.
--  - Cada miembro es una invitación por email con rol; al registrarse con ese email, queda vinculado.
--  - NO se comparte todavía el acceso a los datos del titular (facturas/clientes). Esa "fase profunda"
--    requiere reescribir el RLS de todas las tablas y se abordará por separado, con pruebas.

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Titular de la cuenta (quien invita). CASCADE: si se borra el titular, se borra su equipo.
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'gestor' CHECK (role IN ('propietario', 'gestor', 'lector')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  -- Se rellena cuando el invitado se registra/vincula con ese email (SET NULL si se borra su usuario).
  member_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un email solo puede estar una vez en el equipo de un mismo titular.
  CONSTRAINT team_members_owner_email_uniq UNIQUE (owner_user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_owner ON public.team_members (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON public.team_members (member_user_id);

-- =====================================================
-- RLS: el titular gestiona su equipo; el miembro puede ver su propia membresía
-- =====================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- El titular ve y gestiona (CRUD) únicamente las filas de su propio equipo.
CREATE POLICY "Titular gestiona su equipo (select)"
  ON public.team_members FOR SELECT
  USING (owner_user_id = auth.uid());
CREATE POLICY "Titular gestiona su equipo (insert)"
  ON public.team_members FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Titular gestiona su equipo (update)"
  ON public.team_members FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Titular gestiona su equipo (delete)"
  ON public.team_members FOR DELETE
  USING (owner_user_id = auth.uid());

-- Un miembro (ya vinculado) puede LEER las membresías que le apuntan (saber a qué cuenta pertenece).
CREATE POLICY "Miembro ve su propia membresia"
  ON public.team_members FOR SELECT
  USING (member_user_id = auth.uid());

-- Endurecimiento de grants (coherente con harden_function_grants): anon no toca esta tabla.
REVOKE ALL ON public.team_members FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;

-- =====================================================
-- Vinculación de invitaciones: el miembro reclama (por su propio email) las invitaciones pendientes
-- =====================================================
CREATE OR REPLACE FUNCTION public.claim_team_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed INTEGER;
  uid UUID := auth.uid();
  mail TEXT := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF uid IS NULL OR mail = '' THEN
    RETURN 0;
  END IF;
  UPDATE public.team_members
     SET member_user_id = uid,
         status = 'active',
         activated_at = NOW()
   WHERE lower(email) = mail
     AND member_user_id IS NULL
     AND status <> 'revoked';
  GET DIAGNOSTICS claimed = ROW_COUNT;
  RETURN claimed;
END;
$$;

-- Solo un usuario autenticado puede reclamar (y solo vincula invitaciones de su propio email).
REVOKE ALL ON FUNCTION public.claim_team_invitations() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_team_invitations() TO authenticated;

COMMENT ON TABLE public.team_members IS
  'Equipo de la cuenta (multiusuario KD §1.1). El titular (owner_user_id) gestiona invitaciones por email con rol; RLS acotada al titular. El acceso compartido a los datos del titular es una fase posterior.';
