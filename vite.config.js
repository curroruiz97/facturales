import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Configuración para multi-page application
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        signin: resolve(__dirname, 'signin.html'),
        signup: resolve(__dirname, 'signup.html'),
        'verify-email': resolve(__dirname, 'verify-email.html'),
        'confirm-email': resolve(__dirname, 'confirm-email.html'),
        users: resolve(__dirname, 'users.html'),
        home: resolve(__dirname, 'home.html'),
        expenses: resolve(__dirname, 'expenses.html'),
        integrations: resolve(__dirname, 'integrations.html'),
        settings: resolve(__dirname, 'settings.html'),
        'support-ticket': resolve(__dirname, 'support-ticket.html'),
        'invoices-new': resolve(__dirname, 'invoices/new.html'),
        'invoices-preview': resolve(__dirname, 'invoices/preview.html'),
        'invoices-quote': resolve(__dirname, 'invoices/quote.html'),
        'invoices-drafts': resolve(__dirname, 'invoices/drafts.html'),
        'invoices-issued': resolve(__dirname, 'invoices/issued.html'),
        'invoices-quote-drafts': resolve(__dirname, 'invoices/quote-drafts.html'),
        'invoices-quote-issued': resolve(__dirname, 'invoices/quote-issued.html'),
        'scan-ocr': resolve(__dirname, 'scan-ocr.html'),
        productos: resolve(__dirname, 'productos.html'),
        subscribe: resolve(__dirname, 'subscribe.html'),
        'billing-success': resolve(__dirname, 'billing/success.html'),
        'billing-cancel': resolve(__dirname, 'billing/cancel.html'),
      },
    },
    outDir: 'dist',
  },
  
  // Servidor de desarrollo
  server: {
    port: 5173,
    open: true,
  },
  
  // Variables de entorno con prefijo VITE_
  envPrefix: 'VITE_',
  
  // Resolver rutas
  resolve: {
    alias: {
      '@': resolve(__dirname, './assets'),
    },
  },
});
