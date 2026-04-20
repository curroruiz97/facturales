-- ============================================
-- ADMIN PANEL — RPCs
-- Adapted for Facturales: business_info, billing_subscriptions,
-- billing_usage, clientes, transacciones, invoices, quotes,
-- productos, access_logs, support_tickets, expense_ocr_log
-- ============================================

-- 1. admin_get_role
CREATE OR REPLACE FUNCTION admin_get_role()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM admin_users WHERE user_id = auth.uid();
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('is_admin', false, 'role', null);
  END IF;
  RETURN jsonb_build_object('is_admin', true, 'role', v_role);
END;
$$;

-- 2. admin_get_overview
CREATE OR REPLACE FUNCTION admin_get_overview()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_users BIGINT;
  v_total_clients BIGINT;
  v_total_invoices BIGINT;
  v_total_quotes BIGINT;
  v_total_products BIGINT;
  v_total_transactions BIGINT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT count(*) INTO v_total_users FROM auth.users;
  SELECT count(*) INTO v_total_clients FROM clientes;
  SELECT count(*) INTO v_total_invoices FROM invoices;
  SELECT count(*) INTO v_total_quotes FROM quotes;
  SELECT count(*) INTO v_total_products FROM productos;
  SELECT count(*) INTO v_total_transactions FROM transacciones;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_clients', v_total_clients,
    'total_invoices', v_total_invoices,
    'total_quotes', v_total_quotes,
    'total_products', v_total_products,
    'total_transactions', v_total_transactions
  );
END;
$$;

-- 3. admin_get_dashboard_metrics
CREATE OR REPLACE FUNCTION admin_get_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_users BIGINT;
  v_active_today BIGINT;
  v_active_week BIGINT;
  v_active_month BIGINT;
  v_new_today BIGINT;
  v_mrr NUMERIC;
  v_arr NUMERIC;
  v_total_invoices BIGINT;
  v_total_quotes BIGINT;
  v_total_clients BIGINT;
  v_total_products BIGINT;
  v_total_transactions BIGINT;
  v_monthly_signups JSONB;
  v_plans_distribution JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT count(*) INTO v_total_users FROM auth.users;
  SELECT count(*) INTO v_new_today FROM auth.users WHERE created_at >= CURRENT_DATE;
  SELECT count(*) INTO v_active_today FROM auth.users WHERE last_sign_in_at >= CURRENT_DATE;
  SELECT count(*) INTO v_active_week FROM auth.users WHERE last_sign_in_at >= (CURRENT_DATE - INTERVAL '7 days');
  SELECT count(*) INTO v_active_month FROM auth.users WHERE last_sign_in_at >= (CURRENT_DATE - INTERVAL '30 days');

  SELECT COALESCE(count(*), 0) INTO v_total_invoices FROM invoices;
  SELECT COALESCE(count(*), 0) INTO v_total_quotes FROM quotes;
  SELECT COALESCE(count(*), 0) INTO v_total_clients FROM clientes;
  SELECT COALESCE(count(*), 0) INTO v_total_products FROM productos;
  SELECT COALESCE(count(*), 0) INTO v_total_transactions FROM transacciones;

  SELECT COALESCE(count(*) * 9.99, 0) INTO v_mrr
  FROM billing_subscriptions WHERE status = 'active';
  v_arr := v_mrr * 12;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_monthly_signups
  FROM (
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
           count(*) AS count
    FROM auth.users
    WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_plans_distribution
  FROM (
    SELECT COALESCE(subscription_plan, 'starter') AS plan, count(*) AS count
    FROM business_info
    GROUP BY COALESCE(subscription_plan, 'starter')
  ) t;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'new_today', v_new_today,
    'active_today', v_active_today,
    'active_week', v_active_week,
    'active_month', v_active_month,
    'mrr', v_mrr,
    'arr', v_arr,
    'total_invoices', v_total_invoices,
    'total_quotes', v_total_quotes,
    'total_clients', v_total_clients,
    'total_products', v_total_products,
    'total_transactions', v_total_transactions,
    'monthly_signups', v_monthly_signups,
    'plans_distribution', v_plans_distribution
  );
END;
$$;

