# ADR-002 - Frontera de dominio para documentos (invoices / quotes)

- Fecha: 2026-03-10
- Estado: Aprobado (fase de ejecucion)
- Decisores: Staff engineering migracion Facturales

## Contexto

Facturas y presupuestos comparten estructura de datos y parte de reglas de negocio, pero no son el mismo agregado.
En legado existen acoplamientos ocultos (ejemplo: limites de presupuestos usando contador de facturas).

## Decision

1. Se mantiene separacion de repositorios por bounded context:
   - `invoices.repository`
   - `quotes.repository`
2. Se permite extraer reglas compartidas en `src/domain/rules/`.
3. Las anomalias heredadas se documentan como reglas explicitas de compatibilidad, no como comportamiento implicito en UI.

## Consecuencias

- Positivas:
  - Evita mezclar politicas de negocio de forma accidental.
  - Facilita pruebas de regresion sobre reglas documentales.
  - Permite evolucionar quotes sin romper invoices.
- Negativas:
  - Puede existir duplicidad transitoria de mapeos y validaciones.

## Implementacion inicial en F2

- Regla documental explicitada: `src/domain/rules/document-limit.rule.ts`.
- Regla de side effect factura pagada/transaccion: `src/domain/rules/invoice-payment.rule.ts`.
- Tests de regresion iniciales en `src/domain/rules/__tests__/`.
