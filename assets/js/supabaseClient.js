/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for the application.
 * Works with or without Vite.
 */

// Intentar obtener credenciales de variables de entorno (Vite)
// o usar credenciales directas como fallback
let SUPABASE_URL;
let SUPABASE_ANON_KEY;

// Verificar si estamos usando Vite (import.meta.env disponible)
if (typeof import.meta !== 'undefined' && import.meta.env) {
  SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  console.log('🔧 Using Vite environment variables');
}

// Si no hay variables de entorno, usar credenciales directas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Environment variables not found, using direct credentials');
  console.warn('⚠️ For production, use Vite with .env file');
  
  SUPABASE_URL = 'https://nukslmpdwjqlepacukul.supabase.co';
  SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a3NsbXBkd2pxbGVwYWN1a3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzYwMjIsImV4cCI6MjA4NTI1MjAyMn0.uHN2vb9s1d4YdDiIH2IXSToDi_6-UwwzfFe9DgDFR4Y';
}

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

// Connection test (optional - for debugging)
console.log('✅ Supabase client initialized successfully');
console.log('📍 Project URL:', SUPABASE_URL);
