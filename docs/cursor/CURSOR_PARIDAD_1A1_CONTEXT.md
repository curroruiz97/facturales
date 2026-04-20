# CURSOR_PARIDAD_1A1_CONTEXT
Fecha: 2026-03-11
Proyecto: Facturales (React + TypeScript SPA)
Objetivo: reconstruir la UI para que sea **pixel-parity 1:1** respecto al legacy/capturas, manteniendo arquitectura React+TS y rutas canónicas sin `.html`.

## 1. Regla principal (no negociable)
- Esto **NO** es un rediseño.
- Cualquier diferencia visual con legacy/capturas es un bug.
- En conflictos entre "estilo actual" y "capturas legacy", **gana legacy**.
- No introducir cambios creativos de layout, tipografía, espaciado, iconografía, colores o jerarquía visual.

## 2. Fuentes de verdad obligatorias
- Capturas oficiales del usuario (dashboard, auth, facturas, presupuestos, contactos, transacciones, ajustes).
- Blueprint visual legacy embebido en:
  - `src/app/pages/AppPages.tsx` (markup de referencia visual `SIGNIN_LAPTOP_MARKUP` y bloques `lm-*`).
- Estilos base legacy relevantes:
  - `src/app/styles/auth-legacy.css` (auth + showcase + robot + cards flotantes).
  - `src/app/styles/pilot-shell.css` (shell/sidebar/header/dashboard/settings legacy-parity).

## 3. Restricciones técnicas
- Mantener SPA React+TS con rutas canónicas sin `.html`.
- No reintroducir runtime legacy ni scripts `window.*` estructurales.
- No romper contratos de negocio ni flujos críticos.
- Mejoras permitidas solo si son invisibles para usuario o corrigen bugs sin alterar el look legacy.

## 4. Alcance 1:1 obligatorio por pantalla
- Auth: `/signin`, `/signup` (layout, robot, cards, colores, inputs, spacing, footer legal).
- Shell global: sidebar, header, buscador, bloque usuario, estados activos/hover.
- Dashboard: KPI cards, sparkline, barras evolución, objetivos, CTA derecha, bloque 100/100, tabla contactos y filtros.
- Facturas: `/facturas/emision`, `/facturas/borradores`, `/facturas/emitidas`.
- Presupuestos: `/presupuestos/emision`, `/presupuestos/borradores`, `/presupuestos/emitidos`.
- Contactos: estructura tabla, filtros, paginación, densidad visual y chips.
- Transacciones: toolbar, tabla, filtros, badges, acciones.
- Ajustes: tabs laterales, paneles internos, formularios, progreso, branding/colores/logo.

## 5. Checklist de paridad pixel (aplicar en cada pantalla)
- Tipografía exacta:
  - familia, peso, tamaño, line-height, letter-spacing, mayúsculas.
- Espaciado exacto:
  - márgenes, paddings, gaps, alturas mínimas, densidad vertical.
- Geometría exacta:
  - anchos/altos, radios, bordes, sombras, opacidades.
- Color exacto:
  - fondo, texto, estados hover/focus/active/disabled, badges.
- Iconografía exacta:
  - tamaño, trazo, posición, color y consistencia.
- Interacción exacta:
  - hovers, apertura/cierre de desplegables, foco, transiciones y entradas.
- Estados exactos:
  - vacío, carga, error, éxito y bloqueo.

## 6. Regla de ejecución por iteraciones (obligatoria)
- Iteración = 1 pantalla o bloque cerrado.
- Orden:
1. Extraer medidas y tokens de referencia (captura + legacy).
2. Corregir React/CSS.
3. Validar funcionalidad.
4. Validar visual.
5. Registrar evidencia.
- No pasar a la siguiente pantalla sin cerrar la actual con evidencia.

## 7. Criterios de aceptación globales
- 0 diferencias visuales relevantes frente a captura legacy.
- 0 elementos “parece botón pero no hace nada”.
- 0 regresiones funcionales críticas.
- 0 rutas internas con `.html`.
- Gates verdes:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

## 8. Definición de Done final
- Core completo visualmente 1:1.
- Comportamiento funcional equivalente al legacy.
- Evidencia por pantalla con checklist firmado.
- Código React+TS limpio, sin dependencia estructural del legado.

