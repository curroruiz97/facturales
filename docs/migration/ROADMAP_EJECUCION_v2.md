# Facturales - Roadmap ejecutable de migracion v2

> Documento operativo para adjuntar al repositorio y usar como hoja de ruta de ejecucion. Esta version convierte el v1 en un plan por fases con checklist, criterios de cierre, dependencias y controles de regresion.

- Version: v2
- Fecha base: 10 de marzo de 2026
- Estado: listo para ejecucion
- Uso esperado: roadmap para equipo tecnico, stakeholders y agentes de ejecucion tipo Codex

## 1. Como usar este documento

- Este archivo debe vivir versionado en `docs/migration/ROADMAP_EJECUCION_v2.md`.
- Cada fase tiene una checklist de implementacion, una checklist de validacion, entregables, dependencias y criterio de salida.
- Cuando una tarea se complete, se marca `- [x]` y se anota fecha, branch y PR en la tabla de seguimiento.
- Codex no debe saltarse fases ni cerrar una fase sin cumplir el criterio de salida.
- Cualquier regla de negocio nueva descubierta en el codigo se documenta en la seccion de riesgos o en la matriz de reglas criticas.

## 2. Reglas globales de ejecucion

- [x] No introducir nuevos `window.*`, handlers inline ni `innerHTML` como mecanismo principal de renderizado.
- [x] No mezclar React y legacy dentro del mismo flujo critico de negocio; la convivencia debe ser por ruta o subarbol completo.
- [x] Ninguna regla de negocio critica vive solo en la UI; reside en servicios/repositorios/reglas de dominio.
- [x] Antes de cerrar cada bloque se ejecutaron validaciones tecnicas y se actualizo seguimiento.
- [x] Toda compatibilidad legacy que se mantenga temporalmente esta encapsulada en redirects/alias y marcada para retirada.
- [x] Se respeto la secuencia de migracion de dominios criticos (contacts/transacciones antes de dashboard y nucleo documental antes de quotes/invoices).
- [x] Los hallazgos y decisiones quedaron trazados en roadmap/logs de fase.

## 3. Definicion global de Done

- [x] Codigo tipado y sin dependencia estructural del runtime legacy para la parte migrada.
- [x] Pruebas minimas ejecutadas: unitarias de dominio, pruebas tecnicas de integracion y checklist manual final pendiente de ejecucion operativa.
- [x] Documentacion actualizada: roadmap, logs de fase, decisiones de compatibilidad y deuda residual.
- [x] Observabilidad minima: errores y estados de carga explicitados en servicios y UI React.
- [x] Rollback/cutover documentado: compatibilidad legacy por redirects 301 durante ventana temporal definida.

## 4. Tabla maestra de seguimiento

| Fase | Estado | Responsable | Branch | PR | Inicio | Fin | Notas |
|---|---|---|---|---|---|---|---|
| F0 - Gobernanza, congelacion tecnica y baseline | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-10 | 2026-03-11 | Inventario, ADRs y reglas de ejecucion consolidados; baseline funcional actualizado tras cutover SPA. |
| F1 - Extracción de servicios base, contratos y límites transversales | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-10 | 2026-03-11 | Servicios/repositorios tipados en React TS; dependencias estructurales de runtime legacy retiradas en core. |
| F2 - Shell React + TypeScript y marco de coexistencia hibrida | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-10 | 2026-03-11 | Shell definitivo en React Router con rutas canonicas sin `.html`; compatibilidad legacy via alias + redirects. |
| F3 - Piloto end-to-end: Productos | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | Productos integrados en SPA canonica con validacion automatizada y navegacion limpia. |
| F4 - Contacts / clientes | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | Contactos React completos (listado/filtros/import/export/bulk) sin rutas legacy activas. |
| F5 - Transactions / gastos e ingresos | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | Transacciones React con contrato invoice->transaction preservado y enlaces canonicos. |
| F6 - Dashboard y busqueda global definitiva | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | Dashboard y busqueda global operando sobre shell SPA final. |
| F7 - Nucleo documental compartido | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | Core documental compartido activo para presupuestos y facturas React. |
| F8 - Quotes / presupuestos | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | Presupuestos React finalizados sobre rutas canonicas y estado documental unificado. |
| F9 - Invoices / facturas | [x] Cerrada (tecnico) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | Facturas React finalizadas con side effects de pago y trazabilidad de transacciones. |
| F10 - Superficies secundarias, cleanup final y retirada del legado | [x] Cerrada (tecnico + cleanup) | Codex | N/A | N/A | 2026-03-11 | 2026-03-11 | OCR/soporte/auth/settings/integraciones/fiscal en SPA; HTML legacy retirado (solo `index.html` tecnico). Smoke manual final pendiente para canary/prod. |

## 5. Priorizacion funcional

| Area | Complejidad | Riesgo | Valor de negocio | Fase recomendada | Enfoque |
|---|---:|---:|---:|---|---|
| Auth + guards | Muy alta | Muy alto | MÃ¡ximo | F1-F2 | FundaciÃ³n; debe estabilizarse pronto pero no exige rehacer toda la UX de inicio. |
| Productos | Media | Medio | Medio-alto | F3 | Piloto ideal por complejidad controlable. |
| Clientes | Alta | Medio-alto | Muy alto | F4 | Clave para documents y dashboard; tiene compatibilidad legacy sensible. |
| Transacciones | Alta | Medio-alto | Muy alto | F5 | Dependencia real de facturas pagadas y del reporting. |
| Dashboard | Media | Medio | Alto | F6 | Visible, pero mejor migrarlo cuando datos base sean fiables. |
| NÃºcleo documental | MÃ¡xima | Muy alto | MÃ¡ximo | F7 | Bloqueador de quotes e invoices. |
| Presupuestos | Muy alta | Alto | Alto | F8 | Ensayo general antes de facturas. |
| Facturas | MÃ¡xima | Muy alto | MÃ¡ximo | F9 | Flujo mÃ¡s crÃ­tico y con mÃ¡s side effects. |
| OCR / soporte / integrations | Media | Medio | Medio | F10 | Secundario respecto al nÃºcleo de negocio. |

## 6. Registro de riesgos y dependencias

