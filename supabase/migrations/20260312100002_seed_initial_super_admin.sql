-- ============================================
-- ADMIN PANEL - Seed initial super admin
-- ============================================

DO $$
DECLARE
  v_first_user_id UUID;
BEGIN
  -- Seed only when there are no admin users yet.
  IF EXISTS (SELECT 1 FROM admin_users) THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_first_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_first_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO admin_users (user_id, role)
  VALUES (v_first_user_id, 'super_admin')
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;
END;
$$;