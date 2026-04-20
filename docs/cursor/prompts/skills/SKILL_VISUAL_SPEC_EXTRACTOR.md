# SKILL: visual-spec-extractor

## Trigger de uso

Invocar al iniciar la auditoria visual de una pantalla especifica. Es el primer paso de la Fase A del workflow de paridad.

## Inputs esperados

1. **Pantalla objetivo**: ruta canonica (ej: `/signin`, `/dashboard`, `/ajustes`).
2. **Captura legacy**: imagen de referencia de la pantalla legacy (proporcionada por el usuario o extraida del historial).
3. **CSS legacy relevante**: archivo y lineas especificas:
   - `src/app/styles/auth-legacy.css` para pantallas auth.
   - `src/app/styles/pilot-shell.css` para shell, dashboard, settings, tablas.
4. **Markup de referencia**: componente React actual y/o markup legacy.

## Procedimiento paso a paso

### 1. Delimitar alcance
- Identificar la pantalla y listar TODOS los componentes visuales visibles.
- Ejemplo para `/signin`: logo, titulo, subtitulo, boton Google, divider, input email, input password, checkbox, link, boton submit, texto secundario, footer legal, robot SVG, mockup laptop.

### 2. Extraer tipografia
Para cada elemento de texto:
```
| Elemento | font-family | weight | size (px) | line-height | letter-spacing | transform | Origen |
```
- Leer reglas CSS del archivo legacy para cada selector.
- Si hay herencia, documentar la cadena completa.
- Registrar origen: "auth-legacy.css L:45" o "pilot-shell.css L:320".

### 3. Extraer espaciados
Para cada elemento y contenedor:
```
| Elemento | margin (t/r/b/l) | padding (t/r/b/l) | gap | min-height | Origen |
```
- Incluir margen entre componentes (gap de flex/grid).
- Incluir alturas minimas de contenedores.

### 4. Extraer geometria
```
| Elemento | width | height | border-radius | border | box-shadow | opacity | Origen |
```
- Incluir max-width, min-width si aplica.
- Documentar box-shadow completo (offset-x, offset-y, blur, spread, color).

### 5. Extraer colores
Para cada elemento, en TODOS los estados:
```
| Elemento | Propiedad | Default | Hover | Focus | Active | Disabled | Dark default | Dark hover | Origen |
```
- Propiedad: background, color, border-color, fill, stroke.
- Hex exacto, no nombres de color.
- Buscar reglas `.dark` en el CSS legacy.

### 6. Extraer iconografia
```
| Icono | width | height | stroke-width | color | posicion relativa | Origen |
```
- Para SVGs inline, documentar viewBox y dimensiones de rendering.

### 7. Extraer responsive
```
| Breakpoint | Elemento | Propiedad | Valor original | Valor en breakpoint | Origen |
```
- Buscar `@media` en el CSS legacy.
- Breakpoints clave: 1600px, 1536px, 1320px, 1280px, 1024px, 768px, 560px, 390px.

### 8. Extraer estados
```
| Estado | Descripcion visual | Componentes afectados |
```
- Vacio: que se muestra cuando no hay datos.
- Carga: skeleton, spinner, texto.
- Error: mensaje, color, icono.
- Exito: mensaje, color.
- Deshabilitado: opacidad, cursor.

### 9. Generar documento
- Compilar todo en `VISUAL_SPEC_{pantalla}.md`.
- Verificar que NO hay celdas vacias (si no se puede determinar, marcar `PENDIENTE_CAPTURA`).
- Verificar que CADA valor tiene columna "Origen" llena.

## Criterios de aceptacion

- [ ] 0 propiedades visuales sin valor documentado (o marcadas `PENDIENTE_CAPTURA`).
- [ ] 0 estados sin documentar.
- [ ] 0 valores inventados (cada valor tiene origen verificable).
- [ ] Dark mode cubierto.
- [ ] Responsive cubierto.
- [ ] Documento generado con formato estandar.

## Output estandar

Archivo: `VISUAL_SPEC_{pantalla}.md`
Ubicacion sugerida: `docs/cursor/specs/` (crear carpeta si no existe).
