-- Columna para almacenar un downgrade programado (se aplica al final del periodo)
ALTER TABLE billing_subscriptions
  ADD COLUMN IF NOT EXISTS pending_downgrade_plan TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pending_downgrade_interval TEXT DEFAULT NULL;