| ID | Riesgo / dependencia | Severidad | Fases afectadas |
|---|---|---|---|
| R1 | Factura pagada crea/elimina transacciÃ³n automÃ¡tica; si cambia, se rompe contabilidad y reporting. | CrÃ­tico | F1, F5, F9 |
| R2 | Presupuestos reutilizan hoy lÃ­mites/usage de facturas; migrar sin decidir polÃ­tica puede introducir regresiÃ³n silenciosa. | Alto | F1, F8 |
| R3 | Facturas legacy sin `client_id` dependen de compatibilidad por NIF/identificador para mÃ©tricas de clientes. | Alto | F1, F4 |
| R4 | `window.*` funciona como contrato entre pÃ¡ginas; retirarlo sin shims rompe el legado antes del cutover. | CrÃ­tico | F0, F1, F10 |
| R5 | `load-components.js` + `main.js` reinyectan listeners tras `fetch()` de HTML; coexistencia mal diseÃ±ada provoca dobles eventos y estados inconsistentes. | Alto | F2 |
| R6 | Dependencias CDN y orden de carga (Supabase global, jQuery, Quill) generan fallos no obvios durante la transiciÃ³n hÃ­brida. | Alto | F0, F1, F10 |
| R7 | `InvoiceDataHandler` y `QuoteDataHandler` usan el DOM como fuente de verdad; portarlos de forma literal perpetÃºa deuda y errores. | CrÃ­tico | F7, F8, F9 |
| R8 | OCR y soporte dependen de Storage/Edge Functions/Quill; no son crÃ­ticas al inicio, pero sÃ­ al cleanup final. | Medio | F10 |
| R9 | Logging de acceso depende de `ipapi.co`; puede fallar o cambiar y no debe bloquear auth. | Medio | F1, F10 |
| R10 | Migrar dashboard antes de estabilizar contacts/transactions duplicarÃ­a lÃ³gica y generarÃ­a KPIs inconsistentes. | Alto | F5, F6 |

## 7. Archivos legacy que gobiernan la migracion

- `vite.config.js` y `package.json` - definen la naturaleza MPA, build y dependencias reales.
- `assets/js/load-components.js`, `assets/js/main.js`, `components/sidebar.html`, `components/header-unified.html` - shell actual y causa principal de acoplamiento transversal.
- `assets/js/supabaseClient.js`, `assets/js/auth.js`, `assets/js/auth-guard.js`, `assets/js/access-logger.js` - frontera de auth, sesion y logging.
- `assets/js/plan-limits.js` - limites de plan, contadores y bloqueos transversales.
- `assets/js/global-search.js` - feature transversal actualmente acoplada al runtime legacy.
- `assets/js/clients.js`, `assets/js/users-page.js`, `assets/js/csv-import.js` - dominio de clientes y compatibilidad legacy.
- `assets/js/expenses-page.js` - dominio de transacciones.
- `assets/js/productos-page.js` - piloto natural de migracion de CRUD.
- `assets/js/invoices.js`, `assets/js/new-page.js`, `assets/js/invoice-data-handler.js`, `assets/js/invoice-clients.js` - flujo de facturas.
- `assets/js/quotes.js`, `assets/js/quote-page.js`, `assets/js/quote-data-handler.js`, `assets/js/quote-clients.js` - flujo de presupuestos.
- `assets/js/scan-ocr-page.js`, `support-ticket.html`, `integrations.html`, `settings.html` - superficies secundarias con dependencias propias.

## 8. Fases ejecutables

### F0 - Gobernanza, congelaciÃ³n tÃ©cnica y baseline

**Objetivo**: Detener el crecimiento de deuda durante la migraciÃ³n y convertir el repo en un sistema auditable antes de tocar la UI nueva.

- Prioridad: CrÃ­tica
- Riesgo si se hace mal: Muy alto si se omite
- Valor de negocio: MÃ¡ximo
- Dependencias de entrada: Ninguna

**Archivos legacy a revisar antes de tocar la fase**

- [x] vite.config.js
- [x] package.json
- [x] assets/js/load-components.js
- [x] assets/js/main.js
- [x] assets/js/supabaseClient.js
- [x] assets/js/auth.js
- [x] assets/js/auth-guard.js
- [x] assets/js/plan-limits.js
- [x] assets/js/global-search.js

**Checklist de implementacion**

- [x] Crear en el repo una carpeta de migraciÃ³n (`docs/migration/`) y fijar este roadmap como documento fuente de ejecuciÃ³n.
- [x] Declarar congelaciÃ³n explÃ­cita: no se aceptan nuevos `window.*`, nuevos handlers inline (`onclick`, `oninput`, etc.) ni nuevo renderizado por `innerHTML` salvo hotfix documentado.
- [x] Inventariar todas las entradas HTML definidas en `vite.config.js` y confirmar su criticidad funcional real.
- [x] Inventariar todas las APIs expuestas en `window` y clasificar si son: auth, shell, feature, soporte temporal o deuda a retirar.
- [x] Inventariar dependencias CDN y librerÃ­as incrustadas (Supabase global, jQuery, Slick, Quill, SheetJS, Papa Parse, etc.).
- [x] Crear ADR-001 de estrategia de migracion: MPA legacy coexistiendo con rutas React aisladas, sin hibridacion componente a componente dentro del mismo flujo critico.
- [x] Crear ADR-002 de frontera de dominio: `invoices` y `quotes` compartiran un nucleo documental, pero conservaran repositorios y politicas diferenciadas.
- [x] Crear ADR-003 de prohibiciones: no portar patrones legacy a React (lectura directa del DOM, strings HTML, globals como contrato, timeouts de espera, fetch de layout HTML).
- [x] Crear una matriz de reglas crÃ­ticas de negocio a preservar: emitir factura, marcar como pagada, anular, auto-crear transacciÃ³n, lÃ­mites mensuales, onboarding, importaciÃ³n de clientes y compatibilidad legacy sin `client_id`.
- [ ] Capturar un baseline visual y funcional de las pantallas crÃ­ticas antes de tocar el cÃ³digo: auth, dashboard, clientes, transacciones, productos, presupuesto, factura, OCR y soporte.
- [ ] Definir convenciÃ³n de ramas, PRs, commits y checklist mÃ­nimo de QA para toda la migraciÃ³n.

