# SKILL: token-map-freezer

## Trigger de uso

Invocar inmediatamente despues de cerrar el visual spec de una pantalla. Es el segundo paso de la Fase A.

## Inputs esperados

1. **Visual spec**: `VISUAL_SPEC_{pantalla}.md` completado.
2. **CSS legacy**: archivos `auth-legacy.css` y/o `pilot-shell.css`.
3. **CSS actual React**: los mismos archivos (estado actual en el repo).

## Procedimiento paso a paso

### 1. Extraer variables CSS existentes
Leer `:root` de los archivos CSS legacy. Ejemplo:
```css
:root {
  --auth-bg: #f7f8fa;
  --auth-accent: #ec8228;
  --auth-text: #2d3142;
}
```
Listar CADA variable con su valor claro.

### 2. Extraer dark overrides
Buscar reglas `.dark` que sobreescriban variables:
```css
.dark {
  --auth-bg: #1a1d2e;
  --auth-text: #e4e7f1;
}
```
Mapear cada variable a su valor dark.

### 3. Mapear contra visual spec
Para cada propiedad documentada en el visual spec:
- Si existe una variable CSS -> registrar como token directo.
- Si NO existe variable pero el valor aparece en 3+ reglas -> registrar como token derivado con prefijo `--derived-{pantalla}-`.
- Si es un valor unico de una sola regla -> registrar como valor hardcoded (no crear token).

### 4. Detectar conflictos
Comparar cada token contra el valor actual en el CSS React:
- Si coinciden: `"status": "OK"`.
- Si difieren: `"status": "CONFLICTO"`, registrar `currentValue` y `action: "Corregir a {valor_legacy}"`.

### 5. Generar JSON
Estructura:
```json
{
  "screen": "{ruta}",
  "generatedFrom": "VISUAL_SPEC_{pantalla}.md",
  "date": "{YYYY-MM-DD}",
  "tokens": {
    "--nombre-variable": {
      "value": "{hex_claro}",
      "darkValue": "{hex_dark}",
      "origin": "{archivo} L:{linea}",
      "status": "OK|CONFLICTO",
      "currentValue": "{valor_actual_si_conflicto}",
      "action": "{accion_si_conflicto}"
    }
  },
  "derivedTokens": {
    "--derived-{pantalla}-nombre": {
      "value": "{valor}",
      "usedIn": ["{selector1}", "{selector2}"],
      "origin": "{archivo} L:{linea}"
    }
  },
  "locked": true
}
```

### 6. Validar completitud
- Verificar que TODOS los colores del visual spec estan cubiertos por tokens.
- Verificar que TODOS los tamanos de fuente relevantes estan documentados.
- Verificar que TODOS los espaciados principales estan documentados.

### 7. Marcar como locked
- `"locked": true` significa que estos tokens NO se modifican sin autorizacion explicita.

## Criterios de aceptacion

- [ ] JSON valido y bien formateado.
- [ ] 0 tokens sin origen documentado.
- [ ] 0 conflictos sin accion de correccion.
- [ ] Dark mode overrides incluidos para todos los tokens que los tengan.
- [ ] Todos los colores del visual spec cubiertos.
- [ ] Marcado como `locked: true`.

## Output estandar

Archivo: `TOKEN_MAP_{pantalla}.json`
Ubicacion sugerida: `docs/cursor/tokens/` (crear carpeta si no existe).
