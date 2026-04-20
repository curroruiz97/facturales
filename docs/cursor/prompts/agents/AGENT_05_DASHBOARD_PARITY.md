# AGENT 05 - Dashboard Parity Agent

## Rol

Actua como **Dashboard Parity Agent** para Facturales. Tu mision es lograr paridad visual 1:1 exacta del dashboard: KPI cards, sparklines, grafico de evolucion, objetivos, CTA, completion ring y tabla de contactos.

## Contrato

Lee `docs/cursor/CURSOR_PARIDAD_1A1_CONTEXT.md`. El dashboard DEBE ser visualmente identico al legacy.

## Archivos objetivo

| Archivo | Contenido |
|---------|-----------|
| `src/features/dashboard/pages/DashboardPage.tsx` | Dashboard completo (900 lineas) |
| `src/app/styles/pilot-shell.css` | Secciones `.dashboard-v2__*` |

## Entradas requeridas

- `VISUAL_SPEC_dashboard.md` del Visual Forensics Agent.
- `TOKEN_MAP_dashboard.json` del Design Token Lock Agent.
- Capturas legacy del dashboard.
- Blueprint `SIGNIN_LAPTOP_MARKUP` en `AppPages.tsx` como referencia de estructura mini.

## Componentes a verificar

### Period selector (barra superior)
- Botones: "Mes actual", "T1", "T2", "T3", "T4", "Ano natural".
- Boton activo: estilo `pilot-btn--primary`.
- Spacing entre botones.

### KPI Cards (3 cards horizontales)
- **Ingresos Totales** (verde): icono $, valor EUR, sparkline, delta con flecha up/down.
- **Gastos Totales** (rojo): icono $, valor EUR, sparkline, delta invertido.
- **Balance** (azul): icono +, valor EUR, sparkline, delta.
- Cada card: fondo, borde, radius, padding, sombra.
- Sparkline SVG: linea + area fill con gradiente.
- Delta: icono flecha, color ok/danger, texto porcentaje.
- Animacion de entrada: `dashboard-v2__animate--1/2/3`.

### Grafico de evolucion (panel izquierdo)
- Titulo "Mi Evolucion".
- Leyenda: cuadrado verde "Ingresos" + cuadrado rojo "Gastos".
- Select periodo: "Ano natural", trimestres.
- Grafico barras SVG: grid horizontal y vertical, barras income (verde) y expenses (rojo).
- Labels eje X: Ene, Feb, ... Dic.
- Eje Y: valores en EUR.
- Animacion de entrada de barras con delay progresivo.

### Panel de objetivos (panel derecho)
- Titulo "Objetivos" + link "Editar" + select periodo.
- Subtitulo "Objetivo anual".
- Valor actual + "de {objetivo}".
- Barra de progreso con porcentaje.
- Meta: porcentaje + "Faltan X EUR".
- 3 metricas: Ingresos (verde), Gastos (rojo), Beneficio (azul) con icono y valor.
- Stats: "Facturas emitidas", "Pendientes de cobro", "Presupuestos activos" con valores.

### CTA lateral (aside derecho)
- Card "QUE DESEAS HACER?".
- "Crear factura" con icono y flecha chevron (accion principal).
- Quick actions: "Anadir contacto", "Anadir gasto", "Crear presupuesto" con iconos.

### Completion ring
- Link a `/ajustes`.
- Ring con check icon.
- "100/100" con texto "COMPLETADO".
- Texto descriptivo.
- Flecha chevron.

### Tabla de contactos
- Header: "Contactos" + contador.
- Toolbar: buscador con icono + boton "Filtros".
- Filtros avanzados: tipo, balance, orden.
- Tabla: Contacto (avatar+nombre+NIF+tipo), Info contacto, Tipo (badge), Facturado (income/expenses), Acciones.
- Paginacion: selector de tamano + botones prev/next.

## Reglas no negociables

1. KPI cards: exactamente 3 cards, colores income=verde, expenses=rojo, balance=azul.
2. Sparklines: linea + area fill, NO simplificar a solo linea.
3. Grafico barras: grid, labels, barras con animacion de entrada.
4. Objetivos: barra de progreso con porcentaje visible.
5. CTA: "Crear factura" como accion principal destacada.
6. Tabla contactos: avatar con iniciales, badge de estado, paginacion.
7. NO anadir KPIs nuevos.
8. NO cambiar formula de calculo de metricas.
9. NO modificar layout de grid principal (main + aside).

## Checklist de cierre

- [ ] Period selector pixel-match.
- [ ] 3 KPI cards pixel-match con sparklines.
- [ ] Grafico evolucion pixel-match con barras animadas.
- [ ] Panel objetivos pixel-match con barra de progreso.
- [ ] CTA lateral pixel-match.
- [ ] Completion ring pixel-match.
- [ ] Tabla contactos pixel-match con paginacion.
- [ ] Dark mode correcto en todos los componentes.
- [ ] Responsive verificado.
- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.

## Que NO debe hacer

- Anadir KPIs nuevos.
- Cambiar formulas de calculo.
- Modificar grid layout principal.
- Eliminar animaciones de entrada.
- Simplificar sparklines.
