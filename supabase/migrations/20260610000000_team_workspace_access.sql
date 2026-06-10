-- Migracion: acceso compartido del equipo (workspace multiusuario, KD 1.1)
-- Fecha: 2026-06-10

CREATE OR REPLACE FUNCTION public.effective_owner_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $fn$
DECLARE
  uid UUID := auth.uid();
  mail TEXT := lower(coalesce(auth.jwt() ->> 'email', ''));
  owner_id UUID;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT tm.owner_user_id INTO owner_id FROM public.team_members tm
  WHERE tm.status IN ('invited', 'active') AND (tm.member_user_id = uid OR (mail <> '' AND lower(tm.email) = mail))
  ORDER BY (tm.status = 'active') DESC LIMIT 1;
  RETURN COALESCE(owner_id, uid);
END; $fn$;
REVOKE ALL ON FUNCTION public.effective_owner_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.effective_owner_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_subscription_access()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE uid UUID := auth.uid(); mail TEXT := lower(coalesce(auth.jwt() ->> 'email', '')); sub RECORD; eff_owner UUID;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('has_access', false, 'via', 'none'); END IF;
  eff_owner := public.effective_owner_id();
  SELECT status, cancel_at_period_end, current_period_end INTO sub FROM public.billing_subscriptions WHERE user_id = eff_owner ORDER BY created_at DESC LIMIT 1;
  IF FOUND AND (sub.status IN ('trialing', 'active') OR (sub.cancel_at_period_end AND sub.current_period_end > NOW())) THEN
    IF eff_owner <> uid AND mail <> '' THEN
      UPDATE public.team_members SET member_user_id = uid, status = 'active', activated_at = NOW() WHERE lower(email) = mail AND owner_user_id = eff_owner AND member_user_id IS NULL AND status <> 'revoked';
    END IF;
    RETURN jsonb_build_object('has_access', true, 'via', CASE WHEN eff_owner = uid THEN 'own' ELSE 'team' END, 'status', sub.status, 'current_period_end', sub.current_period_end, 'effective_user_id', eff_owner);
  END IF;
  RETURN jsonb_build_object('has_access', false, 'via', 'none', 'effective_user_id', uid);
END; $fn$;
REVOKE ALL ON FUNCTION public.resolve_subscription_access() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_subscription_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_user_data(data_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $fn$
BEGIN RETURN data_user_id = public.effective_owner_id(); END; $fn$;
REVOKE ALL ON FUNCTION public.can_access_user_data(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_access_user_data(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_set_effective_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN NEW.user_id := public.effective_owner_id(); RETURN NEW; END; $fn$;
CREATE POLICY "team_access_select" ON public.clientes FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.clientes FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_update" ON public.clientes FOR UPDATE USING (public.can_access_user_data(user_id)) WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_delete" ON public.clientes FOR DELETE USING (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_clientes_eo BEFORE INSERT OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.invoices FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.invoices FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_update" ON public.invoices FOR UPDATE USING (public.can_access_user_data(user_id)) WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_delete" ON public.invoices FOR DELETE USING (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_invoices_eo BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.productos FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.productos FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_update" ON public.productos FOR UPDATE USING (public.can_access_user_data(user_id)) WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_delete" ON public.productos FOR DELETE USING (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_productos_eo BEFORE INSERT OR UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.transacciones FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.transacciones FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_update" ON public.transacciones FOR UPDATE USING (public.can_access_user_data(user_id)) WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_delete" ON public.transacciones FOR DELETE USING (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_transacciones_eo BEFORE INSERT OR UPDATE ON public.transacciones FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.quotes FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.quotes FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_update" ON public.quotes FOR UPDATE USING (public.can_access_user_data(user_id)) WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_delete" ON public.quotes FOR DELETE USING (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_quotes_eo BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.business_info FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.business_info FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_update" ON public.business_info FOR UPDATE USING (public.can_access_user_data(user_id)) WITH CHECK (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_business_info_eo BEFORE INSERT OR UPDATE ON public.business_info FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.invoice_series FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.invoice_series FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE POLICY "team_access_update" ON public.invoice_series FOR UPDATE USING (public.can_access_user_data(user_id)) WITH CHECK (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_invoice_series_eo BEFORE INSERT OR UPDATE ON public.invoice_series FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.document_email_log FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "team_access_insert" ON public.document_email_log FOR INSERT WITH CHECK (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_document_email_log_eo BEFORE INSERT ON public.document_email_log FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
CREATE POLICY "team_access_select" ON public.user_progress FOR SELECT USING (public.can_access_user_data(user_id));
CREATE OR REPLACE TRIGGER trg_user_progress_eo BEFORE INSERT OR UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.trg_set_effective_owner();
