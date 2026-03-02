/**
 * access-logger.js
 * Registra cada acceso (login) del usuario en la tabla access_logs.
 * Obtiene IP y geolocalización mediante ipapi.co (gratuito, sin API key).
 * Se ejecuta una vez por sesión usando sessionStorage como flag.
 */
(function () {
  var LOG_FLAG = '_access_logged';

  // Si ya se registró en esta sesión de pestaña, no repetir
  if (sessionStorage.getItem(LOG_FLAG)) return;

  async function logAccess() {
    try {
      // Esperar a que Supabase esté listo
      if (!window.supabaseAuthReady) return;
      var session = await window.supabaseAuthReady;
      if (!session || !session.user) return;

      var user = session.user;

      // Obtener IP y geolocalización
      var ip = null;
      var city = null;
      var country = null;

      try {
        var resp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          var geo = await resp.json();
          ip = geo.ip || null;
          city = geo.city || null;
          country = geo.country_name || null;
        }
      } catch (_) {
        // Si falla la geolocalización, registrar sin esos datos
      }

      // Insertar registro de acceso
      var supabase = window.supabaseClient;
      if (!supabase) return;

      await supabase.from('access_logs').insert([{
        user_id: user.id,
        email: user.email || null,
        ip_address: ip,
        city: city,
        country: country,
        user_agent: navigator.userAgent || null
      }]);

      // Marcar como registrado en esta sesión
      sessionStorage.setItem(LOG_FLAG, '1');
    } catch (err) {
      console.error('access-logger: Error registrando acceso:', err);
    }
  }

  // Ejecutar tras un breve delay para no bloquear la carga
  setTimeout(logAccess, 1500);
})();
