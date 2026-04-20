# Fase 9 - Smoke checklist (Invoices React)

## Estado rapido

- [x] Validacion tecnica automatizada completada.
- [ ] Smoke funcional manual completado.

## Precondiciones

1. `npm install`
2. `npm run dev`
3. Sesion valida en entorno de prueba

## Smoke funcional minimo (manual)

1. Guard y navegacion:
   - [ ] Abrir `/pilot-invoices.html` con sesion valida.
2. Lifecycle invoices:
   - [ ] Crear borrador.
   - [ ] Guardar cambios.
   - [ ] Emitir factura.
   - [ ] Marcar pagada y validar transaccion asociada.
   - [ ] Desmarcar pago y validar reversa de transaccion.
   - [ ] Anular factura.
3. Search highlight:
   - [ ] Abrir factura desde Global Search y validar bloqueo si no es borrador.
4. Coexistencia:
   - [ ] Ir y volver entre rutas legacy de facturas y piloto React.

## Cierre

- Solo marcar F9 como cerrada funcionalmente cuando este checklist quede en verde.
