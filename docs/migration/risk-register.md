# Risk Register (F0/F2)

- Fecha: 10 de marzo de 2026
- Escala impacto: Bajo / Medio / Alto / Critico
- Escala probabilidad: Baja / Media / Alta

| ID | Riesgo | Impacto | Probabilidad | Zona afectada | Mitigacion propuesta | Fase objetivo |
|---|---|---|---|---|---|---|
| R-01 | Romper semantica factura pagada <-> transaccion automatica (`invoice_id`) | Critico | Alta | `assets/js/invoices.js`, `transacciones`, dashboard fiscal | Encapsular regla en servicio/repositorio de dominio y testear toggle paid/unpaid | F1-F5 |
| R-02 | Cambiar sin control la politica de limites de presupuestos (hoy usa cuota de facturas) | Alto | Alta | `quotes.js`, `plan-limits.js`, billing | Mantener comportamiento actual en F1/F2, documentar anomalia y decidir por ADR antes de F8 | F1-F8 |
| R-03 | Poner obligatorio `client_id` sin fallback en datos legacy | Alto | Media | invoices/quotes historicas, metricas cliente | Mantener fallback NIF/nombre hasta verificacion de datos en produccion | F1-F4 |
| R-04 | Orden de carga de scripts rompe auth/guard por mezcla module/classic | Critico | Alta | rutas protegidas MPA | Introducir gateway de servicios y reducir polling temporal | F1-F2 |
| R-05 | `load-components.js` + `main.js` genera listeners duplicados y estado inconsistente | Alto | Alta | shell global y todas las pantallas | Migrar shell por ruta aislada, no mezclar handlers nuevos con legacy | F2 |
| R-06 | Aumento de deuda por nuevos `onclick`/`innerHTML` durante migracion | Alto | Alta | HTML legacy | Congelacion explicita y checklist de PR con excepciones documentadas | F0-F10 |
| R-07 | Fallo en `ipapi.co` afecta trazabilidad o bloquea login | Medio | Media | `access-logger.js` | Degradacion segura sin bloquear auth (ya implementada) | F1-F10 |
| R-08 | OCR falla en invoke/parse y guarda gastos inconsistentes | Alto | Media | `scan-ocr-page.js`, edge function OCR | Validar shape de OCR y desacoplar parseo de UI en servicio | F1-F10 |
| R-09 | Soporte depende de script inline + Quill + edge function sin contrato tipado | Medio | Media | `support-ticket.html` | Extraer servicio de soporte y wrapper de editor en fase secundaria | F10 |
| R-10 | `settings.html` concentra demasiadas responsabilidades (billing, seguridad, series, logs, equipo) | Alto | Alta | `settings.html` | Trocear por modulos/servicios antes de migracion visual | F2-F10 |
| R-11 | Diferencias de tipos string/number en importes y tasas rompen calculos | Alto | Media | invoice/quote data handlers, fiscal | Unificar contratos tipados y funciones puras de calculo | F7 |
| R-12 | Dependencia de localStorage para drafts y branding provoca incoherencias entre tabs/sesiones | Medio | Media | `invoice-data-handler`, `quote-data-handler`, `settings` | Sustituir por estado tipado + persistencia controlada | F7-F9 |
| R-13 | No ejecutar build tecnico en esta fase por falta de Node en shell oculta errores de compilacion | Alto | Alta | validacion tecnica | Registrar limitacion y exigir `npm run build` en entorno con Node | Cierre F2 |
| R-14 | Repositorios nuevos no usados aun por UI legacy pueden derivar en drift funcional | Medio | Media | `src/services/repositories/*` | Mantener bridge `window.facturalesServices` y validar por smoke antes de consumo real | F1-F3 |
| R-15 | Migrar facturas/presupuestos antes del nucleo documental compartido duplicaria deuda | Critico | Alta | dominios documents/invoices/quotes | Respetar secuencia roadmap (F7 antes F8/F9) | F7-F9 |
| R-16 | Divergencia funcional entre `productos.html` (legacy) y `/pilot-products.html` (React piloto) | Alto | Media | Dominio productos y UX de catalogo | Mantener piloto aislado y ejecutar smoke comparativo antes de ampliar alcance | F2-F3 |
| R-17 | Falla de redirect en `ProtectedRoute` puede generar bucle signin/piloto | Alto | Media | Auth bridge React | Validar query `redirect` y fallback controlado en pruebas smoke | F2 |
| R-18 | Busqueda global React con consultas paralelas puede aumentar latencia y costo de consultas | Medio | Media | Shell React piloto | Debounce + limite de resultados y monitorizacion en F3 | F2-F3 |

## Riesgos confirmados en esta ejecucion

- Confirmado R-01 (side effect de transaccion automatica en `togglePaidStatus`).
- Confirmado R-02 (quotes consume limites/uso de invoice).
- Confirmado R-03 (backfill y fallback por NIF/nombre en migracion SQL).
- Confirmado R-04 (polling + dependencia de orden de scripts).
- Confirmado R-10 (concentracion extrema de responsabilidades en `settings.html`).
- Confirmado R-16 (coexistencia temporal de superficies legacy y React para productos).
- Confirmado R-17 (nuevo guard de auth React requiere smoke dedicado de redirect).

## Contenciones aplicadas en F1/F2

- Namespace de transicion `window.facturalesServices` para no seguir expandiendo contrato difuso.
- Servicios/repositories tipados agregados sin retirar APIs legacy existentes.
- Extraccion de capas para auth, supabase, onboarding, billing limits y access log.
- Ruta piloto React aislada y reversible (`/pilot-products.html`) con adaptador legacy->React.
- Reglas criticas encapsuladas en `src/domain/rules/*` con tests de regresion preparados.