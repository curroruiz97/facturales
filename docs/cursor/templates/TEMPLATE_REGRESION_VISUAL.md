# Informe de Regresion Visual - {YYYY-MM-DD}

Proyecto: Facturales
Tipo: {BLOQUE | GLOBAL}
Bloque: {B1|B2|...|GLOBAL}
Ejecutado por: {AGENTE}

---

## Resumen ejecutivo

- **Pantallas verificadas**: {N}
- **P0 abiertos**: {N}
- **P1 abiertos**: {N}
- **P2 abiertos**: {N}
- **Veredicto global**: **{PASS|FAIL}**

> PASS requiere P0 = 0 en todas las pantallas verificadas.

---

## Matriz de resultados

| # | Pantalla | Ruta | Claro 1920 | Claro 1280 | Claro 768 | Claro 390 | Dark 1920 | Dark 390 | P0 | P1 | P2 | Veredicto |
|---|----------|------|-----------|-----------|----------|----------|----------|---------|----|----|-------|-----------|
| 1 | | | | | | | | | | | | |
| 2 | | | | | | | | | | | | |
| 3 | | | | | | | | | | | | |
| 4 | | | | | | | | | | | | |
| 5 | | | | | | | | | | | | |

Leyenda: OK = sin diferencias | P1 = diferencia visible | P2 = micro-ajuste | FAIL = P0 detectado

---

## Detalle de diferencias por pantalla

### {PANTALLA_1} ({RUTA})

#### P0 - Bloqueante
| # | Componente | Descripcion | Legacy | Actual | Breakpoints |
|---|------------|-------------|--------|--------|-------------|
| | | | | | |

#### P1 - Visible
| # | Componente | Descripcion | Legacy | Actual | Breakpoints |
|---|------------|-------------|--------|--------|-------------|
| | | | | | |

#### P2 - Refinado
| # | Componente | Descripcion | Legacy | Actual | Breakpoints |
|---|------------|-------------|--------|--------|-------------|
| | | | | | |

---

### {PANTALLA_2} ({RUTA})

#### P0 - Bloqueante
(Sin diferencias P0)

#### P1 - Visible
| # | Componente | Descripcion | Legacy | Actual | Breakpoints |
|---|------------|-------------|--------|--------|-------------|
| | | | | | |

#### P2 - Refinado
| # | Componente | Descripcion | Legacy | Actual | Breakpoints |
|---|------------|-------------|--------|--------|-------------|
| | | | | | |

---

## Evidencias

| Pantalla | Breakpoint | Modo | Referencia |
|----------|-----------|------|------------|
| | 1920px | claro | {enlace_o_ruta} |
| | 1920px | dark | {enlace_o_ruta} |
| | 390px | claro | {enlace_o_ruta} |

---

## Acciones requeridas

### P0 (bloqueantes - resolver inmediatamente)
| # | Pantalla | Descripcion | Asignado a |
|---|----------|-------------|------------|
| | | | |

### P1 (visibles - resolver antes de cierre)
| # | Pantalla | Descripcion | Bloque |
|---|----------|-------------|--------|
| | | | |

### P2 (refinados - resolver en B7)
| # | Pantalla | Descripcion |
|---|----------|-------------|
| | | |

---

## Verificacion de entorno

- Navegador: {Chrome/Firefox/Edge} v{version}
- Resolucion: {resoluciones verificadas}
- Servidor: `npm run dev` en localhost:{puerto}
- Datos: {con datos / sin datos / mixto}
- Fecha verificacion: {YYYY-MM-DD HH:MM}

---

## Veredicto global: **{PASS|FAIL}**

{Si FAIL: "No se puede avanzar al siguiente bloque. Resolver P0 listados arriba."}
{Si PASS: "Bloque aprobado visualmente. Proceder con gate funcional."}
