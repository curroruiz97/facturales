/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for the application.
 * Works with or without Vite.
 * Wrapped in IIFE to avoid global const re-declaration issues with HMR.
 */
(function () {
  if (window.supabaseClient) return;

  var SUPABASE_URL = 'https://nukslmpdwjqlepacukul.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a3NsbXBkd2pxbGVwYWN1a3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzYwMjIsImV4cCI6MjA4NTI1MjAyMn0.uHN2vb9s1d4YdDiIH2IXSToDi_6-UwwzfFe9DgDFR4Y';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Error: Supabase credentials not configured');
    return;
  }

  if (!window.supabase) {
    console.error('Error: Supabase library not loaded. Include the CDN script before this file.');
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseClient = client;

  // Rastrear el usuario actual para detectar cambios de cuenta
  var _lastUserId = null;

  function clearUserCache() {
    try {
      localStorage.removeItem('invoice_logo_data');
      localStorage.removeItem('invoice_logo_dimensions');
      localStorage.removeItem('business_info_cache');
      localStorage.removeItem('invoice_draft_data');
      localStorage.removeItem('quote_draft_data');
    } catch (e) {}
  }

  client.auth.onAuthStateChange(function (event, session) {
    var newUserId = session && session.user ? session.user.id : null;
    if (event === 'SIGNED_IN' && _lastUserId && newUserId && _lastUserId !== newUserId) {
      // Cambio de usuario: limpiar caché del anterior
      clearUserCache();
    }
    if (event === 'SIGNED_OUT') {
      clearUserCache();
    }
    _lastUserId = newUserId;
  });

  window.supabaseAuthReady = new Promise(function (resolve) {
    var sub = client.auth.onAuthStateChange(function (event, session) {
      if (event === 'INITIAL_SESSION') {
        _lastUserId = session && session.user ? session.user.id : null;
        resolve(session);
        sub.data.subscription.unsubscribe();
      }
    });
    setTimeout(function () { resolve(null); }, 5000);
  });

  // Initialization log removed — reduces information exposure in production
})();
