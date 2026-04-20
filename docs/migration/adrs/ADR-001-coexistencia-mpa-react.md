# ADR-001 - Coexistencia MPA legacy con rutas React aisladas

- Fecha: 2026-03-10
- Estado: Aprobado (fase de ejecucion)
- Decisores: Staff engineering migracion Facturales

## Contexto

Facturales opera como MPA con HTML legacy y runtime basado en `load-components.js` + `main.js`.
El rewrite total en una sola iteracion tiene alto riesgo operativo.

## Decision

Se adopta una estrategia de coexistencia por ruta completa:

1. Las rutas legacy permanecen activas y sin cambios de comportamiento.
2. Las rutas React se crean como nuevas entradas MPA en Vite.
3. No se incrustan componentes React dentro de la misma responsabilidad de una pagina legacy.
4. La navegacion entre mundos se hace por adaptadores de ruta (legacy -> React, React -> legacy).

## Consecuencias

- Positivas:
  - Reduce riesgo de regresion en negocio critico.
  - Permite migracion incremental medible.
  - Facilita rollback por URL.
- Negativas:
  - Coexistencia temporal de dos shells.
  - Coste de mantener adaptadores transitorios.

## Implementacion inicial en F2

- Nueva ruta piloto React: `/pilot-products.html`.
- Shell React aislado en `src/app/`.
- Adaptador legacy a piloto: `assets/js/react-shell-adapter.js` + CTA en `productos.html`.
