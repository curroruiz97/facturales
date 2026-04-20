# UI Parity Checklist (Legacy vs React)

Fecha: 2026-03-11
Responsable: Codex
Estado: en progreso

## Criterio de referencia

- Source of truth: legacy HTML/CSS previo + capturas oficiales del usuario.
- Regla de conflicto: prevalece legacy (salvo mejora no disruptiva).
- Escala de prioridad:
  - P0: identidad visual/flujo roto.
  - P1: diferencia visible no bloqueante.
  - P2: refinado de pixel y microinteraccion.

## Matriz de paridad por pantalla

| Pantalla | Prioridad | Estado | Diferencias detectadas | Accion aplicada |
|---|---|---|---|---|
| Login `/signin` | P0 | En progreso | Robot/escena no exactos, densidad visual desigual | Rehecho robot SVG con look legacy, tracking ocular y cierre al foco de password; ajuste de layout, paleta, espaciados y CTA |
| Registro `/signup` | P0 | En progreso | Composicion de cards derecha no clavada y proporciones dispares | Ajuste de cards flotantes, radios/sombras/jerarquia tipografica, espaciado y footer |
| Shell global (sidebar/header) | P0 | En progreso | Diferencias de anchuras, pesos tipograficos, avatar/caret y densidad | Ajuste de ancho sidebar/header, tipografia, bloques de usuario y estados visuales |
| Dashboard `/dashboard` | P0 | Parcial | Aun faltan microajustes de iconografia y ritmo vertical | Base alineada, pendiente ajuste fino de iconos y metricas de spacing |
| Facturas subrutas | P0 | Validado tecnico | Legacy `.html` y subrutas no separadas en version anterior | Subrutas React activas (`/facturas/emision`, `/borradores`, `/emitidas`) + redirects legacy |
| Presupuestos subrutas | P0 | Validado tecnico | Legacy `.html` y subrutas no separadas en version anterior | Subrutas React activas (`/presupuestos/emision`, `/borradores`, `/emitidos`) + redirects legacy |
| Contactos `/contactos` | P1 | Parcial | Tabla/listado con diferencias menores de densidad | Estructura migrada; pendiente pulido fino de columnas y chips |
| Transacciones `/transacciones` | P1 | Parcial | Filtros/tabla con look todavia algo generico | Estructura migrada; pendiente pulido de spacing y badges |
| Configuracion `/ajustes` | P1 | Parcial | Tabs y bloques laterales pendientes de matching fino | Vista React funcional y alineada a shell; falta pulido pixel |
| Integraciones `/integraciones` | P1 | Parcial | Cards y ritmos visuales secundarios | Vista React operativa con estilo unificado |
| Fiscal `/fiscal` | P1 | Parcial | Ajustes de jerarquia y tarjetas | Vista React operativa con shell unificado |
| OCR `/ocr` y Soporte `/soporte` | P1 | Validado tecnico | Sin desviaciones criticas | Integradas en shell React |

## Estado de objetivos del plan

- [x] Rutas canonicas sin `.html` para negocio.
- [x] Redirects legacy declarados (301) en `vercel.json`.
- [x] Subrutas de facturas/presupuestos separadas y operativas.
- [x] Robot de login con tracking de ojos + cierre al foco.
- [x] Correccion de bug visual en `UserMenu` (caret/avatar).
- [ ] Cierre de paridad visual pixel exacta de todas las pantallas core.
- [ ] Baseline de regresion visual automatizada (capturas comparables).

## Evidencia tecnica (ultimo ciclo)

- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npx vite build --outDir .tmp-dist --emptyOutDir true`
- [x] `npm run test:e2e`

## Pendientes P2 (bloque final)

- [ ] Ajuste fino de iconografia SVG para matching de capturas.
- [ ] Retoque de espaciados (1-2 px) en dashboard/tablas/forms.
- [ ] Revisar responsive en 1280, 1024, 768 y 390 px.
- [ ] Cerrar snapshot visual de login/registro/shell con baseline aprobada.
