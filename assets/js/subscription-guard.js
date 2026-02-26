/**
 * Subscription Guard — redirige a subscribe.html si el usuario no tiene suscripción válida.
 * Permite acceso si:
 *   - status es 'active' o 'trialing', O
 *   - cancel_at_period_end=true y current_period_end > ahora (periodo de gracia)
 * Oculta la página mientras verifica para evitar flash de contenido.
 */
(function () {
  'use strict';

  var EXEMPT_PATHS = [
    '/subscribe.html',
    '/billing/',
    '/signin.html',
    '/signup.html',
    '/verify-email.html',
    '/confirm-email.html',
    '/complete-profile.html',
    '/settings.html'
  ];

  var currentPath = window.location.pathname;
  for (var i = 0; i < EXEMPT_PATHS.length; i++) {
    if (currentPath.indexOf(EXEMPT_PATHS[i]) !== -1) return;
  }

  document.documentElement.style.visibility = 'hidden';

  (async function () {
    try {
      var attempts = 0;
      while (!window.supabaseClient && attempts < 50) {
        await new Promise(function (r) { setTimeout(r, 100); });
        attempts++;
      }
      if (!window.supabaseClient) { show(); return; }

      var sb = window.supabaseClient;

      if (window.supabaseAuthReady) {
        await window.supabaseAuthReady;
      }

      var authResult = await sb.auth.getUser();
      if (!authResult.data || !authResult.data.user) {
        show();
        return;
      }

      var userId = authResult.data.user.id;

      // Buscar suscripción activa/trialing
      var activeResult = await sb
        .from('billing_subscriptions')
        .select('status')
        .eq('user_id', userId)
        .in('status', ['trialing', 'active'])
        .limit(1)
        .maybeSingle();

      if (activeResult.data) {
        show();
        return;
      }

      // Si no hay activa, buscar cancelada con periodo de gracia vigente
      var cancelledResult = await sb
        .from('billing_subscriptions')
        .select('status, cancel_at_period_end, current_period_end')
        .eq('user_id', userId)
        .eq('cancel_at_period_end', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelledResult.data && cancelledResult.data.current_period_end) {
        var periodEnd = new Date(cancelledResult.data.current_period_end);
        if (periodEnd > new Date()) {
          show();
          return;
        }
      }

      // Sin suscripción válida
      window.location.href = '/subscribe.html';
    } catch (e) {
      console.error('[subscription-guard] Error:', e);
      show();
    }
  })();

  function show() {
    document.documentElement.style.visibility = '';
  }
})();
