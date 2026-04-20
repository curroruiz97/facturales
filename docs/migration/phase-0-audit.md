# F0 Audit tecnico real - Facturales

- Fecha de auditoria: 10 de marzo de 2026
- Alcance: Foundation / Extraction / Stabilization (F0 + F1 acotado)
- Objetivo: inventario real, extraccion de contratos/servicios, estabilizacion sin rewrite y sin ruptura funcional

## 1) Como esta construido hoy realmente

### 1.1 Arquitectura de runtime

- Aplicacion legacy tipo MPA (multi-page) sobre Vite con HTML por ruta.
- Shell visual legacy basado en inyeccion dinamica de componentes HTML (`assets/js/load-components.js`) y reinyeccion de listeners (`assets/js/main.js`).
- Contrato de integracion entre modulos legacy basado en `window.*`.
- Dependencia fuerte en orden de carga de scripts (CDN Supabase + scripts modulares + scripts clasicos).
- Coexistencia de scripts `type="module"` y scripts clasicos en las mismas paginas.

### 1.2 Entradas/rutas confirmadas (vite.config.js)

Entradas definidas en build MPA:

- `index.html`
- `signin.html`
- `signup.html`
- `verify-email.html`
- `confirm-email.html`
- `users.html`
- `home.html`
- `expenses.html`
- `integrations.html`
- `settings.html`
- `support-ticket.html`
- `invoices/new.html`
- `invoices/preview.html`
- `invoices/quote.html`
- `invoices/drafts.html`
- `invoices/issued.html`
- `invoices/quote-drafts.html`
- `invoices/quote-issued.html`
- `scan-ocr.html`
- `productos.html`
- `subscribe.html`
- `billing/success.html`
- `billing/cancel.html`

Rutas HTML adicionales detectadas en repo (no todas incluidas como entry de Vite):

- `index-2.html`, `fiscal.html`, `reset-password.html`, `complete-profile.html`, `invoices/facturas-recibidas.html`, `invoices/quote-preview.html`, y paginas legales.

### 1.3 Orden de scripts y dependencia temporal

Patron repetido en rutas protegidas:

1. CDN Supabase (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)
2. `assets/js/supabaseClient.js`
3. `assets/js/auth.js`
4. `assets/js/businessInfo.js` (segun pagina)
5. `assets/js/auth-guard.js`
6. `assets/js/subscription-guard.js`
7. Scripts de feature (clients/invoices/quotes/transactions/etc.)

La inicializacion depende de waits con polling (`while (!window.supabaseClient)` + `setTimeout`) en multiples modulos.

## 2) Dependencias criticas transversales confirmadas

### 2.1 Auth + guards

- `assets/js/supabaseClient.js`
- `assets/js/auth.js`
- `assets/js/auth-guard.js`
- `assets/js/subscription-guard.js`

Hallazgos:

- Auth guard bloquea rutas segun sesion y usa `window.checkAuth()`.
- `auth-guard.js` inyecta `access-logger.js` dinamicamente tras validar sesion.
- Dependencia directa de `sessionStorage` para redirect/intended URL.

### 2.2 Onboarding

- `assets/js/onboardingProgress.js`
- Consumidores directos: `clients.js`, `invoices.js`, `settings.html`.

Hallazgos:

- Pasos 2, 3 y 4 se sincronizan con datos reales (clientes, personalizacion, facturas emitidas).
- Side effects disparados desde UI/flows (no desde servicio unico de dominio).

### 2.3 Plan limits / usage tracking

- `assets/js/plan-limits.js`
- Consumidores directos: `clients.js`, `invoices.js`, `quotes.js`, `scan-ocr-page.js`, `productos-db.js`, `users-page.js`, `settings.html`.

Hallazgos:

- Fuente de verdad: `billing_subscriptions` + `billing_usage` + conteos en tablas (`clientes`, `productos`).
- Incrementos por RPC `increment_billing_usage`.

### 2.4 Billing side effects

- `subscribe.html`, `settings.html`, `assets/js/subscription.js`.

Invocaciones confirmadas:

- `create-checkout-session`
- `preview-proration`
- `update-subscription`
- `update-payment-method`
- `reactivate-subscription`
- `cancel-subscription`
- `get-payment-method`

### 2.5 Transacciones automaticas derivadas de facturas

- `assets/js/invoices.js` (`togglePaidStatus`)

Regla confirmada:

- Marcar factura como pagada -> crea transaccion en `transacciones` con `invoice_id`.
- Desmarcar pagada -> elimina transaccion asociada por `invoice_id`.

### 2.6 OCR

- `assets/js/scan-ocr-page.js`

Flujo confirmado:

- Upload a Storage (`expense-ocr-temp`) -> invoke `analyze-expense-document` -> guardado como gasto via `window.createTransaction`.
- Consume limites OCR (`window.planLimits.canScanOCR` y `recordOCRUsage`).

### 2.7 Soporte

- `support-ticket.html` (script inline + Quill)

Flujo confirmado:

- Invoca edge function `send-support-ticket`.
- Dependencia en editor Quill y validaciones en DOM + `innerHTML`.

## 3) Inventario de antipatrones detectados (fuente)

Escaneo estatico en `*.html` y `*.js` (excluyendo `dist/` y `node_modules/`):

### 3.1 Inline handlers (hotspots)

