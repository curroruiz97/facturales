# ADR-003 - Prohibiciones de patrones legacy en superficies React

- Fecha: 2026-03-10
- Estado: Aprobado (fase de ejecucion)
- Decisores: Staff engineering migracion Facturales

## Contexto

El legacy actual usa patrones que dificultan pruebas, mantenibilidad y seguridad:
- contratos por `window.*`
- render principal con `innerHTML`
- handlers inline (`onclick`, etc.)
- lectura del DOM como fuente de verdad de negocio

## Decision

En rutas React nuevas se prohibe:

1. Usar `innerHTML` como mecanismo principal de render.
2. Crear nuevos globals en `window` fuera del namespace de compatibilidad `window.facturalesServices`.
3. Implementar reglas de negocio unicamente en componentes visuales.
4. Introducir dependencias de orden de carga con scripts legacy (`componentsLoaded`, rebind masivo de listeners).

## Excepciones

- Solo adaptadores de compatibilidad documentados y temporales.
- Toda excepcion debe quedar registrada con `TODO remove-legacy` y fase objetivo de retirada.

## Consecuencias

- Positivas:
  - Menor deuda tecnica en el codigo nuevo.
  - Mayor testabilidad de dominio y servicios.
  - Reduccion de regresiones por acoplamiento oculto.
- Negativas:
  - Mayor esfuerzo inicial de encapsulacion.
