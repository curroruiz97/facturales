# Fase 4 - Smoke checklist (Contacts React)

## Estado rapido

- [x] Validacion tecnica automatizada completada.
- [ ] Smoke funcional manual completado.

## Precondiciones

1. `npm install`
2. `npm run dev`
3. Sesion valida en entorno de prueba

## Smoke funcional minimo (manual)

1. Guard y navegacion:
   - [ ] Abrir `/pilot-contacts.html` con sesion valida.
   - [ ] Abrir sin sesion y verificar redirect a signin.
2. CRUD contactos:
   - [ ] Crear contacto.
   - [ ] Editar contacto.
   - [ ] Borrar contacto individual.
3. Import/Export:
   - [ ] Importar CSV/XLSX sin errores de parseo.
   - [ ] Verificar deduplicacion por identificador.
   - [ ] Exportar CSV y validar columnas.
4. Metricas y compatibilidad:
   - [ ] Confirmar totales por cliente en datos con facturas legacy sin `client_id`.
   - [ ] Validar busqueda global hacia contacto React.

## Cierre

- Solo marcar F4 como cerrada funcionalmente cuando este checklist quede en verde.