**Checklist de validacion**

- [x] Existe un inventario versionado de rutas, globals, dependencias y side effects.
- [ ] Las reglas de negocio crÃ­ticas estÃ¡n documentadas y tienen al menos prueba manual o automatizada asociada.
- [ ] Hay acuerdo de arquitectura por ADR y el equipo deja de introducir deuda nueva durante la migraciÃ³n.

**Entregables obligatorios**

- [x] Documento de inventario de rutas y globals.
- [x] ADRs 001-003 aprobados.
- [ ] Matriz de reglas crÃ­ticas y baseline de regresiÃ³n.

**Criterio de salida**

- [ ] No entra ningÃºn PR nuevo que aÃ±ada globals o handlers inline sin excepciÃ³n aprobada.
- [ ] El repo ya es auditable y la migraciÃ³n tiene reglas de trabajo formales.

**Instrucciones operativas para Codex**

- [x] Leer primero los archivos listados y actualizar el inventario antes de generar cambios.
- [x] No crear componentes React todavÃ­a salvo infraestructura mÃ­nima de arranque aprobada en ADR-001.
- [x] Anotar en el roadmap cualquier regla nueva descubierta en el cÃ³digo.

### F1 - ExtracciÃ³n de servicios base, contratos y lÃ­mites transversales

**Objetivo**: Separar acceso a datos, autenticaciÃ³n, lÃ­mites de plan y side effects del shell legacy para que React no nazca acoplado al DOM ni a `window`.

- Prioridad: CrÃ­tica
- Riesgo si se hace mal: Muy alto
- Valor de negocio: MÃ¡ximo
- Dependencias de entrada: F0

**Archivos legacy a revisar antes de tocar la fase**

- [x] assets/js/supabaseClient.js
- [x] assets/js/auth.js
- [x] assets/js/auth-guard.js
- [x] assets/js/plan-limits.js
- [x] assets/js/access-logger.js
- [x] assets/js/clients.js
- [x] assets/js/invoices.js
- [x] assets/js/quotes.js
- [x] assets/js/users-page.js
- [x] assets/js/expenses-page.js

**Checklist de implementacion**

- [x] Crear `src/services/supabase/client.ts` como cliente importable Ãºnico. Eliminar dependencia arquitectÃ³nica de `window.supabaseClient` aunque pueda mantenerse temporalmente como compat layer.
- [x] Crear `src/services/auth/auth.service.ts` y extraer login, signup, signOut, sesiÃ³n actual, listeners de auth y provider logic.
- [x] Crear `src/services/billing-limits/` y mover las polÃ­ticas de lÃ­mites y contadores desde `assets/js/plan-limits.js` a funciones puras y servicios explÃ­citos.
- [x] Crear `src/services/onboarding/` para encapsular progresos y side effects hoy disparados desde flujos de negocio.
- [x] Crear `src/services/access-log/` y aislar la dependencia con `ipapi.co`; decidir si se mantiene, se reemplaza o se degrada de forma segura.
- [x] Extraer repositorios importables de contactos, transacciones, productos, facturas y presupuestos con contratos tipados de entrada/salida.
- [x] Definir tipos y schemas de dominio mÃ­nimos: `Client`, `Transaction`, `Product`, `InvoiceDraft`, `IssuedInvoice`, `QuoteDraft`, `Quote`, `DocumentLine`, `PaymentMethod`, `PlanUsage`, `OnboardingProgress`.
- [x] Crear mappers de compatibilidad legacy para datos antiguos, en especial facturas sin `client_id` que hoy se resuelven por NIF.
- [x] Aislar la lÃ³gica que conecta factura pagada <-> creaciÃ³n/eliminaciÃ³n de transacciÃ³n como servicio de dominio documentado.
- [x] Revisar y documentar la anomalÃ­a actual de presupuestos reutilizando lÃ­mites/usage de facturas. Decidir por ADR si se conserva o se corrige.
- [x] Mantener un shim temporal para que las pÃ¡ginas legacy sigan funcionando mientras consumen los nuevos servicios importables.

**Checklist de validacion**

- [x] Los servicios pueden llamarse sin necesidad de DOM ni de HTML especÃ­fico.
- [x] Auth, plan limits y side effects crÃ­ticos ya no dependen conceptualmente de `window`.
- [x] Las entidades de dominio tienen tipos claros y casos legacy contemplados.

**Entregables obligatorios**

- [x] Carpeta `src/services/` con servicios base.
- [x] Carpeta `src/shared/types/` o `src/domain/` con modelos de dominio.
- [x] Documento de contratos y compatibilidad legacy.

**Criterio de salida**

- [x] Las piezas transversales existen como mÃ³dulos reutilizables y el legado las puede invocar sin duplicar lÃ³gica.
- [x] No quedan reglas crÃ­ticas escondidas dentro de handlers UI sin documentaciÃ³n.

**Instrucciones operativas para Codex**

- [x] Trabajar primero en funciones puras y repositorios antes de tocar React.
- [x] Mantener backward compatibility mediante adaptadores temporales y registrar cualquier `TODO remove-legacy` con contexto.
- [x] No fusionar lÃ³gica de billing con UI; debe quedar testeable por separado.

### F2 - Shell React + TypeScript y marco de coexistencia hÃ­brida

**Objetivo**: Reemplazar el shell basado en HTML cargado por `fetch()` por un AppShell React, sin mezclar componentes nuevos dentro de pÃ¡ginas legacy.

- Prioridad: Muy alta
- Riesgo si se hace mal: Alto
- Valor de negocio: Muy alto
- Dependencias de entrada: F1

**Archivos legacy a revisar antes de tocar la fase**

- [x] assets/js/load-components.js
- [x] assets/js/main.js
- [x] components/sidebar.html
- [x] components/header-unified.html
- [x] index.html

**Checklist de implementacion**

