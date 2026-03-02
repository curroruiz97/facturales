-- Tabla de registro de accesos a la aplicación
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  ip_address TEXT,
  city TEXT,
  country TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at DESC);

-- RLS
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propios registros
CREATE POLICY "Users can view own access logs"
  ON access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios solo pueden insertar sus propios registros
CREATE POLICY "Users can insert own access logs"
  ON access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No se permiten actualizaciones ni eliminaciones (logs inmutables)
