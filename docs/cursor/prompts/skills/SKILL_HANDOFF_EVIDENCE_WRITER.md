# SKILL: handoff-evidence-writer

## Trigger de uso

Invocar al cerrar una pantalla o bloque de implementacion, despues de que los gates visual y funcional hayan dado PASS. Es el ultimo paso antes de avanzar al siguiente bloque.

## Inputs esperados

1. **Visual regression report**: `VISUAL_REGRESSION_REPORT.md` con veredicto PASS.
2. **Functional QA report**: `FUNCTIONAL_QA_REPORT.md` con veredicto PASS.
3. **Token map**: `TOKEN_MAP_{pantalla}.json` con tokens congelados.
4. **Lista de archivos modificados**: archivos TSX y CSS tocados en este bloque.

## Procedimiento paso a paso

### 1. Consolidar resultados
Recopilar de los reportes:
- Veredicto visual: PASS (con conteo P0/P1/P2).
- Veredicto funcional: PASS (con resultado de cada gate).
- P1/P2 pendientes (si existen, documentar para bloque posterior).

### 2. Listar archivos modificados
Para cada archivo tocado en el bloque:
- Ruta completa.
- Lineas modificadas (rango aproximado).
- Tipo de cambio: CSS, TSX, ambos.

### 3. Listar tokens congelados
Del token map, extraer los tokens relevantes:
- Nombre de variable.
- Valor claro.
- Valor dark.
- Estado: OK, corregido, nuevo.

### 4. Generar checklist de aceptacion
Completar la plantilla de checklist con el estado de CADA item:
```markdown
- [x] Tipografia exacta.
- [x] Espaciado exacto.
- [x] Geometria exacta.
- [x] Color exacto.
- [x] Iconografia exacta.
- [x] Interacciones exactas.
- [x] Estados exactos.
- [x] Dark mode correcto.
- [x] Responsive verificado.
- [x] typecheck PASS.
- [x] test PASS.
- [x] build PASS.
```

### 5. Documentar pendientes
Si quedan P1 o P2 sin resolver:
- Listar cada pendiente con prioridad.
- Indicar en que bloque futuro se resolvera.
- P0 pendientes = ERROR, no se puede generar handoff.

### 6. Generar documento de handoff
Producir `HANDOFF_{bloque}_{fecha}.md` con formato estandar.

### 7. Actualizar checklist global
Si existe `docs/migration/phase-10/ui-parity-checklist.md`:
- Actualizar la fila correspondiente a la pantalla/bloque.
- Cambiar estado a "Completado" o "Parcial (P1/P2 pendientes)".

## Formato de salida

```markdown
# Handoff Paridad 1:1 - {BLOQUE}
Fecha: {YYYY-MM-DD}
Veredicto visual: PASS (P0:0, P1:{N}, P2:{N})
Veredicto funcional: PASS (typecheck, test, build, e2e)

## Archivos modificados
| Archivo | Lineas | Tipo |
|---------|--------|------|
| src/app/styles/auth-legacy.css | 45-120, 230-245 | CSS |
| src/app/pages/AppPages.tsx | 157-386 | TSX |

## Tokens congelados
| Token | Claro | Dark | Estado |
|-------|-------|------|--------|
| --auth-accent | #ec8228 | #ec8228 | OK |
| --auth-bg | #f7f8fa | #1a1d2e | Corregido |

## Checklist de aceptacion
- [x] Tipografia exacta.
- [x] Espaciado exacto.
- [x] Geometria exacta.
- [x] Color exacto.
- [x] Iconografia exacta.
- [x] Interacciones exactas.
- [x] Estados exactos.
- [x] Dark mode correcto.
- [x] Responsive verificado.
- [x] typecheck PASS.
- [x] test PASS.
- [x] build PASS.

## Pendientes P1/P2
| Prioridad | Descripcion | Bloque futuro |
|-----------|-------------|---------------|
| P2 | Ajuste 1px margin-top footer | B7 |

## Gates
- typecheck: PASS
- test: PASS
- build: PASS
- test:e2e: PASS
```

## Criterios de aceptacion

- [ ] Documento completo con TODAS las secciones.
- [ ] 0 items del checklist sin estado.
- [ ] TODOS los archivos modificados listados.
- [ ] Tokens relevantes documentados.
- [ ] P0 = 0 (si P0 > 0, NO se puede generar handoff).
- [ ] Pendientes P1/P2 documentados con bloque futuro asignado.
- [ ] Checklist global actualizado.

## Output estandar

Archivo: `HANDOFF_{bloque}_{fecha}.md`
Ubicacion sugerida: `docs/cursor/handoffs/` (crear carpeta si no existe).
