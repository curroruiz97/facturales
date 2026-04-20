# SKILL: chart-parity

## Trigger de uso

Invocar al ajustar los graficos del dashboard: sparklines de KPI cards, grafico de barras de evolucion y cualquier visualizacion SVG que deba coincidir con legacy.

## Inputs esperados

1. **Visual spec de dashboard**: secciones de KPIs (sparklines) y grafico de evolucion.
2. **DashboardPage.tsx**: componentes `EvolutionBarsChart`, sparklines en KPI cards.
3. **CSS dashboard**: secciones `.dashboard-v2__sparkline`, `.dashboard-v2__chart`, `.dashboard-v2__svg-bar` de `pilot-shell.css`.
4. **Blueprint `SIGNIN_LAPTOP_MARKUP`**: referencia de estructura mini de KPIs/graficos en la escena del signin.

## Procedimiento paso a paso

### 1. Verificar sparklines de KPI cards
Para cada sparkline (income, expenses, balance):
- SVG `viewBox`: debe ser `"0 0 120 44"`.
- Linea del sparkline: `stroke`, `stroke-width`, `fill: none`.
- Area del sparkline: `fill` con gradiente o color solido, `opacity`.
- Colores:
  - Income: verde (verificar hex exacto).
  - Expenses: rojo (verificar hex exacto).
  - Balance: azul (verificar hex exacto).
- Verificar que las funciones `buildSparklinePath` y `buildSparklineAreaPath` producen paths correctos.

### 2. Verificar grafico de barras de evolucion
- SVG `viewBox`: `"0 0 732 430"` (o valor del CSS legacy).
- `preserveAspectRatio`: `"none"`.
- Grid horizontal: lineas con clase `.dashboard-v2__chart-grid`, cantidad, posicion.
- Grid vertical: lineas con misma clase, cantidad, posicion.
- Barras income:
  - Clase: `.dashboard-v2__svg-bar--income`.
  - Color: verde (hex exacto).
  - `rx`: border-radius superior (5px o valor legacy).
  - Ancho: proporcional al grupo.
- Barras expenses:
  - Clase: `.dashboard-v2__svg-bar--expenses`.
  - Color: rojo (hex exacto).
  - Misma geometria que income.
- Labels eje X: texto de 3 letras (Ene, Feb...), posicion, tipografia.
- Eje Y: valores en EUR, posicion, alineacion.
- Leyenda: cuadrados de color + texto "Ingresos" / "Gastos".

### 3. Verificar animaciones de barras
- Cada barra tiene animacion de entrada con delay progresivo.
- Verificar `animation-delay` calculado: `120 + index * 60` ms para income, `160 + index * 60` ms para expenses.
- Verificar que la animacion es de altura 0 -> altura final (grow from bottom).
- Verificar easing y duracion.

### 4. Verificar colores contra token map
- Comparar hex exacto de cada color usado en graficos contra `TOKEN_MAP_dashboard.json`.
- Income green: verificar.
- Expenses red: verificar.
- Balance blue: verificar.
- Grid lines: color y opacity.
- Labels: color de texto.

### 5. Aplicar correcciones
- Corregir viewBox si difiere.
- Corregir colores CSS de barras y sparklines.
- Corregir stroke-width, opacity, fill de SVG.
- Corregir animaciones si difieren.
- NO cambiar la logica de calculo de datos.

### 6. Verificar responsive
- Graficos deben escalar correctamente en:
  - 1920px: tamano completo.
  - 1280px: reducido proporcional.
  - 768px: stack vertical si aplica.
  - 390px: simplificado o scroll.

### 7. Verificar dark mode
- Colores de grid, labels, barras en dark mode.
- Fondos de paneles en dark mode.
- Verificar contraste suficiente.

## Criterios de aceptacion

- [ ] Sparklines identicas al legacy en colores, tamano y forma.
- [ ] Grafico de barras identico al legacy en grid, barras, labels, leyenda.
- [ ] Animaciones de barras con delays y duraciones correctas.
- [ ] Colores verificados contra token map.
- [ ] Responsive correcto en 1920px y 1280px minimo.
- [ ] Dark mode correcto.
- [ ] `npm run build` PASS.
- [ ] `npm run typecheck` PASS.

## Output estandar

- TSX/CSS corregidos (modificados in-place).
- Tabla de verificacion:
```
| Componente | Propiedad | Legacy | Actual | Match |
|------------|-----------|--------|--------|-------|
| sparkline-income | stroke color | #22c55e | #22c55e | SI |
| bar-income | fill | #22c55e | #34d399 | NO -> corregido |
```
