# Checklist de Aceptacion: {NOMBRE_BLOQUE}

Fecha: {YYYY-MM-DD}
Pantalla(s): {LISTA_PANTALLAS}
Agente responsable: {NOMBRE_AGENTE}
Bloque: {B1|B2|B3|B4|B5|B6|B7}

---

## Paridad visual

### Tipografia
- [ ] Familia de fuentes exacta (Urbanist, Poppins, system-ui segun legacy).
- [ ] Pesos de fuente exactos (300, 400, 500, 600, 700 segun legacy).
- [ ] Tamanos exactos en px.
- [ ] Line-height exactos.
- [ ] Letter-spacing exacto donde aplique.
- [ ] Text-transform correcto (uppercase, capitalize).

### Espaciado
- [ ] Margenes exactos (top, right, bottom, left).
- [ ] Paddings exactos (top, right, bottom, left).
- [ ] Gaps exactos (flex/grid).
- [ ] Alturas minimas respetadas.
- [ ] Densidad vertical identica al legacy.

### Geometria
- [ ] Anchos exactos (fijos y porcentuales).
- [ ] Alturas exactas.
- [ ] Border-radius exactos.
- [ ] Bordes exactos (width, style, color).
- [ ] Box-shadow exactos.
- [ ] Opacidades exactas.

### Color
- [ ] Fondo de pagina/componente correcto.
- [ ] Colores de texto correctos.
- [ ] Colores de acento correctos (#ec8228 como principal).
- [ ] Colores de estado correctos (exito verde, error rojo, warning amarillo).
- [ ] Colores de hover correctos.
- [ ] Colores de focus correctos.
- [ ] Colores de active correctos.
- [ ] Colores de disabled correctos.
- [ ] Colores de badges correctos.

### Iconografia
- [ ] Tamano de iconos exacto.
- [ ] Stroke-width exacto.
- [ ] Posicion relativa al texto exacta.
- [ ] Color de iconos exacto.
- [ ] Consistencia entre iconos de la misma familia.

### Interacciones
- [ ] Hover produce efecto visual identico al legacy.
- [ ] Focus ring identico al legacy.
- [ ] Dropdown abre/cierra con misma animacion.
- [ ] Transiciones CSS con misma duracion y easing.
- [ ] Animaciones keyframes intactas (si aplica).

### Estados
- [ ] Estado vacio renderiza correctamente.
- [ ] Estado de carga (skeleton/spinner) correcto.
- [ ] Estado de error con mensaje y color correcto.
- [ ] Estado de exito con mensaje y color correcto.
- [ ] Estado deshabilitado con opacidad y cursor correctos.

## Modo oscuro

- [ ] Todos los fondos dark mode correctos.
- [ ] Todos los textos dark mode correctos.
- [ ] Todos los bordes dark mode correctos.
- [ ] Todos los estados interactivos dark mode correctos.
- [ ] Iconos con colores dark mode correctos.

## Responsive

- [ ] Verificado en 1920px (desktop).
- [ ] Verificado en 1280px (laptop).
- [ ] Verificado en 768px (tablet).
- [ ] Verificado en 390px (mobile).
- [ ] Layout se adapta correctamente en cada breakpoint.
- [ ] No hay overflow horizontal en ningún breakpoint.

## Gates funcionales

- [ ] `npm run typecheck` = 0 errores.
- [ ] `npm run test` = 0 fallos.
- [ ] `npm run build` = exit code 0.
- [ ] `npm run test:e2e` = rutas OK (si aplica al bloque).

## Resultado

| Categoria | Items totales | Aprobados | Rechazados | Pendientes |
|-----------|---------------|-----------|------------|------------|
| Tipografia | | | | |
| Espaciado | | | | |
| Geometria | | | | |
| Color | | | | |
| Iconografia | | | | |
| Interacciones | | | | |
| Estados | | | | |
| Dark mode | | | | |
| Responsive | | | | |
| Gates | | | | |
| **TOTAL** | | | | |

## Veredicto: {APROBADO | RECHAZADO | APROBADO_CON_PENDIENTES}

### Pendientes (si aplica)
| # | Prioridad | Descripcion | Bloque futuro |
|---|-----------|-------------|---------------|
| 1 | | | |

### Firma
- Agente: {NOMBRE}
- Fecha: {YYYY-MM-DD}
