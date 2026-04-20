# Fase 10 - Smoke checklist final (staging/canary/prod)

## Estado rápido

- [x] Validación técnica automatizada completada.
- [ ] Smoke funcional manual final completado.

## Precondiciones

1. `npm install`
2. `npm run dev`
3. Sesión válida de usuario de pruebas
4. Entorno con variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

## Smoke funcional bloqueante

1. URLs canónicas:
   - [ ] Navegar `/dashboard`, `/productos`, `/contactos`, `/transacciones`, `/presupuestos`, `/facturas`.
   - [ ] Verificar que no aparece `.html` en navegación interna.
2. Auth + guards:
   - [ ] Acceder en frío a `/dashboard` sin sesión y verificar redirección a `/signin?redirect=...`.
   - [ ] Login y retorno correcto al destino privado.
3. Billing:
   - [ ] Flujo checkout redirige a `/billing/success` y `/billing/cancel`.
   - [ ] Actualización de método de pago retorna a `/ajustes`.
4. Legacy deep-links:
   - [ ] Probar `/index.html`, `/productos.html`, `/signin.html` y validar 301 a canónicas.
5. Flujos críticos:
   - [ ] Crear/emitir presupuesto.
   - [ ] Crear/emitir factura.
   - [ ] Marcar factura pagada y verificar sincronización invoice->transaction.

## Cierre

- No declarar despliegue final hasta completar este checklist en verde en staging/canary y validarlo en producción controlada.
