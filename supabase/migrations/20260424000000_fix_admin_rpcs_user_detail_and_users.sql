-- Migración: Fix admin_get_user_detail + admin_get_users
-- Fecha: 2026-04-24
-- Problemas arreglados:
--   1. admin_get_user_detail referenciaba columnas 'action' y 'metadata' en access_logs
--      que no existen (schema real: id, user_id, email, ip_address, city, country,
--      user_agent, created_at). Resultado: "ERROR: column action does not exist",
--      el servicio devolvía null y el panel mostraba "Usuario no encontrado".
--   2. admin_get_users leía el plan desde business_info.subscription_plan (puede
--      quedar desincronizado con los cobros reales). Ahora resuelve el plan desde
--      billing_subscriptions (status IN active/trialing/past_due) con fallback.
--   3. invoices_count en ambas RPCs cuenta ahora SOLO facturas emitidas.

-- ===== Fix 1: admin_get_user_detail =====
CREATE OR REPLACE FUNCTION public.admin_get_user_detail(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile JSONB;
  v_subscription JSONB;
  v_stats JSONB;
  v_activity JSONB;
  v_is_admin BOOLEAN;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT row_to_json(t)::jsonb INTO v_profile
  FROM (
    SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
           u.raw_user_meta_data->>'full_name' AS full_name,
           bi.nombre_fiscal, bi.nombre_comercial, bi.nif_cif,
           bi.telefono, bi.ciudad, bi.provincia, bi.pais,
           bi.sector, bi.business_type
    FROM auth.users u
    LEFT JOIN business_info bi ON bi.user_id = u.id
    WHERE u.id = p_target_user_id
  ) t;

  SELECT row_to_json(t)::jsonb INTO v_subscription
  FROM (
    SELECT COALESCE(bs.plan::text, bi.subscription_plan, 'starter') AS plan,
           bs.status, bs.current_period_start, bs.current_period_end,
           bs.cancel_at_period_end, bs.stripe_customer_id
    FROM auth.users u
    LEFT JOIN business_info bi ON bi.user_id = u.id
    LEFT JOIN billing_subscriptions bs ON bs.user_id = u.id AND bs.status IN ('active','trialing','past_due')
    WHERE u.id = p_target_user_id
    ORDER BY bs.updated_at DESC NULLS LAST
    LIMIT 1
  ) t;

  SELECT jsonb_build_object(
    'clients', (SELECT count(*) FROM clientes WHERE user_id = p_target_user_id),
    'invoices', (SELECT count(*) FROM invoices WHERE user_id = p_target_user_id AND status = 'issued'),
    'quotes', (SELECT count(*) FROM quotes WHERE user_id = p_target_user_id AND status = 'issued'),
    'products', (SELECT count(*) FROM productos WHERE user_id = p_target_user_id),
    'transactions', (SELECT count(*) FROM transacciones WHERE user_id = p_target_user_id),
    'invoices_total_amount', COALESCE((SELECT sum(total_amount) FROM invoices WHERE user_id = p_target_user_id AND status = 'issued'), 0)
  ) INTO v_stats;

  -- Actividad reciente desde access_logs (columnas reales: ip_address, city, country, user_agent, created_at)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_activity
  FROM (
    SELECT
      CONCAT('Acceso desde ',
        COALESCE(NULLIF(city, ''), NULLIF(country, ''), COALESCE(ip_address, 'ubicación desconocida'))
      ) AS action,
      created_at,
      jsonb_build_object('ip', ip_address, 'city', city, 'country', country, 'user_agent', user_agent) AS metadata
    FROM access_logs
    WHERE user_id = p_target_user_id
    ORDER BY created_at DESC
    LIMIT 20
  ) t;

  SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) INTO v_is_admin;

  PERFORM _admin_log_action('view_user_detail', 'user', p_target_user_id::text);

  RETURN jsonb_build_object(
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'subscription', COALESCE(v_subscription, jsonb_build_object('plan','starter','status',null)),
    'stats', v_stats,
    'recent_activity', COALESCE(v_activity, '[]'::jsonb),
    'is_admin', v_is_admin
  );
END;
$function$;

-- ===== Fix 2: admin_get_users =====
CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20,
  p_search text DEFAULT ''::text,
  p_plan_filter text DEFAULT ''::text,
  p_sort_by text DEFAULT 'created_at'::text,
  p_sort_dir text DEFAULT 'desc'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_users JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  SELECT count(*) INTO v_total
  FROM auth.users u
  LEFT JOIN business_info bi ON bi.user_id = u.id
  WHERE (p_search = '' OR u.email ILIKE '%' || p_search || '%'
         OR bi.nombre_fiscal ILIKE '%' || p_search || '%')
    AND (p_plan_filter = '' OR
      COALESCE(
        (SELECT bs.plan::text FROM billing_subscriptions bs
          WHERE bs.user_id = u.id AND bs.status IN ('active','trialing','past_due')
          ORDER BY bs.updated_at DESC LIMIT 1),
        bi.subscription_plan,
        'starter'
      ) = p_plan_filter);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_users
  FROM (
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      bi.nombre_fiscal,
      bi.nombre_comercial,
      COALESCE(
        (SELECT bs.plan::text FROM billing_subscriptions bs
          WHERE bs.user_id = u.id AND bs.status IN ('active','trialing','past_due')
          ORDER BY bs.updated_at DESC LIMIT 1),
        bi.subscription_plan,
        'starter'
      ) AS plan,
      (SELECT bs.status::text FROM billing_subscriptions bs
        WHERE bs.user_id = u.id AND bs.status IN ('active','trialing','past_due')
        ORDER BY bs.updated_at DESC LIMIT 1) AS subscription_status,
      (SELECT count(*) FROM clientes c WHERE c.user_id = u.id) AS clients_count,
      (SELECT count(*) FROM invoices i WHERE i.user_id = u.id AND i.status = 'issued') AS invoices_count,
      (SELECT count(*) FROM productos p WHERE p.user_id = u.id) AS products_count
    FROM auth.users u
    LEFT JOIN business_info bi ON bi.user_id = u.id
    WHERE (p_search = '' OR u.email ILIKE '%' || p_search || '%'
           OR bi.nombre_fiscal ILIKE '%' || p_search || '%')
      AND (p_plan_filter = '' OR
        COALESCE(
          (SELECT bs.plan::text FROM billing_subscriptions bs
            WHERE bs.user_id = u.id AND bs.status IN ('active','trialing','past_due')
            ORDER BY bs.updated_at DESC LIMIT 1),
          bi.subscription_plan,
          'starter'
        ) = p_plan_filter)
    ORDER BY
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN u.created_at END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc' THEN u.created_at END ASC,
      CASE WHEN p_sort_by = 'email' AND p_sort_dir = 'asc' THEN u.email END ASC,
      CASE WHEN p_sort_by = 'email' AND p_sort_dir = 'desc' THEN u.email END DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'users', v_users,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(v_total::NUMERIC / p_per_page)
  );
END;
$function$;
