# SKILL: interaction-parity

## Trigger de uso

Invocar cuando se detecta que hovers, focus rings, transiciones o animaciones de un componente no coinciden con el legacy. Se usa en la Fase B (bloque B7) y como verificacion cruzada en cualquier bloque.

## Inputs esperados

1. **Visual spec (seccion interacciones)**: propiedades de hover, focus, active, transition, keyframes documentadas.
2. **CSS legacy**: archivo con las reglas `:hover`, `:focus`, `:active`, `transition`, `@keyframes`.
3. **Componente React**: archivo TSX que renderiza el componente interactivo.

## Procedimiento paso a paso

### 1. Inventariar interacciones del componente
Listar TODAS las interacciones posibles:
- `:hover` en botones, links, filas de tabla, cards.
- `:focus` en inputs, botones, links.
- `:active` en botones.
- `:disabled` en botones, inputs.
- `transition` en cualquier elemento.
- `@keyframes` en animaciones.
- Event handlers JS que cambian estilos (onMouseEnter, onFocus, etc).

### 2. Extraer reglas legacy
Para cada interaccion, localizar la regla CSS legacy exacta:
```css
.auth-primary-btn:hover {
  background: #d97420;
  transform: translateY(-1px);
}
.auth-primary-btn {
  transition: background 0.2s ease, transform 0.15s ease;
}
```
Documentar:
- Selector.
- Propiedad.
- Valor en cada estado.
- `transition` o `animation` asociada (duracion, easing, delay).

### 3. Comparar con estado actual
Leer el CSS actual y comparar propiedad por propiedad:
- Valor correcto vs valor actual.
- Transition correcto vs actual.
- Si hay keyframes, comparar frame por frame.

### 4. Aplicar correcciones CSS
Para cada diferencia:
- Corregir el valor de la propiedad en el estado interactivo.
- Corregir la `transition` property si es diferente.
- Corregir `@keyframes` si es diferente.
- Verificar que la correccion no rompe otros componentes que comparten la regla.

### 5. Verificar keyframes (si aplica)
Para animaciones como `authFloatA`-`authFloatF`, `lmDraw`, `lmGrow`, `lmScan`:
- Comparar CADA frame del keyframe (0%, 50%, 100%).
- Comparar `animation-duration`, `animation-delay`, `animation-timing-function`, `animation-iteration-count`.
- Verificar que el elemento que tiene `animation` aplica correctamente.

### 6. Verificar interacciones JS
Si el componente tiene interacciones manejadas por React (no solo CSS):
- Verificar que `onMouseEnter`, `onMouseLeave`, `onFocus`, `onBlur` producen el efecto visual correcto.
- Ejemplo: robot de signin con tracking ocular y cierre de ojos.
- NO cambiar la logica JS, solo verificar que el resultado visual coincide.

### 7. Verificar dark mode
Para CADA interaccion corregida:
- Verificar que el estado hover/focus/active en dark mode es correcto.
- Buscar reglas `.dark .selector:hover` en el CSS legacy.

### 8. Validar en navegador
- Abrir la pantalla en el navegador de desarrollo.
- Verificar visualmente cada interaccion.
- Usar Chrome DevTools > Elements > :hov para forzar estados.

## Criterios de aceptacion

- [ ] CADA interaccion produce el mismo efecto visual que legacy.
- [ ] Transiciones con misma duracion y easing.
- [ ] Keyframes frame-por-frame identicos.
- [ ] Dark mode verificado para cada interaccion.
- [ ] `npm run build` PASS.
- [ ] `npm run typecheck` PASS.

## Output estandar

- CSS corregido (modificado in-place).
- Lista de interacciones verificadas:
```
| Selector | Estado | Propiedad | Legacy | Antes | Despues | OK |
|----------|--------|-----------|--------|-------|---------|-----|
| .auth-primary-btn | :hover | background | #d97420 | #f59e0b | #d97420 | SI |
```
