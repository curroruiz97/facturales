/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for the application.
 * Works with or without Vite.
 */

// Credenciales de Supabase (configuración directa)
// NOTA: En producción, considera usar variables de entorno
const SUPABASE_URL = 'https://nukslmpdwjqlepacukul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a3NsbXBkd2pxbGVwYWN1a3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzYwMjIsImV4cCI6MjA4NTI1MjAyMn0.uHN2vb9s1d4YdDiIH2IXSToDi_6-UwwzfFe9DgDFR4Y';

// Validar que las credenciales existen
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase credentials not configured');
  throw new Error('Missing Supabase credentials');
}

// Esperar a que la biblioteca de Supabase esté cargada
if (!window.supabase) {
  console.error('❌ Error: Supabase library not loaded');
  console.error('Make sure to include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
  throw new Error('Supabase library not loaded');
}

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabase;

// Create a promise that resolves when Supabase has finished reading the session from localStorage
// This is critical because getSession() reads from memory which is populated ASYNCHRONOUSLY after createClient()
window.supabaseAuthReady = new Promise((resolve) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      console.log('✅ Supabase auth initialized, session:', session ? 'exists' : 'null');
      resolve(session);
      subscription.unsubscribe();
    }
  });
  // Safety timeout in case INITIAL_SESSION never fires
  setTimeout(() => resolve(null), 5000);
});

// Connection test (optional - for debugging)
console.log('✅ Supabase client initialized successfully');
console.log('📍 Project URL:', SUPABASE_URL);