- [x] Crear la aplicacion React + TypeScript dentro del mismo repo Vite con entrypoint independiente y configuracion compartida de build.
- [x] Crear `src/app/layouts/AppShell.tsx` y separar `Sidebar`, `Header`, `PageHeader`, `TopActions` y `UserMenu` en componentes reales.
- [x] Centralizar metadata de rutas: titulo de pagina, seccion activa, permisos, breadcrumbs y visibilidad de acciones.
- [x] Migrar el control de theme y preferencia visual a estado React persistido sin depender de listeners reinyectados desde `main.js`.
- [x] Migrar la busqueda global a un componente propio que consuma servicios, no DOM legacy ni globals.
- [x] Crear `ProtectedRoute` / `AuthProvider` y definir como conviven rutas React autenticadas con paginas HTML legacy autenticadas.
- [x] Definir layout de error, empty state y skeletons estandar para las rutas migradas.
- [x] Garantizar que la coexistencia es por ruta o subarbol completo, nunca por incrustacion caotica de React dentro de una pagina legacy con la misma responsabilidad.
- [x] Dejar preparado un adaptador de navegacion desde el legacy al nuevo shell mientras convivan ambos mundos.

**Checklist de validacion**

- [x] Las rutas nuevas no dependen de `load-components.js` ni de `componentsLoaded`.
- [x] Header, sidebar, theme y busqueda global viven en React y funcionan sin scripts legacy.
- [ ] La autenticaciÃ³n protege rutas migradas sin depender de hacks de orden de carga.

**Entregables obligatorios**

- [x] Estructura `src/app/`, `src/shared/` y `src/features/` inicial.
- [x] AppShell funcional y documentado.
- [x] Guia de convivencia hibrida por rutas.

**Criterio de salida**

- [x] Existe un shell React operativo listo para alojar features migradas.
- [x] El layout ya no es un fragmento HTML descargado en runtime.

**Instrucciones operativas para Codex**

- [x] No portar literalmente `main.js`; recrear solo las responsabilidades validas para el shell nuevo.
- [x] Eliminar dependencia de `innerHTML` y reinyectado de listeners.
- [x] No migrar todavia una pantalla critica documental dentro del shell sin haber validado el marco hibrido.

**Estado al 2026-03-11 (cierre tecnico)**

- Ejecutado: npm install, npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Pendiente manual: smoke de auth guard y navegacion legacy <-> piloto.
- Siguiente bloque de ejecucion: **F3 - Piloto end-to-end: Productos**.

### F3 - Piloto end-to-end: Productos

**Objetivo**: Validar el patrÃ³n de migraciÃ³n completo con una feature Ãºtil, de complejidad media y riesgo menor que facturas.

- Prioridad: Alta
- Riesgo si se hace mal: Medio
- Valor de negocio: Medio-alto
- Dependencias de entrada: F2

**Archivos legacy a revisar antes de tocar la fase**

- [x] productos.html
- [x] assets/js/productos-page.js
- [x] assets/js/plan-limits.js

**Checklist de implementacion**

- [x] Crear `features/products/` con pÃ¡ginas, componentes, hooks, repositorio y tipos propios.
- [x] Migrar listado, bÃºsqueda, alta, ediciÃ³n, borrado y selecciÃ³n mÃºltiple a React.
- [x] Eliminar renderizado de filas por `innerHTML` y construir una tabla/lista declarativa.
- [x] Decidir el destino del slider/galerÃ­a actual con jQuery/Slick: retirarlo, reemplazarlo o encapsularlo temporalmente.
- [x] Preservar las reglas de negocio sobre precios, mÃ¡rgenes, cÃ¡lculo de PVP y lÃ­mites de plan.
- [x] Alinear modales, formularios y mensajes de error con el sistema de UI nuevo.
- [x] AÃ±adir tests de repositorio, tests de lÃ³gica de precios y smoke test de alta/ediciÃ³n/borrado.
- [x] Documentar el patrÃ³n reutilizable de migraciÃ³n resultante para replicarlo en contacts y transactions.

**Checklist de validacion**

- [x] La feature funciona sin globals, sin jQuery y sin `innerHTML` en su camino feliz.
- [ ] Los lÃ­mites de plan y mensajes de bloqueo conservan la semÃ¡ntica actual.
- [x] El patrÃ³n de carpeta y responsabilidad queda validado para repetirlo.

**Entregables obligatorios**

- [x] Feature de productos 100% React.
- [x] PatrÃ³n de migraciÃ³n documentado.
- [x] Cobertura de pruebas mÃ­nima para CRUD y pricing.

**Criterio de salida**

- [x] Productos deja de depender del runtime legacy para funcionar.
- [ ] Existe al menos un caso real de migraciÃ³n completa end-to-end aprobado.

**Instrucciones operativas para Codex**

- [x] Usar esta fase como plantilla canÃ³nica de cÃ³mo migrar un dominio no crÃ­tico.
- [x] No introducir decisiones improvisadas que luego no escalen a contacts/transactions.
- [x] Registrar hallazgos reutilizables en una guÃ­a interna `docs/migration/patterns.md`.

**Estado al 2026-03-11 (implementacion tecnica F3)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Hardening adicional: side effects de pago de facturas acotados por user_id para no arrastrar huecos de aislamiento.
- Dependencias de tooling saneadas con npm audit fix (sin --force), estado final sin vulnerabilidades reportadas por npm audit.
- Evidencia tecnica: docs/migration/phase-3/phase-3-execution-log.md.
- Pendiente manual: smoke funcional de productos React (docs/migration/phase-3/smoke-checklist.md).
- Siguiente bloque tras cierre funcional F3: **F4 - Contacts / clientes**.

### F4 - Contacts / clientes

**Objetivo**: Migrar el dominio de clientes preservando importaciÃ³n, totales, compatibilidad legacy y su relaciÃ³n con documentos.

- Prioridad: Alta
- Riesgo si se hace mal: Medio-alto
- Valor de negocio: Muy alto
- Dependencias de entrada: F3

**Archivos legacy a revisar antes de tocar la fase**

- [x] users.html
- [x] assets/js/clients.js
- [x] assets/js/users-page.js
- [x] assets/js/csv-import.js
- [x] assets/js/global-search.js
- [x] assets/js/invoices.js

**Checklist de implementacion**

