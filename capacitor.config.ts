import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // DECISIÓN: appId inmutable tras publicar en stores. No cambiar después de subir a Google Play.
  appId: 'com.facturales.app',
  appName: 'Facturales',
  // webDir solo contiene la pantalla de carga/offline; la app real se carga vía server.url.
  webDir: 'mobile-shell',
  server: {
    // DECISIÓN: WebView hospedado (mismo método que MigriaJob).
    // La app abre directamente la web de producción ya desplegada en Vercel.
    // Cualquier actualización de la web se refleja en la app sin recompilar.
    url: 'https://app.facturales.es/',
    androidScheme: 'https',
    // Pantalla mostrada si la URL no carga (sin conexión / error).
    errorPath: 'offline.html',
  },
  android: {
    // DECISIÓN: true para depurar con chrome://inspect; poner false antes del release a Play Store.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