-- 4. admin_get_users
CREATE OR REPLACE FUNCTION admin_get_users(
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 20,
  p_search TEXT DEFAULT '',
  p_plan_filter TEXT DEFAULT '',
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'desc'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    AND (p_plan_filter = '' OR COALESCE(bi.subscription_plan, 'starter') = p_plan_filter);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_users
  FROM (
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      bi.nombre_fiscal,
      bi.nombre_comercial,
      COALESCE(bi.subscription_plan, 'starter') AS plan,
      (SELECT count(*) FROM clientes c WHERE c.user_id = u.id) AS clients_count,
      (SELECT count(*) FROM invoices i WHERE i.user_id = u.id) AS invoices_count,
      (SELECT count(*) FROM productos p WHERE p.user_id = u.id) AS products_count
    FROM auth.users u
    LEFT JOIN business_info bi ON bi.user_id = u.id
    WHERE (p_search = '' OR u.email ILIKE '%' || p_search || '%'
           OR bi.nombre_fiscal ILIKE '%' || p_search || '%')
      AND (p_plan_filter = '' OR COALESCE(bi.subscription_plan, 'starter') = p_plan_filter)
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
$$;

-- 5. admin_get_user_detail
CREATE OR REPLACE FUNCTION admin_get_user_detail(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    SELECT COALESCE(bi.subscription_plan, 'starter') AS plan,
           bs.status, bs.current_period_start, bs.current_period_end,
           bs.cancel_at_period_end, bs.stripe_customer_id
    FROM business_info bi
    LEFT JOIN billing_subscriptions bs ON bs.user_id = bi.user_id AND bs.status = 'active'
    WHERE bi.user_id = p_target_user_id
  ) t;

  SELECT jsonb_build_object(
    'clients', (SELECT count(*) FROM clientes WHERE user_id = p_target_user_id),
    'invoices', (SELECT count(*) FROM invoices WHERE user_id = p_target_user_id),
    'quotes', (SELECT count(*) FROM quotes WHERE user_id = p_target_user_id),
    'products', (SELECT count(*) FROM productos WHERE user_id = p_target_user_id),
    'transactions', (SELECT count(*) FROM transacciones WHERE user_id = p_target_user_id),
    'invoices_total_amount', COALESCE((SELECT sum(total_amount) FROM invoices WHERE user_id = p_target_user_id), 0)
  ) INTO v_stats;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_activity
  FROM (
    SELECT action, created_at, metadata
    FROM access_logs
    WHERE user_id = p_target_user_id
    ORDER BY created_at DESC LIMIT 20
  ) t;

  SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) INTO v_is_admin;

  PERFORM _admin_log_action('view_user_detail', 'user', p_target_user_id::text);

  RETURN jsonb_build_object(
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'subscription', COALESCE(v_subscription, '{}'::jsonb),
    'stats', v_stats,
    'recent_activity', COALESCE(v_activity, '[]'::jsonb),
    'is_admin', v_is_admin
  );
END;
$$;

-- 6. admin_get_revenue_analytics
CREATE OR REPLACE FUNCTION admin_get_revenue_analytics(p_months INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_mrr NUMERIC;
  v_arr NUMERIC;
  v_total_paying BIGINT;
  v_arpu NUMERIC;
  v_by_plan JSONB;
  v_monthly_signups JSONB;
  v_total_users BIGINT;
  v_conversion_rate NUMERIC;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT count(*) INTO v_total_paying FROM billing_subscriptions WHERE status = 'active';
  SELECT count(*) INTO v_total_users FROM auth.users;

  v_mrr := COALESCE(v_total_paying * 9.99, 0);
  v_arr := v_mrr * 12;
  v_arpu := CASE WHEN v_total_paying > 0 THEN v_mrr / v_total_paying ELSE 0 END;
  v_conversion_rate := CASE WHEN v_total_users > 0
    THEN ROUND((v_total_paying::NUMERIC / v_total_users) * 100, 2) ELSE 0 END;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_plan
  FROM (
    SELECT plan, count(*) AS count,
           count(*) * 9.99 AS revenue
    FROM billing_subscriptions WHERE status = 'active'
    GROUP BY plan
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_monthly_signups
  FROM (
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
           count(*) AS count
    FROM auth.users
    WHERE created_at >= (CURRENT_DATE - (p_months || ' months')::INTERVAL)
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  ) t;

  RETURN jsonb_build_object(
    'mrr', v_mrr,
    'arr', v_arr,
    'arpu', v_arpu,
    'total_paying', v_total_paying,
    'total_users', v_total_users,
    'conversion_rate', v_conversion_rate,
    'by_plan', v_by_plan,
    'monthly_signups', v_monthly_signups
  );
END;
$$;

-- 7. admin_get_api_usage
CREATE OR REPLACE FUNCTION admin_get_api_usage(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_daily JSONB;
  v_by_action JSONB;
  v_top_users JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT count(*) INTO v_total
  FROM access_logs WHERE created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_daily
  FROM (
    SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
    FROM access_logs
    WHERE created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
    GROUP BY date_trunc('day', created_at)::date
    ORDER BY day
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_action
  FROM (
    SELECT action, count(*) AS count
    FROM access_logs
    WHERE created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
    GROUP BY action ORDER BY count DESC LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_users
  FROM (
    SELECT al.user_id, u.email, count(*) AS count
    FROM access_logs al
    JOIN auth.users u ON u.id = al.user_id
    WHERE al.created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
    GROUP BY al.user_id, u.email
    ORDER BY count DESC LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'total_calls', v_total,
    'daily_usage', v_daily,
    'by_action', v_by_action,
    'top_users', v_top_users
  );
END;
$$;

-- 8. admin_get_email_analytics (no dedicated email table — use document_email_log)
CREATE OR REPLACE FUNCTION admin_get_email_analytics(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_sent BIGINT;
  v_daily JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT count(*) INTO v_total_sent
  FROM document_email_log WHERE created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_daily
  FROM (
    SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
    FROM document_email_log
    WHERE created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
    GROUP BY date_trunc('day', created_at)::date
    ORDER BY day
  ) t;

  RETURN jsonb_build_object(
    'total_sent', v_total_sent,
    'daily_activity', v_daily,
    'campaigns', '[]'::jsonb,
    'contacts', 0,
    'templates', 0
  );
END;
$$;

-- 9. admin_get_system_health
CREATE OR REPLACE FUNCTION admin_get_system_health()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_db_size TEXT;
  v_connections BIGINT;
  v_users_total BIGINT;
  v_users_active_24h BIGINT;
  v_invoices_total BIGINT;
  v_transactions_total BIGINT;
  v_recent_errors JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT pg_size_pretty(pg_database_size(current_database())) INTO v_db_size;
  SELECT count(*) INTO v_connections FROM pg_stat_activity;
  SELECT count(*) INTO v_users_total FROM auth.users;
  SELECT count(*) INTO v_users_active_24h FROM auth.users WHERE last_sign_in_at >= (now() - INTERVAL '24 hours');
  SELECT count(*) INTO v_invoices_total FROM invoices;
  SELECT count(*) INTO v_transactions_total FROM transacciones;

  v_recent_errors := '[]'::jsonb;

  RETURN jsonb_build_object(
    'database', jsonb_build_object('size', v_db_size, 'connections', v_connections),
    'users', jsonb_build_object('total', v_users_total, 'active_24h', v_users_active_24h),
    'invoices', jsonb_build_object('total', v_invoices_total),
    'transactions', jsonb_build_object('total', v_transactions_total),
    'recent_errors', v_recent_errors,
    'status', 'healthy'
  );
END;
$$;

-- 10. admin_get_system_logs (via access_logs)
CREATE OR REPLACE FUNCTION admin_get_system_logs(
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 25,
  p_operation_filter TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_logs JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  SELECT count(*) INTO v_total
  FROM access_logs
  WHERE (p_operation_filter = '' OR action = p_operation_filter);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_logs
  FROM (
    SELECT al.id, al.user_id, u.email, al.action, al.metadata, al.created_at
    FROM access_logs al
    LEFT JOIN auth.users u ON u.id = al.user_id
    WHERE (p_operation_filter = '' OR al.action = p_operation_filter)
    ORDER BY al.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'logs', v_logs,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(v_total::NUMERIC / p_per_page)
  );
END;
$$;

-- 11. admin_get_audit_logs
CREATE OR REPLACE FUNCTION admin_get_audit_logs(
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 25,
  p_action_filter TEXT DEFAULT '',
  p_search TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_logs JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  SELECT count(*) INTO v_total
  FROM admin_audit_logs al
  LEFT JOIN auth.users u ON u.id = al.admin_user_id
  WHERE (p_action_filter = '' OR al.action = p_action_filter)
    AND (p_search = '' OR u.email ILIKE '%' || p_search || '%');

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_logs
  FROM (
    SELECT al.id, al.admin_user_id, u.email AS admin_email,
           al.action, al.target_type, al.target_id,
           al.metadata, al.created_at
    FROM admin_audit_logs al
    LEFT JOIN auth.users u ON u.id = al.admin_user_id
    WHERE (p_action_filter = '' OR al.action = p_action_filter)
      AND (p_search = '' OR u.email ILIKE '%' || p_search || '%')
    ORDER BY al.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'logs', v_logs,
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(v_total::NUMERIC / p_per_page)
  );
END;
$$;

-- 12. admin_get_feature_flags
CREATE OR REPLACE FUNCTION admin_get_feature_flags()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(ff) ORDER BY ff.created_at DESC), '[]'::jsonb)
    FROM feature_flags ff
  );
END;
$$;

-- 13. admin_get_config
CREATE OR REPLACE FUNCTION admin_get_config()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(sc) ORDER BY sc.category, sc.key), '[]'::jsonb)
    FROM system_config sc
  );
END;
$$;

-- 14. admin_update_subscription
CREATE OR REPLACE FUNCTION admin_update_subscription(
  p_target_user_id UUID,
  p_plan TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  UPDATE business_info SET subscription_plan = p_plan, subscription_updated_at = now()
  WHERE user_id = p_target_user_id;

  PERFORM _admin_log_action('update_subscription', 'user', p_target_user_id::text,
    jsonb_build_object('plan', p_plan));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 15. admin_suspend_user
CREATE OR REPLACE FUNCTION admin_suspend_user(p_target_user_id UUID, p_reason TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  IF is_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'Cannot suspend an admin user';
  END IF;

  UPDATE auth.users SET banned_until = '2999-12-31'::timestamptz WHERE id = p_target_user_id;

  PERFORM _admin_log_action('suspend_user', 'user', p_target_user_id::text,
    jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 16. admin_unsuspend_user
CREATE OR REPLACE FUNCTION admin_unsuspend_user(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  UPDATE auth.users SET banned_until = NULL WHERE id = p_target_user_id;

  PERFORM _admin_log_action('unsuspend_user', 'user', p_target_user_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 17. admin_delete_user
CREATE OR REPLACE FUNCTION admin_delete_user(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  IF is_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'Cannot delete an admin user. Revoke admin first.';
  END IF;

  DELETE FROM transacciones WHERE user_id = p_target_user_id;
  DELETE FROM invoices WHERE user_id = p_target_user_id;
  DELETE FROM quotes WHERE user_id = p_target_user_id;
  DELETE FROM clientes WHERE user_id = p_target_user_id;
  DELETE FROM productos WHERE user_id = p_target_user_id;
  DELETE FROM business_info WHERE user_id = p_target_user_id;
  DELETE FROM billing_subscriptions WHERE user_id = p_target_user_id;

  PERFORM _admin_log_action('delete_user', 'user', p_target_user_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 18. admin_grant_admin
CREATE OR REPLACE FUNCTION admin_grant_admin(p_target_user_id UUID, p_role TEXT DEFAULT 'admin')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT role INTO v_caller_role FROM admin_users WHERE user_id = auth.uid();
  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can grant admin roles';
  END IF;

  INSERT INTO admin_users (user_id, role, granted_by)
  VALUES (p_target_user_id, p_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET role = p_role;

  PERFORM _admin_log_action('grant_admin', 'user', p_target_user_id::text,
    jsonb_build_object('role', p_role));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 19. admin_revoke_admin
CREATE OR REPLACE FUNCTION admin_revoke_admin(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT role INTO v_caller_role FROM admin_users WHERE user_id = auth.uid();
  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can revoke admin roles';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;

  DELETE FROM admin_users WHERE user_id = p_target_user_id;

  PERFORM _admin_log_action('revoke_admin', 'user', p_target_user_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 20. admin_upsert_feature_flag
CREATE OR REPLACE FUNCTION admin_upsert_feature_flag(
  p_key TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_enabled BOOLEAN DEFAULT false,
  p_rollout_percentage INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, created_by, updated_by)
  VALUES (p_key, p_name, p_description, p_enabled, p_rollout_percentage, auth.uid(), auth.uid())
  ON CONFLICT (key) DO UPDATE SET
    name = p_name,
    description = p_description,
    enabled = p_enabled,
    rollout_percentage = p_rollout_percentage,
    updated_by = auth.uid(),
    updated_at = now();

  PERFORM _admin_log_action('upsert_feature_flag', 'feature_flag', p_key,
    jsonb_build_object('enabled', p_enabled, 'rollout', p_rollout_percentage));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 21. admin_delete_feature_flag
CREATE OR REPLACE FUNCTION admin_delete_feature_flag(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  DELETE FROM feature_flags WHERE key = p_key;

  PERFORM _admin_log_action('delete_feature_flag', 'feature_flag', p_key);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 22. admin_update_config
CREATE OR REPLACE FUNCTION admin_update_config(p_key TEXT, p_value JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  UPDATE system_config SET value = p_value, updated_by = auth.uid(), updated_at = now()
  WHERE key = p_key;

  PERFORM _admin_log_action('update_config', 'config', p_key,
    jsonb_build_object('value', p_value));

  RETURN jsonb_build_object('success', true);
END;
$$;
