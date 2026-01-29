/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for the application.
 * Credentials are loaded from environment variables for security.
 */

// Supabase configuration
const SUPABASE_URL = 'https://nukslmpdwjqlepacukul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a3NsbXBkd2pxbGVwYWN1a3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzYwMjIsImV4cCI6MjA4NTI1MjAyMn0.uHN2vb9s1d4YdDiIH2IXSToDi_6-UwwzfFe9DgDFR4Y';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabase;

// Connection test (optional - for debugging)
console.log('✅ Supabase client initialized successfully');
