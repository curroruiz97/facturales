ALTER TABLE business_info ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'pro', 'business'));
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS subscription_interval TEXT DEFAULT 'monthly' CHECK (subscription_interval IN ('monthly', 'yearly'));
ALTER TABLE business_info ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMPTZ DEFAULT NULL;
