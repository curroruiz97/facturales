-- admin_update_subscription:
--   Antes: solo actualizaba business_info.subscription_plan, que el front-end NO lee
--   para el control de acceso (subscription-status.service lee billing_subscriptions).
--   Resultado: los planes asignados desde el admin nunca se aplicaban de verdad.
--
--   Ahora: ademas de actualizar business_info, hace UPSERT en billing_subscriptions
--   con un marcador sintetico (`admin_manual_<user_id>`) y status='active' para que
--   el usuario acceda al dashboard automaticamente, como si pagase por Stripe.
--   El marcador permite distinguir las filas admin de las de Stripe y actualizarlas
--   idempotentemente cuando el admin cambia el plan otra vez.

CREATE OR REPLACE FUNCTION admin_update_subscription(
  p_target_user_id UUID,
  p_plan TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_marker TEXT := 'admin_manual_' || p_target_user_id::text;
  v_existing_id UUID;
  v_has_business_info BOOLEAN;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  IF p_plan NOT IN ('starter', 'pro', 'business') THEN
    RAISE EXCEPTION 'Invalid plan: %. Must be starter, pro or business.', p_plan;
  END IF;

  -- Espejo en business_info (solo si el usuario ya tiene perfil; no creamos fila vacia)
  SELECT EXISTS(SELECT 1 FROM business_info WHERE user_id = p_target_user_id)
  INTO v_has_business_info;

  IF v_has_business_info THEN
    UPDATE business_info
    SET subscription_plan = p_plan,
        subscription_updated_at = now()
    WHERE user_id = p_target_user_id;
  END IF;

  -- UPSERT de la fila sintetica en billing_subscriptions
  -- (es la tabla que el front-end consulta para decidir si el usuario tiene acceso)
  SELECT id INTO v_existing_id
  FROM billing_subscriptions
  WHERE stripe_subscription_id = v_marker;

  IF v_existing_id IS NOT NULL THEN
    UPDATE billing_subscriptions
    SET plan = p_plan,
        interval = 'yearly',
        status = 'active',
        current_period_start = now(),
        current_period_end = now() + INTERVAL '100 years',
        cancel_at_period_end = false,
        pending_downgrade_plan = NULL,
        pending_downgrade_interval = NULL,
        updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO billing_subscriptions (
      user_id, stripe_customer_id, stripe_subscription_id,
      plan, interval, status,
      current_period_start, current_period_end,
      cancel_at_period_end, created_at, updated_at
    ) VALUES (
      p_target_user_id, v_marker, v_marker,
      p_plan, 'yearly', 'active',
      now(), now() + INTERVAL '100 years',
      false, now(), now()
    );
  END IF;

  PERFORM _admin_log_action('update_subscription', 'user', p_target_user_id::text,
    jsonb_build_object('plan', p_plan, 'method', 'admin_manual'));

  RETURN jsonb_build_object(
    'success', true,
    'plan', p_plan,
    'status', 'active',
    'method', 'admin_manual'
  );
END;
$$;

-- Backfill: para cada usuario con business_info.subscription_plan en ('pro','business')
-- y SIN suscripcion activa en billing_subscriptions, creamos la fila sintetica admin_manual.
-- Asi los usuarios a los que se les asigno plan manualmente antes de este fix
-- recuperan acceso real al dashboard sin intervencion manual.
INSERT INTO billing_subscriptions (
  user_id, stripe_customer_id, stripe_subscription_id,
  plan, interval, status,
  current_period_start, current_period_end,
  cancel_at_period_end, created_at, updated_at
)
SELECT
  bi.user_id,
  'admin_manual_' || bi.user_id::text,
  'admin_manual_' || bi.user_id::text,
  bi.subscription_plan,
  'yearly',
  'active',
  COALESCE(bi.subscription_updated_at, now()),
  now() + INTERVAL '100 years',
  false,
  COALESCE(bi.subscription_updated_at, now()),
  now()
FROM business_info bi
WHERE bi.subscription_plan IN ('pro','business')
  AND NOT EXISTS (
    SELECT 1 FROM billing_subscriptions bs
    WHERE bs.user_id = bi.user_id AND bs.status = 'active'
  )
  AND NOT EXISTS (
    SELECT 1 FROM billing_subscriptions bs
    WHERE bs.stripe_subscription_id = 'admin_manual_' || bi.user_id::text
  );
