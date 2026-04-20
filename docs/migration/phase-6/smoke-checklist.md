# Fase 6 - Smoke checklist (Dashboard + Global Search React)

## Estado rapido

- [x] Validacion tecnica automatizada completada.
- [ ] Smoke funcional manual completado.

## Precondiciones

1. `npm install`
2. `npm run dev`
3. Sesion valida en entorno de prueba

## Smoke funcional minimo (manual)

1. Dashboard:
   - [ ] Abrir `/pilot-dashboard.html` y validar KPIs.
   - [ ] Cambiar periodos (mes/trimestre/anual) y validar series.
2. Widgets:
   - [ ] Revisar contactos recientes.
   - [ ] Revisar transacciones recientes.
3. Global Search:
   - [ ] Buscar cliente y abrir resultado.
   - [ ] Buscar transaccion y abrir resultado.
   - [ ] Buscar factura/presupuesto y abrir resultado con highlight.
4. Coexistencia:
   - [ ] Volver a `index.html` legacy sin perdida de navegacion.

## Cierre

- Solo marcar F6 como cerrada funcionalmente cuando este checklist quede en verde.
