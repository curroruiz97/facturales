/**
 * Subscription helper — consulta el plan del usuario y controla acceso a funcionalidades.
 * Fuente de verdad: tabla billing_subscriptions (sincronizada vía webhook de Stripe).
 * Expone: window.subscriptionHelper
 */

(function () {
  'use strict';

  var PLAN_HIERARCHY = { starter: 0, pro: 1, business: 2 };
  var PLAN_NAMES = { starter: 'Starter', pro: 'Pro', business: 'Ilimitado' };
  var ACTIVE_STATUSES = ['trialing', 'active'];

  // Features -> plan mínimo requerido
  var FEATURE_REQUIREMENTS = {
    unlimited_invoices: 'pro',
    unlimited_clients: 'pro',
    analytics: 'pro',
    priority_support: 'pro',
    multi_series: 'business',
    bulk_export: 'business',
    integrations: 'business',
    dedicated_support: 'business'
  };

  var _cache = null;
  var _cacheTs = 0;
  var CACHE_TTL_MS = 30000;

  async function _waitForSupabase() {
    var attempts = 0;
    while (!window.supabaseClient && attempts < 40) {
      await new Promise(function (r) { setTimeout(r, 100); });
      attempts++;
    }
    return window.supabaseClient || null;
  }

  /**
   * Obtiene la suscripción activa del usuario autenticado.
   * Retorna el registro de billing_subscriptions o null.
   */
  async function getCurrentSubscription(forceRefresh) {
    if (!forceRefresh && _cache && (Date.now() - _cacheTs < CACHE_TTL_MS)) {
      return _cache;
    }

    var supabase = await _waitForSupabase();
    if (!supabase) return null;

    try {
      var authResult = await supabase.auth.getUser();
      if (!authResult.data || !authResult.data.user) return null;

      var userId = authResult.data.user.id;
      var result = await supabase
        .from('billing_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      _cache = result.data || null;
      _cacheTs = Date.now();
      return _cache;
    } catch (err) {
      console.error('subscriptionHelper.getCurrentSubscription error:', err);
      return null;
    }
  }

  /**
   * Retorna el plan actual del usuario: 'starter' | 'pro' | 'business'.
   * Si no hay suscripción activa retorna 'starter'.
   */
  async function getUserPlan(forceRefresh) {
    var sub = await getCurrentSubscription(forceRefresh);
    return (sub && sub.plan) || 'starter';
  }

  /**
   * Verifica si el plan actual cumple con el plan mínimo requerido.
   * hasPlanAccess('pro') retorna true si el usuario tiene pro o business.
   */
  async function hasPlanAccess(requiredPlan) {
    var userPlan = await getUserPlan();
    var userLevel = PLAN_HIERARCHY[userPlan] || 0;
    var requiredLevel = PLAN_HIERARCHY[requiredPlan] || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Verifica acceso a una feature específica.
   * Si no tiene acceso, muestra un toast y retorna false.
   */
  async function assertFeatureAccess(featureKey) {
    var requiredPlan = FEATURE_REQUIREMENTS[featureKey];
    if (!requiredPlan) return true;

    var hasAccess = await hasPlanAccess(requiredPlan);
    if (!hasAccess) {
      var planName = PLAN_NAMES[requiredPlan] || requiredPlan;
      var msg = 'Esta función requiere el plan ' + planName + ' o superior.';
      if (window.showToast) {
        window.showToast(msg, 'warning');
      } else {
        alert(msg);
      }
    }
    return hasAccess;
  }

  /**
   * Invalida la caché para forzar recarga en la próxima consulta.
   */
  function invalidateCache() {
    _cache = null;
    _cacheTs = 0;
  }

  window.subscriptionHelper = {
    getCurrentSubscription: getCurrentSubscription,
    getUserPlan: getUserPlan,
    hasPlanAccess: hasPlanAccess,
    assertFeatureAccess: assertFeatureAccess,
    invalidateCache: invalidateCache,
    PLAN_HIERARCHY: PLAN_HIERARCHY,
    PLAN_NAMES: PLAN_NAMES,
    FEATURE_REQUIREMENTS: FEATURE_REQUIREMENTS
  };
})();
