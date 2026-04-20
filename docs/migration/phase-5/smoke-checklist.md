# Fase 5 - Smoke checklist (Transactions React)

## Estado rapido

- [x] Validacion tecnica automatizada completada.
- [ ] Smoke funcional manual completado.

## Precondiciones

1. `npm install`
2. `npm run dev`
3. Sesion valida en entorno de prueba

## Smoke funcional minimo (manual)

1. Guard y navegacion:
   - [ ] Abrir `/pilot-transactions.html` con sesion valida.
2. CRUD:
   - [ ] Crear ingreso manual.
   - [ ] Crear gasto manual.
   - [ ] Editar transaccion manual.
   - [ ] Eliminar transaccion manual.
3. Filtros y tabla:
   - [ ] Buscar por concepto/contacto.
   - [ ] Filtrar por tipo, categoria, fechas, importes.
   - [ ] Ordenar columnas.
4. Bulk:
   - [ ] Seleccionar multiples transacciones y borrar en bloque.
5. Integridad invoice->transaction:
   - [ ] Verificar que transacciones de factura quedan bloqueadas para borrado/edicion manual.

## Cierre

- Solo marcar F5 como cerrada funcionalmente cuando este checklist quede en verde.
