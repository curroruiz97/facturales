# Fase 3 - Smoke checklist (Products React)

## Estado rapido

- [x] Validacion tecnica automatizada completada.
- [ ] Smoke funcional manual completado.

## Precondiciones

1. `npm install`
2. `npm run dev`
3. Sesion valida de usuario en entorno de prueba

## Smoke funcional minimo (manual)

1. Navegacion y guard:
   - [ ] Abrir `/pilot-products.html` con sesion valida y confirmar carga de AppShell React.
   - [ ] Abrir sin sesion y confirmar redirect de auth guard.
2. Productos - CRUD:
   - [ ] Crear producto con impuesto por defecto y validar persistencia.
   - [ ] Editar nombre, referencia, precios e impuesto.
   - [ ] Eliminar un producto desde tabla.
3. Productos - seleccion masiva:
   - [ ] Seleccionar varios productos y ejecutar borrado masivo.
   - [ ] Verificar resumen de resultado (exito/parcial).
4. Productos - reglas de negocio:
   - [ ] Validar calculo de PVP y margen en modal y tabla.
   - [ ] Validar busqueda por nombre/referencia.
   - [ ] Validar badge de uso de plan y bloqueo por limite cuando aplique.
5. Coexistencia:
   - [ ] Desde ruta React, usar enlace de fallback a `/productos.html`.
   - [ ] Volver a `/pilot-products.html` y confirmar estado consistente.

## Cierre

- Solo marcar F3 cerrada cuando este smoke quede en verde.
- Registrar evidencia en `docs/migration/phase-3/phase-3-execution-log.md`.

