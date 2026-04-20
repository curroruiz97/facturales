# SKILL: visual-regression-gate

## Trigger de uso

Invocar ANTES de cerrar un bloque de implementacion. Es el gate visual obligatorio que determina si se puede avanzar al siguiente bloque. Tambien se invoca en la Fase C como verificacion global.

## Inputs esperados

1. **Pantalla(s) React renderizada(s)**: la aplicacion corriendo en `npm run dev`.
2. **Captura legacy de referencia**: imagen aprobada por el usuario como referencia.
3. **Visual spec**: `VISUAL_SPEC_{pantalla}.md` con valores exactos de referencia.

## Procedimiento paso a paso

### 1. Preparar entorno
- Verificar que `npm run dev` esta corriendo.
- Navegar a la pantalla objetivo.
- Desactivar extensiones del navegador que puedan afectar rendering.

### 2. Capturar estado actual
Realizar capturas de la pantalla React en:
- **1920px** - Desktop full HD (modo claro).
- **1280px** - Laptop (modo claro).
- **768px** - Tablet (modo claro).
- **390px** - Mobile (modo claro).
- **1920px** - Desktop (modo oscuro).
- **390px** - Mobile (modo oscuro).

### 3. Comparar contra referencia
Para cada captura:
1. Colocar lado a lado con la referencia legacy.
2. Verificar sistematicamente:
   - Layout general (proporciones, alineacion).
   - Tipografia (tamanos, pesos, colores de texto).
   - Espaciados (margenes, paddings, gaps).
   - Colores (fondos, bordes, estados).
   - Iconografia (tamano, posicion, color).
   - Componentes especificos de la pantalla.

### 4. Clasificar diferencias
Para cada diferencia encontrada:

**P0 - Bloqueante** (impide avanzar):
- Color corporativo incorrecto (ej: acento no es `#ec8228`).
- Layout completamente distinto (columnas invertidas, componente faltante).
- Componente no renderizado.
- Flujo roto (boton que no aparece, link muerto).
- Tipografia de encabezado con familia/peso radicalmente diferente.

**P1 - Visible** (debe resolverse antes del cierre final):
- Spacing de 4px+ de desviacion.
- Peso de fuente incorrecto (400 vs 600).
- Color de estado incorrecto (hover, badge).
- Borde o radio diferente.
- Icono con tamano incorrecto.

**P2 - Refinado** (resolver en bloque B7):
- Micro-diferencia de 1-2px.
- Opacidad ligeramente distinta.
- Transicion con timing ligeramente diferente.
- Letter-spacing de 0.5px de diferencia.

### 5. Documentar diferencias
Para cada diferencia:
```markdown
- **[P{N}]** {pantalla} / {componente}: {descripcion}
  - Legacy: {valor}
  - Actual: {valor}
  - Afecta: {breakpoints afectados}
```

### 6. Emitir veredicto
- **PASS**: P0 = 0.
- **FAIL**: P0 > 0. Listar TODOS los P0 que deben resolverse.

### 7. Generar reporte
Producir `VISUAL_REGRESSION_REPORT.md` con formato estandar (ver plantilla en `docs/cursor/templates/`).

## Criterios de aceptacion

- [ ] Capturas realizadas en 6 configuraciones (4 claro + 2 dark).
- [ ] CADA diferencia clasificada con prioridad.
- [ ] P0 = 0 para veredicto PASS.
- [ ] Reporte generado con formato estandar.
- [ ] Evidencias referenciadas.

## Output estandar

Archivo: `VISUAL_REGRESSION_REPORT.md`
Ubicacion sugerida: `docs/cursor/reports/` (crear carpeta si no existe).

Veredicto: `PASS` o `FAIL` (comunicar explicitamente al orquestador).
