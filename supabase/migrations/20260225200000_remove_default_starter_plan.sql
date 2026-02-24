-- Eliminar el default 'starter' de business_info.subscription_plan
-- Un usuario nuevo no debe tener plan hasta que se suscriba vía Stripe.

ALTER TABLE business_info
  ALTER COLUMN subscription_plan DROP DEFAULT;

ALTER TABLE business_info
  ALTER COLUMN subscription_plan SET DEFAULT NULL;

-- Permitir NULL y el valor 'none' además de los planes existentes
ALTER TABLE business_info
  DROP CONSTRAINT IF EXISTS business_info_subscription_plan_check;

ALTER TABLE business_info
  ADD CONSTRAINT business_info_subscription_plan_check
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('none', 'starter', 'pro', 'business'));

-- Usuarios existentes que aún tengan 'starter' sin suscripción real
-- se quedan como están (el subscription guard los redirigirá a subscribe.html
-- porque no tienen fila en billing_subscriptions).
