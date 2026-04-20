# SKILL: functional-regression-gate

## Trigger de uso

Invocar ANTES de cerrar un bloque de implementacion, despues del visual-regression-gate. Es el gate funcional obligatorio. Tambien se invoca en la Fase C como verificacion global.

## Inputs esperados

1. **Codebase**: estado actual del repositorio con los cambios de paridad aplicados.
2. **Scripts de proyecto**: `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`.

## Procedimiento paso a paso

### 1. Gate TypeCheck
Ejecutar:
```bash
npm run typecheck
```
**Criterio**: 0 errores de tipo.

Si falla:
- Copiar la salida de errores completa.
- Listar cada error: archivo, linea, codigo TS, mensaje.
- Clasificar: causado por cambio de paridad (reparar) o pre-existente (documentar).

### 2. Gate Tests
Ejecutar:
```bash
npm run test
```
**Criterio**: 0 tests fallidos.

Si falla:
- Listar cada test fallido: nombre del test, archivo, razon del fallo.
- Clasificar: causado por cambio de paridad (reparar) o pre-existente (documentar).

### 3. Gate Build
Ejecutar:
```bash
npm run build
```
**Criterio**: exit code 0, sin errores.

Si falla:
- Copiar errores de build.
- Clasificar y reparar.

### 4. Gate E2E
Ejecutar:
```bash
npm run test:e2e
```
**Criterio**: todas las rutas resuelven correctamente.

Si falla:
- Listar rutas que fallan.
- Verificar si el fallo es por cambio de paridad o infraestructura.

### 5. Smoke tests manuales
Si los 4 gates automaticos pasan, ejecutar smoke manual:

**Smoke 1 - Auth**:
- Abrir `/signin` -> formulario renderiza.
- Inputs aceptan texto.
- Links funcionan (signup, reset-password).

**Smoke 2 - Navegacion**:
- Sidebar items navegan a ruta correcta.
- Header muestra titulo correcto.
- Sidebar colapsa/expande.

**Smoke 3 - Dashboard**:
- `/dashboard` carga sin errores en consola.
- KPIs renderizan o muestran estado vacio.

**Smoke 4 - Documents**:
- `/facturas/emision` carga formulario.
- `/facturas/borradores` carga tabla o estado vacio.

**Smoke 5 - Settings**:
- `/ajustes` carga con tab business.
- Cambiar tabs funciona.

### 6. Verificaciones adicionales
- Abrir consola del navegador: 0 errores JS criticos.
- Verificar que no hay rutas con `.html` en el DOM renderizado.
- Verificar que los alias legacy redirigen (ej: `/signin.html` -> `/signin`).

### 7. Generar reporte
Producir `FUNCTIONAL_QA_REPORT.md` con formato estandar.

### 8. Emitir veredicto
- **PASS**: 4/4 gates verdes + smoke tests OK.
- **FAIL**: cualquier gate rojo o smoke critico fallido. Listar fallos.

## Criterios de aceptacion

- [ ] `npm run typecheck` = 0 errores.
- [ ] `npm run test` = 0 fallos.
- [ ] `npm run build` = exit code 0.
- [ ] `npm run test:e2e` = OK.
- [ ] Smoke tests basicos OK.
- [ ] 0 errores JS criticos en consola.
- [ ] 0 rutas `.html` detectadas.
- [ ] Reporte generado.

## Output estandar

Archivo: `FUNCTIONAL_QA_REPORT.md`
Ubicacion sugerida: `docs/cursor/reports/` (crear carpeta si no existe).

Veredicto: `PASS` o `FAIL` (comunicar explicitamente al orquestador).