## 9. Sistema de subagentes y skills

El proyecto cuenta con un sistema completo de subagentes especializados, skills reutilizables, plantillas y prompts operativos para ejecutar la paridad visual de forma sistematica.

### Prompt maestro
- `docs/cursor/prompts/PROMPT_MAESTRO_ORQUESTACION.md` - Coordina las 4 fases (A: auditoria, B: implementacion, C: QA, D: cierre).

### Subagentes (10)
Ubicacion: `docs/cursor/prompts/agents/`

| Agente | Archivo | Mision |
|--------|---------|--------|
| Visual Forensics | AGENT_01_VISUAL_FORENSICS.md | Extraer spec visual exacto de capturas/legacy |
| Design Token Lock | AGENT_02_DESIGN_TOKEN_LOCK.md | Congelar tokens CSS por pantalla |
| Shell Parity | AGENT_03_SHELL_PARITY.md | Sidebar/header/topbar 1:1 |
| Auth Parity | AGENT_04_AUTH_PARITY.md | Signin/signup + robot + microinteracciones |
| Dashboard Parity | AGENT_05_DASHBOARD_PARITY.md | KPIs, charts, objetivos, CTA, contactos |
| Documents Parity | AGENT_06_DOCUMENTS_PARITY.md | Facturas/presupuestos emision/borradores/emitidas |
| Settings Parity | AGENT_07_SETTINGS_PARITY.md | Tabs, paneles y formularios exactos |
| UX Behavior | AGENT_08_UX_BEHAVIOR.md | Hover/focus/dropdowns/transiciones |
| Visual QA | AGENT_09_VISUAL_QA.md | Regresion visual + diff + evidencias |
| Functional QA | AGENT_10_FUNCTIONAL_QA.md | Typecheck/test/build + smoke |

### Skills (9)
Ubicacion: `docs/cursor/prompts/skills/`

| Skill | Archivo | Trigger |
|-------|---------|---------|
| visual-spec-extractor | SKILL_VISUAL_SPEC_EXTRACTOR.md | Al iniciar auditoria de pantalla |
| token-map-freezer | SKILL_TOKEN_MAP_FREEZER.md | Al cerrar visual spec |
| css-parity-patcher | SKILL_CSS_PARITY_PATCHER.md | Al implementar correccion visual |
| react-layout-parity | SKILL_REACT_LAYOUT_PARITY.md | Cuando DOM no produce layout legacy |
| interaction-parity | SKILL_INTERACTION_PARITY.md | Cuando hovers/focus/transitions difieren |
| chart-parity | SKILL_CHART_PARITY.md | Al ajustar graficos del dashboard |
| visual-regression-gate | SKILL_VISUAL_REGRESSION_GATE.md | Antes de cerrar bloque |
| functional-regression-gate | SKILL_FUNCTIONAL_REGRESSION_GATE.md | Antes de cerrar bloque |
| handoff-evidence-writer | SKILL_HANDOFF_EVIDENCE_WRITER.md | Al cerrar pantalla/bloque |

### Plantillas
Ubicacion: `docs/cursor/templates/`

| Plantilla | Archivo |
|-----------|---------|
| Matriz de paridad por pantalla | TEMPLATE_MATRIZ_PARIDAD.md |
| Checklist de aceptacion por bloque | TEMPLATE_CHECKLIST_ACEPTACION.md |
| Informe de regresion visual | TEMPLATE_REGRESION_VISUAL.md |
| Handoff final | TEMPLATE_HANDOFF_FINAL.md |

### Workflow de fases

```
Fase A (auditoria) -> Fase B (implementacion B1-B7) -> Fase C (QA global) -> Fase D (cierre)
```

- **Fase A**: Visual Forensics + Design Token Lock para TODAS las pantallas.
- **Fase B**: Bloques P0 (Shell, Auth, Dashboard, Documents) -> P1 (Settings, secundarias) -> P2 (interacciones).
- **Fase C**: Visual QA + Functional QA global.
- **Fase D**: Handoff final + baseline de regresion.

Reglas de bloqueo:
- No iniciar Fase B sin Gate A completo.
- No iniciar bloque Bn+1 si Bn tiene P0 abiertos.
- No cerrar sin evidencia visual y funcional.
