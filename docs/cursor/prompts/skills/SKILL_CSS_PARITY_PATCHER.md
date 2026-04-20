# SKILL: css-parity-patcher

## Trigger de uso

Invocar durante la Fase B al implementar correcciones visuales de una pantalla. Se usa despues de tener el token map congelado.

## Inputs esperados

1. **Token map**: `TOKEN_MAP_{pantalla}.json` con tokens congelados y conflictos identificados.
2. **Visual spec**: `VISUAL_SPEC_{pantalla}.md` como referencia de valores correctos.
3. **Archivo CSS actual**: `src/app/styles/auth-legacy.css` o `src/app/styles/pilot-shell.css`.

## Procedimiento paso a paso

### 1. Cargar token map
Leer el JSON y listar TODOS los tokens con `status: "CONFLICTO"`.

### 2. Localizar reglas CSS afectadas
Para cada token en conflicto:
- Buscar TODAS las reglas CSS en el archivo que usan esa variable o ese valor hardcoded.
- Documentar: selector, propiedad, valor actual, valor legacy correcto.

### 3. Aplicar correcciones
Para cada diferencia:
- Si es una variable CSS en `:root`: corregir el valor.
- Si es un valor hardcoded: corregir directamente en la regla.
- Preservar estructura del archivo CSS (no reordenar reglas).
- Preservar comentarios existentes.
- NO anadir clases nuevas a menos que sea estrictamente necesario para el match.

### 4. Verificar dark mode
Para cada correccion aplicada:
- Verificar que existe la regla `.dark` correspondiente.
- Si el dark override tambien tiene conflicto, corregir.
- Si falta la regla `.dark` y el visual spec la documenta, anadirla.

### 5. Verificar responsive
Para cada correccion:
- Verificar que no rompe media queries existentes.
- Si hay media queries que sobreescriben el valor corregido, verificar que tambien son correctas.

### 6. Validar build
Ejecutar:
```bash
npm run build
```
- Si falla: revertir ultimo cambio y analizar error.
- Si pasa: continuar.

### 7. Validar typecheck
Ejecutar:
```bash
npm run typecheck
```
- Aunque es CSS, verificar que no se han roto imports o referencias.

### 8. Registrar cambios
Documentar:
- Archivo modificado.
- Lineas cambiadas.
- Valor anterior -> valor nuevo.
- Razon: "Correccion paridad legacy TOKEN_MAP L:N".

## Criterios de aceptacion

- [ ] TODOS los tokens en conflicto corregidos.
- [ ] CSS produce rendering identico al legacy para la pantalla objetivo.
- [ ] Dark mode correcto.
- [ ] Responsive no roto.
- [ ] `npm run build` PASS.
- [ ] `npm run typecheck` PASS.
- [ ] Cambios documentados.

## Output estandar

- Archivo CSS parchado (modificado in-place).
- Registro de cambios en formato:
```
| Archivo | Linea | Propiedad | Antes | Despues | Origen |
```
