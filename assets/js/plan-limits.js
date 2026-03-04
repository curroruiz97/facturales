/**
 * Plan Limits — comprueba y controla los límites de uso según el plan del usuario.
 * Fuente de verdad: billing_subscriptions (plan) + billing_usage (contadores mensuales).
 * Para clientes/productos se cuenta directamente de las tablas.
 * Expone: window.planLimits
 */
(function () {
  'use strict';

  var LIMITS = {
    none:     { clients: 0,        products: 0,        invoices_month: 0,        ocr_month: 0 },
    starter:  { clients: 10,       products: 30,       invoices_month: 10,       ocr_month: 10 },
    pro:      { clients: 100,      products: 150,      invoices_month: Infinity, ocr_month: 75 },
    business: { clients: Infinity, products: Infinity,  invoices_month: Infinity, ocr_month: 300 }
  };

  var PLAN_NAMES = { starter: 'Starter', pro: 'Pro', business: 'Ilimitado' };

  // ─── helpers ──────────────────────────────────────────
  async function _waitSb() {
    var i = 0;
    while (!window.supabaseClient && i < 40) {
      await new Promise(function (r) { setTimeout(r, 100); });
      i++;
    }
    return window.supabaseClient || null;
  }

  async function _getUserId() {
    var sb = await _waitSb();
    if (!sb) return null;
    var r = await sb.auth.getUser();
    return (r.data && r.data.user) ? r.data.user.id : null;
  }

  async function _getPlan() {
    if (window.subscriptionHelper) {
      return await window.subscriptionHelper.getUserPlan();
    }
    return 'starter';
  }

  function _getLimits(plan) {
    return LIMITS[plan] || LIMITS.none;
  }

  // Determina el inicio del periodo actual de facturación
  async function _getPeriodStart(userId) {
    var sb = await _waitSb();
    if (!sb) return _monthStart();

    var r = await sb
      .from('billing_subscriptions')
      .select('current_period_start')
      .eq('user_id', userId)
      .in('status', ['trialing', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (r.data && r.data.current_period_start) {
      return r.data.current_period_start.substring(0, 10);
    }
    return _monthStart();
  }

  function _monthStart() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
  }

  // ─── contadores ───────────────────────────────────────

  async function _countClients(userId) {
    var sb = await _waitSb();
    if (!sb) return 0;
    var r = await sb
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return r.count || 0;
  }

  async function _countProducts(userId) {
    var sb = await _waitSb();
    if (!sb) return 0;
    var r = await sb
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return r.count || 0;
  }

  async function _getMonthlyUsage(userId, periodStart) {
    var sb = await _waitSb();
    if (!sb) return { invoices_used: 0, ocr_scans_used: 0 };

    var r = await sb
      .from('billing_usage')
      .select('invoices_used, ocr_scans_used')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .maybeSingle();

    if (r.data) return r.data;
    return { invoices_used: 0, ocr_scans_used: 0 };
  }

  // ─── API pública ──────────────────────────────────────

  /**
   * Obtiene el estado completo de uso y límites.
   * Retorna: { plan, limits, usage: { clients, products, invoices_month, ocr_month } }
   */
  async function getUsage() {
    var userId = await _getUserId();
    if (!userId) return null;

    var plan = await _getPlan();
    var limits = _getLimits(plan);
    var periodStart = await _getPeriodStart(userId);

    var clients = await _countClients(userId);
    var products = await _countProducts(userId);
    var monthly = await _getMonthlyUsage(userId, periodStart);

    return {
      plan: plan,
      planName: PLAN_NAMES[plan] || plan,
      limits: limits,
      usage: {
        clients: clients,
        products: products,
        invoices_month: monthly.invoices_used,
        ocr_month: monthly.ocr_scans_used
      }
    };
  }

  /**
   * Comprueba si el usuario puede crear un cliente más.
   * Retorna { allowed: bool, current: N, limit: N }
   */
  async function canCreateClient() {
    var userId = await _getUserId();
    if (!userId) return { allowed: false, current: 0, limit: 0, reason: 'No autenticado' };

    var plan = await _getPlan();
    var limits = _getLimits(plan);
    var current = await _countClients(userId);

    if (current >= limits.clients) {
      return {
        allowed: false, current: current, limit: limits.clients,
        reason: 'Has alcanzado el límite de ' + limits.clients + ' clientes del plan ' + (PLAN_NAMES[plan] || plan) + '.'
      };
    }
    return { allowed: true, current: current, limit: limits.clients };
  }

  /**
   * Comprueba si el usuario puede crear un producto más.
   */
  async function canCreateProduct() {
    var userId = await _getUserId();
    if (!userId) return { allowed: false, current: 0, limit: 0, reason: 'No autenticado' };

    var plan = await _getPlan();
    var limits = _getLimits(plan);
    var current = await _countProducts(userId);

    if (current >= limits.products) {
      return {
        allowed: false, current: current, limit: limits.products,
        reason: 'Has alcanzado el límite de ' + limits.products + ' productos del plan ' + (PLAN_NAMES[plan] || plan) + '.'
      };
    }
    return { allowed: true, current: current, limit: limits.products };
  }

  /**
   * Comprueba si el usuario puede crear una factura más este periodo.
   */
  async function canCreateInvoice() {
    var userId = await _getUserId();
    if (!userId) return { allowed: false, current: 0, limit: 0, reason: 'No autenticado' };

    var plan = await _getPlan();
    var limits = _getLimits(plan);

    if (limits.invoices_month === Infinity) {
      return { allowed: true, current: 0, limit: Infinity };
    }

    var periodStart = await _getPeriodStart(userId);
    var monthly = await _getMonthlyUsage(userId, periodStart);

    if (monthly.invoices_used >= limits.invoices_month) {
      return {
        allowed: false, current: monthly.invoices_used, limit: limits.invoices_month,
        reason: 'Has alcanzado el límite de ' + limits.invoices_month + ' facturas/mes del plan ' + (PLAN_NAMES[plan] || plan) + '.'
      };
    }
    return { allowed: true, current: monthly.invoices_used, limit: limits.invoices_month };
  }

  /**
   * Comprueba si el usuario puede realizar un escaneo OCR más este periodo.
   */
  async function canScanOCR() {
    var userId = await _getUserId();
    if (!userId) return { allowed: false, current: 0, limit: 0, reason: 'No autenticado' };

    var plan = await _getPlan();
    var limits = _getLimits(plan);
    var periodStart = await _getPeriodStart(userId);
    var monthly = await _getMonthlyUsage(userId, periodStart);

    if (monthly.ocr_scans_used >= limits.ocr_month) {
      return {
        allowed: false, current: monthly.ocr_scans_used, limit: limits.ocr_month,
        reason: 'Has alcanzado el límite de ' + limits.ocr_month + ' escaneos/mes del plan ' + (PLAN_NAMES[plan] || plan) + '.'
      };
    }
    return { allowed: true, current: monthly.ocr_scans_used, limit: limits.ocr_month };
  }

  /**
   * Incrementa un campo de billing_usage para el periodo actual.
   * Usa RPC SECURITY DEFINER que identifica al usuario via auth.uid().
   * No se pasa user_id desde el cliente para evitar impersonación.
   */
  async function _incrementUsage(field) {
    var userId = await _getUserId();
    if (!userId) { console.warn('[plan-limits] No userId para incrementar uso'); return; }
    var periodStart = await _getPeriodStart(userId);
    var sb = await _waitSb();
    if (!sb) return;

    var rpcResult = await sb.rpc('increment_billing_usage', {
      p_period_start: periodStart,
      p_field: field
    });

    if (rpcResult.error) {
      console.error('[plan-limits] Error incrementando uso:', rpcResult.error.message);
    }
  }

  async function recordInvoiceUsage() {
    return _incrementUsage('invoices_used');
  }

  async function recordOCRUsage() {
    return _incrementUsage('ocr_scans_used');
  }

  /**
   * Formatea el límite para mostrar en UI.
   */
  function formatLimit(value) {
    if (value === Infinity) return 'Ilimitado';
    return String(value);
  }

  window.planLimits = {
    LIMITS: LIMITS,
    PLAN_NAMES: PLAN_NAMES,
    getUsage: getUsage,
    canCreateClient: canCreateClient,
    canCreateProduct: canCreateProduct,
    canCreateInvoice: canCreateInvoice,
    canScanOCR: canScanOCR,
    recordInvoiceUsage: recordInvoiceUsage,
    recordOCRUsage: recordOCRUsage,
    formatLimit: formatLimit
  };
})();
