-- Migración: RPCs para stats por plan y restablecer a defaults
-- Fecha: 2026-04-25
-- Permite al panel /admin/plans mostrar suscripciones activas, MRR estimado,
-- y restablecer cualquier plan a sus valores por defecto con un clic.

CREATE OR REPLACE FUNCTION public.admin_get_plan_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      c.id AS plan_id,
      c.label,
      c.monthly_price,
      c.yearly_price,
      (SELECT count(*) FROM billing_subscriptions bs
        WHERE bs.plan::text = c.id AND bs.status IN ('active','trialing','past_due')) AS active_count,
      (SELECT count(*) FROM billing_subscriptions bs
        WHERE bs.plan::text = c.id AND bs.status = 'trialing') AS trialing_count,
      (SELECT count(*) FROM billing_subscriptions bs
        WHERE bs.plan::text = c.id AND bs.status = 'canceled') AS canceled_count,
      (SELECT COALESCE(SUM(
        CASE WHEN bs.interval = 'yearly' THEN c.yearly_price ELSE c.monthly_price END
      ), 0) FROM billing_subscriptions bs
        WHERE bs.plan::text = c.id AND bs.status = 'active') AS mrr_estimate
    FROM subscription_plan_configs c
    ORDER BY c.display_order
  ) t;

  RETURN jsonb_build_object('plans', v_result);
END;
$function$;

GRANT EXECUTE ON FUNCTION admin_get_plan_stats TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reset_plan_config(p_id TEXT)
 RETURNS VOID
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM admin_users WHERE user_id = auth.uid() LIMIT 1;
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: solo administradores pueden restablecer planes';
  END IF;

  IF p_id = 'starter' THEN
    UPDATE subscription_plan_configs SET
      label='Starter', tagline='Para empezar a facturar.', badge=NULL,
      monthly_price=6.45, yearly_price=4.95,
      features='["Hasta 10 clientes","1 usuario","Hasta 30 productos","10 facturas / mes","Escaneado: 10 docs/mes","Soporte por email"]'::jsonb
    WHERE id='starter';
  ELSIF p_id = 'pro' THEN
    UPDATE subscription_plan_configs SET
      label='Pro', tagline='Para profesionales y autónomos activos.', badge='Más popular',
      monthly_price=11.95, yearly_price=8.95,
      features='["Hasta 150 clientes","Hasta 3 usuarios","Hasta 150 productos","Facturas ilimitadas","Escaneado: 75 docs/mes","Soporte por chat y email"]'::jsonb
    WHERE id='pro';
  ELSIF p_id = 'business' THEN
    UPDATE subscription_plan_configs SET
      label='Ilimitado', tagline='Equipos, asesorías y alto volumen.', badge=NULL,
      monthly_price=23.95, yearly_price=17.95,
      features='["Clientes ilimitados","Usuarios ilimitados","Productos ilimitados","Facturas ilimitadas","Escaneado: 300 docs/mes","Soporte prioritario (chat, email y teléfono)"]'::jsonb
    WHERE id='business';
  ELSE
    RAISE EXCEPTION 'Plan id inválido: %', p_id;
  END IF;

  INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'reset_plan_config', 'plan', p_id, '{}'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION admin_reset_plan_config TO authenticated;
