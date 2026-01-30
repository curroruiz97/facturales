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
        users: resolve(__dirname, 'users.html'),
        home: resolve(__dirname, 'home.html'),
        analytics: resolve(__dirname, 'analytics.html'),
        calender: resolve(__dirname, 'calender.html'),
        expenses: resolve(__dirname, 'expenses.html'),
        history: resolve(__dirname, 'history.html'),
        integrations: resolve(__dirname, 'integrations.html'),
        messages: resolve(__dirname, 'messages.html'),
        'my-wallet': resolve(__dirname, 'my-wallet.html'),
        settings: resolve(__dirname, 'settings.html'),
        statistics: resolve(__dirname, 'statistics.html'),
        'support-ticket': resolve(__dirname, 'support-ticket.html'),
        transaction: resolve(__dirname, 'transaction.html'),
        'invoices-new': resolve(__dirname, 'invoices/new.html'),
        'invoices-preview': resolve(__dirname, 'invoices/preview.html'),
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
