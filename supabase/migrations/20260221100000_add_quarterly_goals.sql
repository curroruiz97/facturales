-- Columnas de objetivos trimestrales en business_info
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS income_goal_q1 NUMERIC(12,2) DEFAULT NULL;
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS income_goal_q2 NUMERIC(12,2) DEFAULT NULL;
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS income_goal_q3 NUMERIC(12,2) DEFAULT NULL;
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS income_goal_q4 NUMERIC(12,2) DEFAULT NULL;
