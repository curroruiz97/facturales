# Fase 9 - Execution log (Invoices React)

- Fecha: 2026-03-11
- Alcance: Implementacion tecnica F9 (facturas React sobre core compartido)
- Entorno: Node 22.14.0 / npm 11.11.0

## Implementado

1. Feature `src/features/invoices/`:
   - `adapters/invoices.adapter.ts`
   - `hooks/use-invoices-workspace.ts`
   - `pages/InvoicesPage.tsx`
2. Entrypoint y pagina piloto:
   - `src/app/AppPilotInvoices.tsx`
   - `src/app/main-pilot-invoices.tsx`
   - `/pilot-invoices.html`
3. Reglas de negocio preservadas:
   - Restriccion de edicion para emitidas/anuladas.
   - Side effect invoice->transaction al marcar/desmarcar pago.
   - Onboarding step update en emision.
4. Coexistencia legacy:
   - Puente en `invoices/new.html`, `drafts.html`, `issued.html`.
   - Navegacion en `react-shell-adapter.js` y metadata de rutas.
5. Hardening:
   - Apertura por `search/highlight` ahora toma estado real del documento para bloqueo de edicion.

## Validacion tecnica

- `npm run typecheck` OK
- `npm run test` OK
- `npx vite build --outDir .tmp-dist --emptyOutDir true` OK

## Estado y siguiente paso

- Estado F9: tecnico implementado.
- Pendiente: smoke manual lifecycle de facturas.
- Siguiente fase: F10.
