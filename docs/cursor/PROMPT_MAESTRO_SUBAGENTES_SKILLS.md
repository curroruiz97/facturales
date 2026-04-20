Actúa como Arquitecto de Ejecución para Facturales y crea un sistema de subagentes + skills ultra-especializadas orientadas a PARIDAD VISUAL 1:1 (legacy -> React + TypeScript), sin rediseño.

Contexto obligatorio:
- Lee y usa `docs/cursor/CURSOR_PARIDAD_1A1_CONTEXT.md` como contrato principal.
- Este proyecto es SPA React+TS con rutas canónicas sin `.html`.
- La referencia visual oficial son las capturas legacy + blueprint en `src/app/pages/AppPages.tsx` + estilos en `src/app/styles/auth-legacy.css` y `src/app/styles/pilot-shell.css`.

Objetivo:
- Definir y producir un “equipo de subagentes” y un “set de skills” para ejecutar la migración visual exacta con cero ambigüedad y sin decisiones abiertas.

Quiero que generes:

1) SUBAGENTES (mínimo 7)
Crea cada subagente con:
- Nombre
- Misión
- Entradas
- Salidas
- Reglas no negociables
- Checklist de cierre
- Qué NO debe hacer
- Métricas de calidad

Subagentes obligatorios:
- Visual Forensics Agent (extrae especificación exacta de capturas/legacy).
- Design Token Lock Agent (congela tokens visuales por pantalla y estado).
- Shell Parity Agent (sidebar/header/topbar exactos).
- Auth Parity Agent (signin/signup + robot + microinteracciones).
- Dashboard Parity Agent (KPIs, charts, objetivos, CTA, contactos).
- Documents Parity Agent (facturas/presupuestos emisión/borradores/emitidas).
- Settings Parity Agent (tabs, paneles y formularios exactos).
- UX Behavior Agent (hover/focus/dropdowns/transiciones exactas).
- Visual QA Agent (regresión visual + diff + evidencias).
- Functional QA Agent (typecheck/test/build + smoke de flujos críticos).

2) SKILLS (mínimo 8)
Crea skills reutilizables con:
- Trigger de uso
- Inputs esperados
- Procedimiento paso a paso
- Criterios de aceptación
- Output estándar

Skills obligatorias:
- skill.visual-spec-extractor
- skill.token-map-freezer
- skill.css-parity-patcher
- skill.react-layout-parity
- skill.interaction-parity
- skill.chart-parity
- skill.visual-regression-gate
- skill.functional-regression-gate
- skill.handoff-evidence-writer

3) ORQUESTACIÓN
Define un workflow estricto:
- Fase A: auditoría visual profunda.
- Fase B: implementación por bloques P0/P1/P2.
- Fase C: QA visual + QA funcional.
- Fase D: cierre con evidencias.
Incluye reglas de bloqueo:
- No avanzar si hay diferencias P0 abiertas.
- No cerrar bloque sin evidencia visual y funcional.

4) PLANTILLAS DE SALIDA
Entrega plantillas listas para usar:
- Plantilla de matriz de paridad por pantalla.
- Plantilla de checklist de aceptación por bloque.
- Plantilla de informe de regresión visual.
- Plantilla de handoff final para implementación.

5) PROMPTS LISTOS PARA PEGAR
Devuélveme:
- Un prompt maestro de orquestación.
- Un prompt individual por cada subagente.
- Un prompt individual por cada skill.
Todos deben ser operativos y sin ambigüedad, en español técnico.

Reglas adicionales:
- No propongas rediseño.
- No inventes nuevas decisiones de producto.
- Si hay conflicto, prevalece legacy.
- Siempre prioriza exactitud visual y funcional sobre velocidad.