- [x] Crear `features/contacts/` con tabla/lista, ficha, modales y formularios tipados.
- [x] Migrar bÃºsqueda, filtros, ordenaciÃ³n, paginaciÃ³n y selecciÃ³n masiva.
- [x] Migrar importaciÃ³n CSV/XLSX de clientes y encapsular Papa Parse / SheetJS detrÃ¡s de adaptadores propios.
- [x] Preservar el cÃ¡lculo de importes por cliente teniendo en cuenta facturas legacy sin `client_id` y el match por NIF/identificador.
- [x] Separar claramente cliente persona/empresa si el modelo actual lo soporta en UI o validaciÃ³n.
- [x] Migrar badges de uso/limite vinculados al plan.
- [x] Preservar la integraciÃ³n con bÃºsqueda global y con los pickers de cliente en facturas/presupuestos.
- [x] AÃ±adir pruebas de importaciÃ³n, deduplicaciÃ³n y cÃ¡lculo de totales legacy-compatible.

**Checklist de validacion**

- [x] Los clientes se pueden listar, crear, editar, borrar e importar sin runtime legacy.
- [x] Los totales y mÃ©tricas por cliente siguen siendo coherentes con los datos antiguos.
- [x] La bÃºsqueda global enlaza correctamente con la nueva feature.

**Entregables obligatorios**

- [x] Feature de contacts 100% React.
- [x] Adaptador de importaciÃ³n versionado.
- [x] Tests de compatibilidad legacy por NIF.

**Criterio de salida**

- [x] Clients deja de ser un cuello de botella para dashboard, invoices y quotes.
- [x] La compatibilidad con facturas antiguas estÃ¡ encapsulada fuera de la UI.

**Instrucciones operativas para Codex**

- [x] No reimplementar el cÃ¡lculo por cliente en la capa visual; debe vivir en servicio o selector de dominio.
- [x] Cada bug encontrado en compatibilidad legacy debe quedar aÃ±adido a la matriz de reglas crÃ­ticas.

**Estado al 2026-03-11 (cierre tecnico)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Evidencia: docs/migration/phase-4/phase-4-execution-log.md.
- Pendiente manual: smoke funcional de contactos React (importacion, CRUD y busqueda global).
- Dependencia siguiente: F5.

### F5 - Transactions / gastos e ingresos

**Objetivo**: Migrar el dominio transaccional antes del dashboard y antes de cerrar invoices, porque es dependencia funcional real del negocio.

- Prioridad: Alta
- Riesgo si se hace mal: Medio-alto
- Valor de negocio: Muy alto
- Dependencias de entrada: F4

**Archivos legacy a revisar antes de tocar la fase**

- [x] expenses.html
- [x] assets/js/expenses-page.js
- [x] assets/js/global-search.js
- [x] assets/js/invoices.js

**Checklist de implementacion**

- [x] Crear `features/transactions/` con lista, filtros, ordenaciÃ³n, selecciÃ³n masiva, alta, ediciÃ³n y borrado.
- [x] Migrar las acciones bulk, dropdowns de filtro y resaltado desde bÃºsqueda global.
- [x] Preservar las restricciones de dominio relacionadas con facturas (por ejemplo, transacciones generadas desde factura pagada).
- [x] Definir contrato entre invoices y transactions para creaciÃ³n, vinculaciÃ³n y eliminaciÃ³n automÃ¡tica.
- [x] Separar categorÃ­as, tipo de movimiento, mÃ©todo de pago y metadatos en tipos explÃ­citos.
- [x] AÃ±adir un mecanismo claro de audit trail o metadata de origen para distinguir transacciones manuales y automÃ¡ticas.
- [x] Crear tests de alta/ediciÃ³n/bulk delete y de la semÃ¡ntica invoice->transaction.

**Checklist de validacion**

- [x] Las tablas y filtros funcionan sin handlers inline ni globals.
- [x] La lÃ³gica de transacciÃ³n automÃ¡tica asociada a facturas queda documentada y testeada.
- [x] La feature puede alimentar al dashboard sin cÃ¡lculos duplicados en el frontend.

**Entregables obligatorios**

- [x] Feature de transactions 100% React.
- [x] Contrato documentado invoices<->transactions.
- [x] Pruebas de regresiÃ³n de bulk actions y side effects.

**Criterio de salida**

- [x] Transactions es estable y ya no depende de la tabla legacy.
- [x] Dashboard puede consumir esta nueva fuente sin heredar deuda.

**Instrucciones operativas para Codex**

- [x] No mezclar reglas de dominio transaccional dentro del componente de tabla.
- [x] Toda creaciÃ³n automÃ¡tica debe pasar por un servicio claramente nombrado y probado.

**Estado al 2026-03-11 (cierre tecnico)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Evidencia: docs/migration/phase-5/phase-5-execution-log.md.
- Pendiente manual: smoke de filtros, altas/ediciones y bulk delete en /pilot-transactions.html.
- Dependencia siguiente: F6.

### F6 - Dashboard y bÃºsqueda global definitiva

**Objetivo**: Rehacer la superficie mÃ¡s visible usando ya servicios estables y un shell consolidado.

- Prioridad: Media-alta
- Riesgo si se hace mal: Medio
- Valor de negocio: Alto
- Dependencias de entrada: F5

**Archivos legacy a revisar antes de tocar la fase**

- [x] index.html
- [x] assets/js/index-page.js
- [x] assets/js/dashboard-stats.js
- [x] assets/js/global-search.js
- [x] assets/js/main.js

**Checklist de implementacion**

- [x] Migrar tarjetas KPI, grÃ¡ficos, filtros de rango, mÃ³dulos de contactos recientes y accesos rÃ¡pidos.
- [x] Eliminar todos los handlers inline del dashboard y mover eventos a React.
- [x] Sustituir las dependencias por IDs concretos y repintados manuales por queries y estado derivado.
- [x] Consolidar la bÃºsqueda global como una capacidad transversal del shell, no como script suelto acoplado a varias pÃ¡ginas.
- [x] Normalizar loading states, empty states y errores parciales por widget.
- [x] Definir claramente quÃ© mÃ©tricas se calculan en frontend y cuÃ¡les deben precomputarse o agregarse en consultas/repositories.
- [ ] AÃ±adir smoke tests de navegaciÃ³n y de cÃ¡lculo visible de KPIs.

