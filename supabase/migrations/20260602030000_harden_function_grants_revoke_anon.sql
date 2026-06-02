-- Migración: revocar EXECUTE a anon de forma EXPLÍCITA (corrige 20260602020000)
-- Fecha: 2026-06-02
--
-- Supabase concede EXECUTE a `anon` y `authenticated` mediante DEFAULT PRIVILEGES (grant DIRECTO,
-- no vía PUBLIC). Por eso `REVOKE ... FROM PUBLIC` no quitó el acceso de `anon`. Aquí se revoca
-- explícitamente a `anon` en las funciones sensibles. Se mantiene `check_email_provider` (login pre-auth)
-- y `authenticated` conserva el acceso (con el control interno is_admin en las admin_*).

REVOKE EXECUTE ON FUNCTION public._admin_log_action(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_feature_flag(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_api_usage(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_audit_logs(integer, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_config() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_dashboard_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_email_analytics(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_feature_flags() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_overview() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_plan_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_revenue_analytics(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_system_health() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_system_logs(integer, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_users(integer, integer, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_admin(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_plan_config(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_config(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_subscription(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_feature_flag(text, text, text, boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_plan_config(text, text, text, text, numeric, numeric, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_invoice(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_billing_usage(date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_billing_usage(uuid, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_storage_bytes() FROM anon;
