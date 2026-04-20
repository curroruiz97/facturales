# Fase 10 - Execution log (Final cleanup + SPA canónica)

- Fecha: 2026-03-11
- Alcance: cierre técnico integral del roadmap (F0-F10)
- Entorno: Node 22.14.0 / npm 11.11.0

## Implementado en este cierre

1. Arquitectura final SPA:
   - `react-router-dom` integrado (`BrowserRouter`, `Routes`, guards React y fallback de alias legacy).
   - Navegación interna sin recarga completa (`Link`/`Navigate`) en shell y páginas públicas.
2. URLs limpias:
   - Rutas canónicas sin `.html` para core, auth, billing y legales.
   - Alias runtime + redirects 301 para compatibilidad legacy.
3. Backend alineado:
   - Edge Function `create-checkout-session` -> `/billing/success` y `/billing/cancel`.
   - Edge Function `update-payment-method` -> `/ajustes`.
4. Retirada legacy:
   - Eliminados HTML de negocio legacy/pilot.
   - Eliminados fragments HTML de `components/`.
   - Eliminado `assets/js` (runtime global legacy) y entradas huérfanas.
   - Solo permanece `index.html` técnico de Vite.
5. Calidad y hardening:
   - Servicios `billing-limits` y `onboarding` sin fallback estructural a `window.*`.
   - `auth.service` endurecido con manejo de errores en runtime.
6. E2E base:
   - Playwright añadido (`playwright.config.ts`, `tests/e2e/routing.spec.ts`).
   - Cobertura inicial: rutas canónicas, alias legacy y verificación de redirects en `vercel.json`.

## Validación técnica

- `npm run typecheck` OK
- `npm run test` OK
- `npx vite build --outDir .tmp-dist --emptyOutDir true` OK

## Riesgo conocido

- `xlsx` mantiene 1 vulnerabilidad high sin fix upstream (aceptación temporal documentada).

## Estado

- F10 cerrada técnicamente.
- Pendiente operativo: smoke manual final en staging/canary/prod antes de declarar cierre de despliegue.

## Hardening adicional (2026-03-11)

- Se reforzó seguridad de redirect post-login con sanitización de destino interno y bloqueo de destinos externos.
- Se corrigió consistencia invoice->transaction:
  - sincronización con control de errores real al marcar/desmarcar pago,
  - rollback de estado de factura si falla el side effect,
  - anulación de factura limpia estado de pago y elimina transacción asociada.
- Se endureció estado documental:
  - no permitir emitir documentos anulados,
  - idempotencia para emisiones ya emitidas,
  - no permitir cambiar cobro/pago en documentos anulados.
- Se mejoró onboarding para crear progreso si no existe fila y recalcular pasos con datos reales al inicializar.
- Se añadió cobertura de regresión:
  - `src/app/routing/__tests__/route-metadata.test.ts`,
  - `src/services/repositories/__tests__/invoices.repository.test.ts`.
- Se corrigieron detalles funcionales UX:
  - filtro inicial de transacciones en `all`,
  - limpiar campos cliente al “Limpiar selección” en editor documental,
  - robustez de formato moneda ante códigos inválidos.

### Validación técnica de la pasada de hardening

- `npm run typecheck` OK
- `npm run test` OK (50 tests)
- `npm run test:e2e` OK (4 tests)
- `npx vite build --outDir .tmp-dist --emptyOutDir true` OK