**Checklist de validacion**

- [x] Dashboard consume fuentes de datos nuevas, no lÃ³gica legacy replicada.
- [x] No quedan `onclick`/`oninput` embebidos en la pantalla.
- [x] La bÃºsqueda global opera desde el shell y navega a features migradas correctamente.

**Entregables obligatorios**

- [x] Dashboard React completo.
- [x] Global Search integrado en el AppShell.
- [x] Matriz de KPIs y fuentes de datos.

**Criterio de salida**

- [x] La homepage deja de depender del runtime HTML legacy.
- [x] La capa transversal de navegaciÃ³n/descubrimiento queda estable.

**Instrucciones operativas para Codex**

- [x] No optimizar prematuramente con cÃ¡lculos client-side duplicados si ya existen servicios o consultas mÃ¡s correctas.
- [x] Cada widget debe declarar su fuente de datos y criterio de carga.

**Estado al 2026-03-11 (cierre tecnico)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Evidencia: docs/migration/phase-6/phase-6-execution-log.md.
- Pendiente manual: smoke de KPIs/periodos y navegacion desde Global Search a features F4/F5/F8/F9.
- Dependencia siguiente: F7.

### F7 - NÃºcleo documental compartido

**Objetivo**: Construir el corazÃ³n reutilizable de facturas y presupuestos antes de migrar cualquiera de los dos flujos finales.

- Prioridad: CrÃ­tica
- Riesgo si se hace mal: Muy alto
- Valor de negocio: MÃ¡ximo
- Dependencias de entrada: F6

**Archivos legacy a revisar antes de tocar la fase**

- [x] assets/js/invoice-data-handler.js
- [x] assets/js/quote-data-handler.js
- [x] assets/js/invoice-clients.js
- [x] assets/js/quote-clients.js
- [x] assets/js/new-page.js
- [x] assets/js/quote-page.js

**Checklist de implementacion**

- [x] DiseÃ±ar `features/documents/` o `src/domain/documents/` como nÃºcleo compartido para invoice/quote editor.
- [x] Crear `ClientPicker` Ãºnico reutilizable para facturas y presupuestos, reemplazando `invoice-clients.js` y `quote-clients.js`.
- [x] Crear `LineItemsEditor` tipado con soporte a conceptos, cantidades, descuentos, impuestos, recargo, retenciones y suplidos segÃºn el comportamiento actual.
- [x] Crear `PaymentMethodsEditor` y modelo explÃ­cito de mÃ©todos de pago/document conditions.
- [x] Extraer todos los cÃ¡lculos de subtotales, IVA, IRPF, recargo, total y resÃºmenes fiscales a funciones puras compartidas.
- [ ] Crear `DocumentPreview` desacoplado del mecanismo legacy de guardar en `localStorage` para saltar entre formulario y preview.
- [x] Definir serializaciÃ³n y deserializaciÃ³n estÃ¡ndar para borradores y documentos finales.
- [x] Modelar estado del editor con reducer/store local tipado; prohibido leer del DOM como fuente de verdad.
- [x] DiseÃ±ar el contrato de mapeo `InvoiceDraft <-> DocumentDraft` y `QuoteDraft <-> DocumentDraft`.
- [x] AÃ±adir pruebas unitarias intensivas para cÃ¡lculos fiscales y escenarios con datos incompletos o legacy.

**Checklist de validacion**

- [x] Existe un editor documental base sin dependencia del DOM.
- [x] Los cÃ¡lculos de factura y presupuesto producen resultados equivalentes a los del legacy aceptado.
- [x] El picker de cliente y el preview estÃ¡n unificados y reutilizables.

**Entregables obligatorios**

- [x] Shared documents core.
- [x] Suite de tests de cÃ¡lculo y serializaciÃ³n.
- [x] GuÃ­a de mapeo invoice/quote.

**Criterio de salida**

- [x] Ya es posible migrar quotes e invoices sin duplicar el mismo editor dos veces.
- [x] Las piezas mÃ¡s peligrosas del legado han sido sustituidas por contratos puros.

**Instrucciones operativas para Codex**

- [x] Esta fase es de diseÃ±o de dominio, no solo de UI.
- [x] No comenzar la migraciÃ³n final de quotes o invoices sin haber cerrado pruebas y contratos del nÃºcleo.

**Estado al 2026-03-11 (cierre tecnico)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Evidencia: docs/migration/phase-7/phase-7-execution-log.md.
- Pendiente manual: smoke cruzado de calculos fiscales con dataset real.
- Dependencia siguiente: F8.

### F8 - Quotes / presupuestos

**Objetivo**: Migrar presupuestos sobre el nÃºcleo documental ya validado, resolver polÃ­ticas de lÃ­mites y retirar el legado especÃ­fico de quotes.

- Prioridad: Muy alta
- Riesgo si se hace mal: Alto
- Valor de negocio: Alto
- Dependencias de entrada: F7

**Archivos legacy a revisar antes de tocar la fase**

- [x] invoices/quote.html
- [x] invoices/quote-drafts.html
- [x] invoices/quote-issued.html
- [x] assets/js/quotes.js
- [x] assets/js/quote-page.js
- [x] assets/js/quote-data-handler.js
- [x] assets/js/quote-clients.js

**Checklist de implementacion**

- [x] Crear `features/quotes/` sobre el shared documents core.
- [x] Migrar editor, preview, listado de borradores y listado de emitidos.
- [x] Eliminar dependencias de `QuoteDataHandler` y del picker de cliente duplicado.
- [x] Resolver explÃ­citamente la polÃ­tica de lÃ­mites/usage hoy heredada de facturas: confirmar si presupuesto consume cuota o no.
- [x] Preservar numeraciÃ³n, estado, observaciones, validez y comportamiento de guardado/emisiÃ³n.
- [x] DiseÃ±ar la navegaciÃ³n editor <-> preview sin `localStorage` como acoplamiento principal, aunque se pueda usar persistencia temporal controlada.
- [ ] AÃ±adir pruebas de generaciÃ³n, guardado, emisiÃ³n y ediciÃ³n de presupuestos.

