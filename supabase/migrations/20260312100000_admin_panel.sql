-- ============================================
-- ADMIN PANEL — Tables & Core Functions
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to admin_users" ON admin_users FOR ALL USING (false);

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION _admin_log_action(
  p_action TEXT, p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_metadata);
END;
$$;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to admin_audit_logs" ON admin_audit_logs FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  target_users UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to feature_flags" ON feature_flags FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('api_limits','email_limits','features','thresholds','general')),
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to system_config" ON system_config FOR ALL USING (false);

INSERT INTO system_config (key, value, category, description) VALUES
  ('api_rate_limit_per_minute', '60'::jsonb, 'api_limits', 'Max API requests per minute per user'),
  ('api_daily_limit', '10000'::jsonb, 'api_limits', 'Max API requests per day per user'),
  ('session_timeout_minutes', '480'::jsonb, 'thresholds', 'Session timeout in minutes')
ON CONFLICT (key) DO NOTHING;

INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
  ('new_dashboard', 'Nuevo Dashboard', 'Interfaz rediseñada del dashboard', false, 0),
  ('beta_features', 'Beta Features', 'Funcionalidades experimentales', false, 0),
  ('advanced_reports', 'Reportes Avanzados', 'Generador de reportes avanzado', false, 0)
ON CONFLICT (key) DO NOTHING;
