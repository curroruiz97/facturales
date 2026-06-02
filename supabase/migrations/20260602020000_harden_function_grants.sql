-- Migración: endurecer permisos de funciones (hallazgo P1-5)
-- Fecha: 2026-06-02
--
-- 1) Revocar EXECUTE a PUBLIC (anon) en funciones SECURITY DEFINER sensibles y concederlo solo a
--    'authenticated'. Las funciones admin ya comprueban is_admin() internamente; esto es defensa en
--    profundidad: un usuario NO autenticado no debe poder ni invocarlas.
--    NO se toca check_email_provider (necesaria en el login, pre-auth) ni los hooks de auth
--    (enforce_exclusive_provider_hook / get_user_auth_providers, ya restringidos a supabase_auth_admin).
-- 2) Fijar search_path en funciones SECURITY INVOKER (trigger/helper) que lo tenían mutable.

-- ── 1) SECURITY DEFINER: revocar a PUBLIC, conceder a authenticated ──
REVOKE EXECUTE ON FUNCTION public._admin_log_action(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._admin_log_action(text, text, text, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_feature_flag(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_feature_flag(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_api_usage(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_api_usage(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_audit_logs(integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_logs(integer, integer, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_config() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_metrics() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_email_analytics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_email_analytics(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_feature_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_feature_flags() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_overview() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_plan_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_plan_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_revenue_analytics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_analytics(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_role() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_system_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_system_health() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_system_logs(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_system_logs(integer, integer, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_users(integer, integer, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_users(integer, integer, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_grant_admin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_admin(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_plan_config(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_plan_config(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_config(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_config(text, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_subscription(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_feature_flag(text, text, text, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_feature_flag(text, text, text, boolean, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_plan_config(text, text, text, text, numeric, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_plan_config(text, text, text, text, numeric, numeric, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_billing_usage(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_billing_usage(date, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_billing_usage(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_billing_usage(uuid, date, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_storage_bytes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_storage_bytes() TO authenticated;

-- ── 2) Fijar search_path en funciones SECURITY INVOKER con search_path mutable ──
ALTER FUNCTION public.generate_invoice_number() SET search_path = public;
ALTER FUNCTION public.generate_quote_number() SET search_path = public;
ALTER FUNCTION public.next_invoice_number(uuid, text, integer) SET search_path = public;
ALTER FUNCTION public.update_invoices_updated_at() SET search_path = public;
ALTER FUNCTION public.update_quotes_updated_at() SET search_path = public;
ALTER FUNCTION public.update_subscription_plan_configs_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_user_progress_updated_at() SET search_path = public;
ALTER FUNCTION public.validate_quote_update() SET search_path = public;