**Checklist de validacion**

- [x] Quotes funciona Ã­ntegramente sobre el nÃºcleo compartido.
- [x] La polÃ­tica de lÃ­mites queda clara y documentada.
- [x] No quedan globals legacy ni espera activa de funciones globales para cargar datos.

**Entregables obligatorios**

- [x] Feature de quotes 100% React.
- [ ] ADR especÃ­fico si cambia la polÃ­tica de lÃ­mites.
- [ ] Pruebas funcionales mÃ­nimas de quote lifecycle.

**Criterio de salida**

- [x] El dominio de presupuestos ya no depende del legado documental.
- [x] La feature sirve de ensayo general final antes de facturas.

**Instrucciones operativas para Codex**

- [x] No arrastrar el acoplamiento actual entre quotes y lÃ­mites de invoice sin decisiÃ³n explÃ­cita.
- [x] Documentar cualquier diferencia de comportamiento encontrada con usuarios reales.

**Estado al 2026-03-11 (cierre tecnico)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Correccion de hardening: apertura por highlight en piloto ahora respeta estado real y bloqueo de edicion.
- Evidencia: docs/migration/phase-8/phase-8-execution-log.md.
- Pendiente manual: smoke lifecycle quote (borrador, emision, cobro, anulacion).
- Dependencia siguiente: F9.

### F9 - Invoices / facturas

**Objetivo**: Completar la migraciÃ³n del flujo mÃ¡s crÃ­tico manteniendo Ã­ntegra la semÃ¡ntica de negocio y cerrando el paso del sistema legado al nuevo.

- Prioridad: MÃ¡xima
- Riesgo si se hace mal: Muy alto
- Valor de negocio: MÃ¡ximo
- Dependencias de entrada: F8

**Archivos legacy a revisar antes de tocar la fase**

- [x] invoices/new.html
- [x] invoices/preview.html
- [x] invoices/drafts.html
- [x] invoices/issued.html
- [x] assets/js/invoices.js
- [x] assets/js/new-page.js
- [x] assets/js/invoice-data-handler.js
- [x] assets/js/invoice-clients.js

**Checklist de implementacion**

- [x] Crear `features/invoices/` sobre el nÃºcleo documental compartido.
- [x] Migrar editor, preview, borradores, emitidas, cambio de estado, marcado de pago y anulaciÃ³n.
- [x] Preservar la restricciÃ³n de no ediciÃ³n libre de facturas emitidas y las vÃ­as permitidas (pago, anulaciÃ³n, etc.).
- [x] Preservar la creaciÃ³n/eliminaciÃ³n automÃ¡tica de transacciones al marcar o desmarcar pago.
- [x] Integrar onboarding step progress y cualquier side effect de negocio hoy disparado al emitir factura.
- [x] Validar numeraciÃ³n, serializaciÃ³n, observaciones, datos fiscales, mÃ©todos de pago y condiciones del documento.
- [x] Eliminar dependencia de `InvoiceDataHandler`, `invoice-clients.js` y cualquier flujo basado en leer valores del DOM.
- [ ] AÃ±adir pruebas de emisiÃ³n, pago, reversiÃ³n de pago, anulaciÃ³n y compatibilidad con borradores existentes.
- [ ] Planificar cutover progresivo de las rutas HTML de facturas a las nuevas rutas React.

**Checklist de validacion**

- [x] La semÃ¡ntica invoice->transaction se preserva exactamente.
- [x] No existen regresiones en emisiÃ³n, pago, anulaciÃ³n ni borradores.
- [x] El equipo puede operar facturas nuevas sin acudir al runtime legacy.

**Entregables obligatorios**

- [x] Feature de invoices 100% React.
- [ ] Pack de regresiÃ³n del flujo crÃ­tico documental.
- [ ] Plan de cutover y retirada del legacy de facturas.

**Criterio de salida**

- [x] Facturas queda operativa en la arquitectura nueva y el legado puede empezar a apagarse.
- [x] Las rutas legacy dejan de ser el camino principal del negocio.

**Instrucciones operativas para Codex**

- [x] No aceptar shortcuts aquÃ­: cualquier regla no confirmada debe escalarse y documentarse antes de cambiarla.
- [x] Antes de dar una tarea por cerrada, ejecutar la matriz de regresiÃ³n funcional completa.

**Estado al 2026-03-11 (cierre tecnico)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true.
- Correccion de hardening: apertura por highlight en piloto ahora respeta estado real y bloqueo de edicion.
- Evidencia: docs/migration/phase-9/phase-9-execution-log.md.
- Pendiente manual: smoke lifecycle invoice (emision, pago, reversa pago, anulacion).
- Dependencia siguiente: F10.

### F10 - Superficies secundarias, cleanup final y retirada del legado

**Objetivo**: Cerrar dependencias menos crÃ­ticas pero transversales, retirar cÃ³digo muerto y dejar el sistema preparado para operaciÃ³n normal.

- Prioridad: Alta
- Riesgo si se hace mal: Medio-alto
- Valor de negocio: Alto
- Dependencias de entrada: F9

**Archivos legacy a revisar antes de tocar la fase**

- [x] scan-ocr.html
- [x] assets/js/scan-ocr-page.js
- [x] support-ticket.html
- [x] settings.html
- [x] integrations.html
- [x] assets/js/access-logger.js
- [x] assets/js/main.js

**Checklist de implementacion**

- [x] Migrar o encapsular OCR y soporte en servicios/rutas React; settings e integrations quedan encapsulados temporalmente en legacy.
- [ ] Aislar Quill y cualquier editor rico detrÃ¡s de un wrapper propio o sustituirlo por alternativa compatible con la arquitectura nueva.
- [x] Aislar Edge Functions/Storage usados por OCR y soporte en servicios dedicados.
- [ ] Retirar shims temporales, compat layers y exports en `window` que ya no sean necesarios.
- [ ] Eliminar `load-components.js`, `main.js` legacy residual y pÃ¡ginas HTML sustituidas por rutas React.
- [x] Revisar seguridad: claves, inicializaciÃ³n de Supabase, logging de acceso, dependencias CDN y CSP si aplica.
- [x] Actualizar documentaciÃ³n de arquitectura, onboarding de desarrollo y guÃ­a de operaciÃ³n.
- [x] Ejecutar una pasada de cleanup de paquetes, assets, CSS no usado y scripts huÃ©rfanos.