- `onclick=`: `settings.html` (61), `index-2.html` (56), `expenses.html` (46), `index.html` (35), `invoices/new.html` (19), `invoices/quote.html` (19).
- `onchange=`: `settings.html` (9), `complete-profile.html` (9), `invoices/new.html` (7), `invoices/quote.html` (7).
- `oninput=`: `expenses.html` (6), `index.html` (5).
- `onsubmit=`: `signin.html` (3), `settings.html` (2), `invoices/new.html` (2), `invoices/quote.html` (2).

### 3.2 Renderizado imperativo / DOM directo

- `innerHTML`: hotspots en `assets/js/users-page.js` (15), `settings.html` (14), `index.html` (11), `assets/js/scan-ocr-page.js` (10), `assets/js/expenses-page.js` (10).
- `document.getElementById`: muy elevado en `settings.html` (191), `invoices/new.html` (103), `invoices/quote.html` (103).
- `document.querySelector`: fuerte presencia en `assets/js/main.js`, `assets/js/expenses-page.js`, `settings.html`, `assets/js/invoice.js`.

### 3.3 Storage y globals

- `localStorage`: uso transversal en `settings.html`, `auth.js`, `supabaseClient.js`, `invoice-defaults.js`, `invoice-data-handler.js`, `quote-data-handler.js`.
- `sessionStorage`: `main.js`, `auth-guard.js`, `access-logger.js`, `signin/signup/confirm-email`.
- Inventario de `window.*` completo: ver `docs/migration/global-window-inventory.md` y `docs/migration/global-window-inventory.csv`.

### 3.4 jQuery/Slick

- jQuery presente como dependencia legacy y usado por `main.js` y paginas legacy.
- Slick detectado en `productos.html`, `settings.html`, `index.html`, `expenses.html`, `invoices/new.html`, `invoices/quote.html`.

## 4) Puntos de acoplamiento fuertes (UI, estado, datos, negocio)

- `settings.html`: mega-superficie con auth, billing, limits, onboarding, series, equipo (localStorage) y access logs.
- `invoices/new.html` y `invoices/quote.html`: formularios complejos con alto acoplamiento DOM + data handlers.
- `index.html`: KPIs y metrics con consultas directas mezcladas con render.
- `expenses-page.js`: mezcla de filtros UI, negocio transaccional y restricciones de dominio en una sola capa.
- `load-components.js` + `main.js`: reinyectan layout y listeners, generando riesgo de dobles eventos.

## 5) Decisiones actuales que dificultan la migracion

- Contrato operacional basado en `window.*` como API de integracion entre paginas.
- Esperas activas (`while` + `setTimeout`) para sincronizar estado de auth/supabase.
- Dependencias de orden de carga en vez de dependencias importables.
- Reglas de negocio relevantes disparadas desde handlers de UI (factura pagada -> transaccion; onboarding step updates).
- Uso intensivo de `innerHTML` y manipulación directa del DOM en rutas criticas.

## 6) Oportunidades claras de extraccion previa (ejecutadas en esta fase)

Se implemento base reutilizable y compatible sin romper el legado:

- Base TS minima:
  - `tsconfig.json`
  - `src/services/`
  - `src/shared/types/`
- Cliente Supabase reutilizable:
  - `src/services/supabase/client.ts`
- Servicio de auth:
  - `src/services/auth/auth.service.ts`
- Servicios transversales:
  - `src/services/billing-limits/billing-limits.service.ts`
  - `src/services/onboarding/onboarding.service.ts`
  - `src/services/access-log/access-log.service.ts`
- Repositorios tipados:
  - `src/services/repositories/clients.repository.ts`
  - `src/services/repositories/transactions.repository.ts`
  - `src/services/repositories/products.repository.ts`
  - `src/services/repositories/invoices.repository.ts`
  - `src/services/repositories/quotes.repository.ts`
- Namespace de transicion legacy:
  - `window.facturalesServices.supabase`
  - `window.facturalesServices.auth`
  - `window.facturalesServices.billingLimits`
  - `window.facturalesServices.onboarding`
  - `window.facturalesServices.accessLog`
  - `window.facturalesServices.repositories.{clients,transactions,products,invoices,quotes}`

## 7) Recomendaciones inmediatas (sin romper legado)

1. Congelar deuda nueva: no agregar mas `window.*`, `onclick`, `innerHTML` fuera de hotfix documentado.
2. Mantener `window.facturalesServices` como unica puerta de transicion para consumo nuevo.
3. Extraer en F2 el shell (`load-components.js`/`main.js`) antes de migrar pantallas criticas.
4. Priorizar desacople de `settings.html` por riesgo transversal.
5. Formalizar ADRs faltantes (estrategia hibrida, frontera documental, prohibiciones de portado literal).

## 8) Validacion ejecutada en este entorno

- Validacion estatica realizada:
  - integridad de rutas/entradas/scritps clave
  - revision de imports y referencias criticas
  - confirmacion de reglas de negocio sensibles (factura pagada <-> transaccion, limites quotes/facturas, fallback legacy por `client_id`)
- No se pudo ejecutar build tecnico (`npm run build`) en este shell porque `node/npm` no estan disponibles.
- Smoke manual funcional queda pendiente de ejecucion en entorno con navegador y Node operativo.
