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

  window.supabaseAuthReady = new Promise(function (resolve) {
    var sub = client.auth.onAuthStateChange(function (event, session) {
      if (event === 'INITIAL_SESSION') {
        resolve(session);
        sub.data.subscription.unsubscribe();
      }
    });
    setTimeout(function () { resolve(null); }, 5000);
  });

  console.log('Supabase client initialized:', SUPABASE_URL);
})();