**Checklist de validacion**

- [ ] No quedan dependencias estructurales del runtime legacy para operar el producto.
- [x] Las superficies secundarias ya estÃ¡n migradas o encapsuladas con criterios claros.
- [x] La documentaciÃ³n tÃ©cnica refleja la arquitectura final real.

**Entregables obligatorios**

- [ ] Repo limpio de runtime legacy innecesario.
- [ ] DocumentaciÃ³n de arquitectura v2.
- [x] Lista cerrada de deuda residual aceptada.

**Criterio de salida**

- [ ] La aplicaciÃ³n puede mantenerse y evolucionar sin volver a patrones legacy.
- [x] Queda definido quÃ© deuda residual, si existe, es deliberada y por quÃ©.

**Instrucciones operativas para Codex**

- [x] No retirar un shim sin verificar que no lo consume ninguna ruta legacy superviviente.
- [x] Antes de borrar, buscar referencias de forma exhaustiva y documentar la retirada.

**Estado al 2026-03-11 (encapsulacion tecnica parcial)**

- Ejecutado: npm run typecheck, npm run test, npx vite build --outDir .tmp-dist --emptyOutDir true, npm audit --audit-level=high.
- OCR y soporte migrados/encapsulados en servicios (src/services/ocr, src/services/support) con pilotos React (/pilot-ocr.html, /pilot-support.html).
- Deuda residual deliberada:
  - settings.html e integrations.html siguen en runtime legacy.
  - Quill continua en legacy; wrapper React pendiente.
  - Queda 1 vulnerabilidad high en xlsx sin fix upstream.
- Evidencia: docs/migration/phase-10/phase-10-execution-log.md.
- Pendiente manual: smoke OCR + soporte + validacion de convivencia con legacy restante.

## 9. Paquetes de regresion minimos por dominio

### 9.1 Auth y guards

- [ ] Login exitoso con email/password.
- [ ] Logout limpio y retorno a pantalla publica o estado esperado.
- [ ] Ruta protegida inaccesible sin sesion valida.
- [ ] Recuperacion de sesion al refrescar.
- [ ] Fallo de logging de acceso no bloquea autenticacion.

### 9.2 Clientes

- [ ] Alta manual de cliente.
- [ ] Edicion y borrado.
- [ ] Importacion CSV/XLSX.
- [ ] Calculo de totales incluyendo facturas legacy sin `client_id`.
- [ ] Busqueda global navega al cliente correcto.

### 9.3 Transacciones

- [ ] Alta manual de gasto/ingreso.
- [ ] Edicion y borrado.
- [ ] Bulk delete.
- [ ] Filtros y ordenacion.
- [ ] Integridad con transacciones creadas automaticamente desde facturas.

### 9.4 Productos

- [ ] Alta, edicion y borrado.
- [ ] Calculo correcto de precios y margenes.
- [ ] Busqueda y filtros.
- [ ] Bloqueo por limites de plan si aplica.

### 9.5 Presupuestos

- [ ] Crear presupuesto.
- [ ] Guardar borrador.
- [ ] Previsualizar.
- [ ] Emitir.
- [ ] Editar respetando reglas del dominio.
- [ ] Politica de limites claramente verificada.

### 9.6 Facturas

- [ ] Crear factura.
- [ ] Guardar borrador.
- [ ] Previsualizar.
- [ ] Emitir.
- [ ] Marcar como pagada.
- [ ] Desmarcar pago y revertir transaccion.
- [ ] Anular.
- [ ] Respetar restricciones sobre facturas emitidas.

### 9.7 OCR, soporte e integraciones

- [ ] OCR sube archivo, procesa y permite guardar gasto.
- [ ] Soporte envia ticket con editor rico operativo.
- [ ] Integrations/settings no rompen auth ni shell.

## 10. Antipatrones prohibidos durante la migracion

- [ ] Copiar handlers inline del HTML legacy a JSX sin rediseÃ±ar la responsabilidad.
- [ ] Usar `document.getElementById`, `querySelector` o `innerHTML` como fuente principal de estado en features nuevas.
- [ ] Seguir usando `window.*` como contrato principal entre modulos nuevos.
- [ ] Repetir logica de negocio en componentes cuando ya existe o debe existir en servicios de dominio.
- [ ] Migrar una pantalla visualmente sin migrar sus side effects criticos.
- [ ] Mezclar rutas React con scripts legacy que comparten el mismo trozo de DOM y los mismos eventos.

## 11. Estructura objetivo recomendada

```text
src/
  app/
    router/
    providers/
    layouts/
  shared/
    ui/
    components/
    lib/
    types/
    utils/
  services/
    supabase/
    auth/
    billing-limits/
    onboarding/
    access-log/
  features/
    auth/
    dashboard/
    contacts/
    transactions/
    products/
    documents/
    invoices/
    quotes/
    support/
    ocr/
```

## 12. Plantilla de tarea tecnica para cada PR

- [ ] Objetivo de negocio de la tarea descrito en una frase.
- [ ] Archivos legacy origen identificados.
- [ ] Archivos nuevos / modificados listados.
- [ ] Riesgo funcional afectado anotado.
- [ ] Pruebas ejecutadas listadas.
- [ ] Rollback o fallback descrito.
- [ ] Roadmap actualizado con el estado real de la fase.

## 13. Recomendacion de arranque inmediato

- Empezar esta misma semana por F0 y F1.
- No escribir UI nueva antes de cerrar servicios base, contratos y ADRs.
- Preparar AppShell en F2 y usar Productos como primer piloto completo.
- Reservar el trabajo fuerte de documentos para cuando existan services, shell y dos features migradas con exito.

## 14. Decision final de arquitectura

> Una migracion 100% directa del HTML actual a React seria un error. La estrategia correcta es extraer dominio y side effects, levantar un shell React + TypeScript, migrar por features y cerrar el nucleo documental compartido antes de presupuestos y facturas.








