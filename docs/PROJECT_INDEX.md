# PROJECT_INDEX

## 1) Proyecto
- Nombre: Facturales
- Stack actual: SPA React + TypeScript sobre Vite
- Estado de migracion: core funcional en React/TS, runtime legacy retirado, URLs canonicas sin `.html`

## 2) Rutas canonicas

### Core privado
- `/dashboard`
- `/productos`
- `/contactos`
- `/transacciones`
- `/presupuestos`
- `/facturas`
- `/ocr`
- `/soporte`
- `/ajustes`
- `/integraciones`
- `/fiscal`

### Publico/Auth/Billing
- `/signin`
- `/signup`
- `/verify-email`
- `/confirm-email`
- `/reset-password`
- `/complete-profile`
- `/subscribe`
- `/billing/success`
- `/billing/cancel`

### Legal
- `/aviso-legal`
- `/condiciones-legales`
- `/politica-de-cookies`
- `/politica-de-privacidad`

## 3) Compatibilidad legacy
- Redirects 301 definidos en `vercel.json` para rutas legacy `.html` y `pilot-*`.
- Fallback SPA: rewrite `/:path((?!.*\\.).*) -> /index.html`.
- Alias runtime en cliente para deep-links legacy: `src/app/routing/route-metadata.ts`.

## 4) Directorios clave
- `src/app`: shell, rutas, layouts, providers, paginas publicas.
- `src/features`: modulos de negocio (dashboard, productos, contactos, transacciones, presupuestos, facturas, OCR, soporte).
- `src/services`: auth, supabase, billing limits, onboarding, subscription, repositorios.
- `src/domain`: reglas de dominio compartidas.
- `src/shared`: tipos y contratos base.
- `docs/migration`: roadmap canonico, ADRs y evidencias por fase.
- `supabase`: edge functions y migraciones.

## 5) Configuracion
- `index.html`: unico entrypoint tecnico de Vite.
- `vite.config.js`: SPA build y alias `@ -> src`.
- `tailwind.config.js`: contenido escaneado en `index.html` y `src/**/*.{ts,tsx}`.
- `vercel.json`: redirects/rewrites para cutover profesional.

## 6) Calidad y pruebas
- Gates tecnicos: `npm run typecheck`, `npm run test`, `npm run build`.
- E2E rutas: `npm run test:e2e` (Playwright).

## 7) Seguridad y runtime
- Supabase runtime solo por variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Riesgo `xlsx` registrado sin fix upstream (mitigacion documental en roadmap/logs).
