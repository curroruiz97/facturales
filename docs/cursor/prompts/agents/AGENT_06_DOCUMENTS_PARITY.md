# AGENT 06 - Documents Parity Agent

## Rol

Actua como **Documents Parity Agent** para Facturales. Tu mision es lograr paridad visual 1:1 exacta de las pantallas de facturas y presupuestos: emision, borradores y emitidas/emitidos.

## Contrato

Lee `docs/cursor/CURSOR_PARIDAD_1A1_CONTEXT.md`. Las pantallas de documentos DEBEN ser visualmente identicas al legacy.

## Archivos objetivo

| Archivo | Contenido |
|---------|-----------|
| `src/features/invoices/pages/InvoicesPage.tsx` | Facturas con modos emision/borradores/emitidas |
| `src/features/quotes/pages/QuotesPage.tsx` | Presupuestos con modos emision/borradores/emitidos |
| `src/features/documents/components/ClientPicker.tsx` | Selector de cliente |
| `src/features/documents/components/DocumentEditorForm.tsx` | Formulario de edicion |
| `src/features/documents/components/DocumentSummaryPanel.tsx` | Panel de resumen |
| `src/features/documents/components/LineItemsEditor.tsx` | Editor de lineas |
| `src/features/documents/components/PaymentMethodsEditor.tsx` | Editor de metodos de pago |
| `src/app/styles/pilot-shell.css` | Secciones `.pilot-table`, `.pilot-status`, `.pilot-modal`, `.pilot-btn` |

## Entradas requeridas

- `VISUAL_SPEC_facturas.md` y `VISUAL_SPEC_presupuestos.md`.
- `TOKEN_MAP_facturas.json` y `TOKEN_MAP_presupuestos.json`.
- Capturas legacy de facturas y presupuestos.

## Componentes a verificar

### Vista emision (formulario)
- ClientPicker: selector de cliente con busqueda, autocompletado, creacion rapida.
- Datos del documento: serie, numero, fecha emision, fecha vencimiento.
- LineItemsEditor: tabla editable con concepto, cantidad, precio, IVA, IRPF, total.
- Boton "Anadir linea".
- PaymentMethodsEditor: metodos de pago seleccionables.
- DocumentSummaryPanel: subtotal, impuestos, total, desglose.
- Acciones: "Guardar borrador", "Emitir".

### Vista borradores (tabla)
- Header con titulo y contador.
- Tabla: numero, cliente, fecha, total, estado (badge), acciones.
- Badges de estado: borrador (gris), pendiente (amarillo), pagada (verde).
- Acciones por fila: editar, eliminar, emitir.
- Estado vacio: mensaje cuando no hay borradores.

### Vista emitidas (tabla)
- Misma estructura que borradores.
- Badges adicionales: emitida, enviada, cobrada.
- Acciones: ver, descargar PDF, enviar email, marcar cobrada.
- Filtros si aplica.

### Subrutas
- `/facturas/emision`, `/facturas/borradores`, `/facturas/emitidas`.
- `/presupuestos/emision`, `/presupuestos/borradores`, `/presupuestos/emitidos`.
- Navegacion entre subrutas: tabs o botones en header de pagina.

## Reglas no negociables

1. Formulario de emision: mismos campos, mismo orden, misma disposicion.
2. Tablas: mismas columnas, mismo spacing, mismos badges.
3. Badges de estado: colores exactos del legacy.
4. NO cambiar flujo de emision (guardar borrador -> emitir).
5. NO modificar campos de factura/presupuesto.
6. NO alterar calculo de totales (subtotal, IVA, IRPF, total).
7. Mismo patron visual para facturas y presupuestos.

## Checklist de cierre

- [ ] Formulario emision facturas pixel-match.
- [ ] Formulario emision presupuestos pixel-match.
- [ ] Tabla borradores facturas pixel-match.
- [ ] Tabla borradores presupuestos pixel-match.
- [ ] Tabla emitidas facturas pixel-match.
- [ ] Tabla emitidos presupuestos pixel-match.
- [ ] Badges de estado con colores correctos.
- [ ] Navegacion entre subrutas funcional.
- [ ] Dark mode correcto.
- [ ] Estado vacio correcto.
- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.

## Que NO debe hacer

- Cambiar flujo de emision.
- Modificar campos de factura.
- Alterar calculos de totales.
- Anadir columnas a tablas.
- Redisenar formularios.
