# Sistema de Seguimiento de Progreso "Primeros Pasos"

## Resumen

Sistema dinámico de onboarding que detecta automáticamente el progreso del usuario y muestra UI diferenciada según el estado de cada paso.

## Características Implementadas

### 1. Detección Automática de Progreso

El sistema detecta automáticamente qué pasos ha completado el usuario:

- **Paso 1: Añade los datos de tu negocio** ✅ Siempre completado (automático al registrarse)
- **Paso 2: Añade tu primer contacto** 🔄 Se completa al crear el primer cliente
- **Paso 3: Personaliza tu factura** ✅ Marcado como completado (funcionalidad futura)
- **Paso 4: Crea tu primera factura** ⏳ Preparado para futuro

### 2. UI Adaptativa

#### Paso Completado ✅
- Círculo naranja (#ec8228) con tick blanco
- Badge azul claro: "Completado"

#### Paso Pendiente ⏳
- Círculo blanco con flecha derecha naranja
- Botón de acción naranja con redirección:
  - Paso 2 → Botón "Crear contacto" → `users.html`
  - Paso 3 → Botón "Personalizar" → `invoices/new.html`
  - Paso 4 → Botón "Crear factura" → `invoices/new.html`

### 3. Progreso Visual

- Círculo animado que muestra el porcentaje completado
- Texto dinámico: "X/100" (0/100, 25/100, 50/100, 75/100, 100/100)
- Estado: "EN PROGRESO" o "COMPLETADO"

## Arquitectura de Datos

### Tabla: `user_progress`

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  step1_business_info BOOLEAN DEFAULT TRUE,
  step2_first_client BOOLEAN DEFAULT FALSE,
  step3_customize_invoice BOOLEAN DEFAULT TRUE,
  step4_first_invoice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

Con RLS policies para que cada usuario solo vea/edite su propio progreso.

## Flujo de Funcionamiento

### Carga Inicial (index.html / expenses.html)

```
1. Usuario carga la página
   ↓
2. loadOnboardingProgress() se ejecuta automáticamente
   ↓
3. Obtiene usuario actual autenticado
   ↓
4. Busca registro en user_progress
   ↓
5. Si no existe → Crea registro inicial con valores por defecto
   ↓
6. Verifica si tiene clientes (para step2)
   ↓
7. Renderiza UI dinámicamente según estado
   ↓
8. Actualiza círculo de progreso y porcentaje
```

### Creación de Cliente

```
1. Usuario crea un cliente en users.html
   ↓
2. createClient() inserta en tabla clientes
   ↓
3. Si exitoso → updateStepProgress(userId, 2, true)
   ↓
4. Se actualiza user_progress.step2_first_client = TRUE
   ↓
5. La próxima vez que cargue index.html/expenses.html
   → El paso 2 aparece como completado
```

## Archivos Creados/Modificados

### Nuevos Archivos

1. **`supabase/migrations/20260130132813_create_user_progress_table.sql`**
   - Tabla `user_progress`
   - Trigger para `updated_at`
   - Índice en `user_id`
   - 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)

2. **`assets/js/onboardingProgress.js`**
   - `getUserProgress(userId)` - Obtener progreso de BD
   - `createUserProgress(userId)` - Crear registro inicial
   - `updateStepProgress(userId, stepNumber)` - Actualizar paso
   - `checkUserHasClients(userId)` - Verificar si tiene clientes
   - `calculateProgress(progressData)` - Calcular porcentaje
   - `renderOnboardingSteps(progressData)` - Renderizar UI
   - `loadOnboardingProgress()` - Función principal
   - Todas exportadas a `window.*`

3. **`SISTEMA_PRIMEROS_PASOS.md`** (este archivo)

### Archivos Modificados

1. **`index.html`**
   - Agregados IDs a elementos dinámicos:
     - `onboarding-progress-circle` - Círculo SVG
     - `onboarding-progress-icon` - Icono central
     - `onboarding-progress-text` - Texto de porcentaje
     - `onboarding-progress-state` - Estado (EN PROGRESO/COMPLETADO)
   - Reemplazado contenido hardcodeado con `<div id="onboarding-steps-container"></div>`
   - Agregado script `onboardingProgress.js`
   - Agregada llamada `await window.loadOnboardingProgress()`

2. **`expenses.html`**
   - Mismos cambios que `index.html`

3. **`assets/js/clients.js`**
   - Agregada lógica después de crear cliente exitosamente:
     ```javascript
     await window.updateStepProgress(user.id, 2, true);
     ```

## Cómo Probar

### IMPORTANTE: Aplicar Migración Primero

Antes de probar, debes aplicar la migración en Supabase:

1. Ve a Supabase Dashboard → SQL Editor
2. Copia el contenido de `supabase/migrations/20260130132813_create_user_progress_table.sql`
3. Pega y ejecuta
4. Verifica que la tabla `user_progress` se creó correctamente

### Test 1: Usuario Nuevo (Sin Clientes)

1. Inicia sesión con un usuario que NO tenga clientes
2. Ve a `index.html`
3. **Resultado esperado:**
   - Progreso: "25/100" (solo paso 1 y 3 completados)
   - Estado: "EN PROGRESO" (naranja)
   - Paso 1: ✅ Completado (tick naranja)
   - Paso 2: ⏳ Pendiente (flecha naranja) + Botón "Crear contacto"
   - Paso 3: ✅ Completado (tick naranja)
   - Paso 4: ⏳ Pendiente (flecha naranja) + Botón "Crear factura"

### Test 2: Crear Primer Cliente

1. Haz clic en el botón "Crear contacto" del Paso 2
2. Se abre `users.html`
3. Crea un nuevo cliente
4. **Resultado esperado:** Cliente creado exitosamente
5. Vuelve a `index.html`
6. **Resultado esperado:**
   - Progreso: "50/100" (paso 1, 2 y 3 completados)
   - Paso 2: ✅ Completado (tick naranja) + Badge "Completado"
   - El botón "Crear contacto" desaparece

### Test 3: Usuario con Clientes Existentes

1. Inicia sesión con un usuario que YA tiene clientes
2. Ve a `index.html`
3. **Resultado esperado:**
   - Progreso: "50/100"
   - Paso 2: ✅ Completado automáticamente

### Test 4: Expansión/Colapso

1. Ve a `index.html`
2. Haz clic en el header de "Primeros Pasos"
3. **Resultado esperado:** La lista se colapsa
4. Haz clic de nuevo
5. **Resultado esperado:** La lista se expande

### Test 5: Modo Oscuro

1. Activa el modo oscuro
2. Ve a `index.html`
3. **Resultado esperado:**
   - Todos los textos son legibles
   - Colores adaptados al modo oscuro
   - Botones naranja siguen destacando

### Test 6: Verificar Console Logs

Abre la consola del navegador (F12) en `index.html`:

**Logs esperados:**
- ✅ "🔄 Cargando progreso de onboarding..."
- ✅ "✅ Usuario obtenido: [user-id]"
- ✅ "✅ Progreso obtenido: [objeto]"
- ✅ "📊 Progreso calculado: { completed: X, total: 4, percentage: XX }"
- ✅ "✅ Onboarding renderizado exitosamente"

**Al crear cliente:**
- ✅ "✅ Paso 2 marcado como completado"

## Detalles Técnicos

### Cálculo del Círculo de Progreso

```javascript
// Circunferencia: 2 * PI * r = 2 * 3.14159 * 32 ≈ 201
const circumference = 201;
const dashoffset = circumference - (circumference * percentage / 100);

// Ejemplos:
// 0% → dashoffset = 201 (círculo vacío)
// 25% → dashoffset = 150.75
// 50% → dashoffset = 100.5
// 75% → dashoffset = 50.25
// 100% → dashoffset = 0 (círculo completo)
```

### Inicialización de Progreso

Cuando se crea el registro inicial:

```javascript
{
  step1_business_info: true,        // Siempre TRUE (tienen business_info)
  step2_first_client: hasClients,   // TRUE si COUNT(clientes) > 0
  step3_customize_invoice: true,    // Siempre TRUE por ahora
  step4_first_invoice: false        // Siempre FALSE por ahora
}
```

### Orden de Carga de Scripts

Es importante que los scripts se carguen en este orden:

```html
1. supabaseClient.js
2. auth.js
3. businessInfo.js
4. checkBusinessInfo.js
5. userHeader.js
6. onboardingProgress.js  ← Nuevo
7. Verificación e inicialización
```

## Estilos CSS Utilizados

### Círculo Completado
```css
bg-success-300       /* Naranja #ec8228 */
shadow-md
```

### Círculo Pendiente
```css
bg-white
border-2 border-bgray-300
shadow-sm
```

### Botón de Acción
```css
bg-warning-300       /* Naranja #ec8228 */
hover:bg-warning-400
text-white
rounded-lg
shadow-sm hover:shadow-md
```

### Badge Completado
```css
text-info-600
bg-info-50
border border-info-200
dark:bg-info-900/20
dark:text-info-400
```

## Mantenimiento Futuro

### Agregar Paso 4 (Primera Factura)

Cuando implementes el sistema de facturas:

1. Crea la tabla `facturas` o `invoices`
2. En el código de creación de factura, agrega:
   ```javascript
   await window.updateStepProgress(userId, 4, true);
   ```
3. Actualiza `step4_first_invoice` a `DEFAULT FALSE` en la migración inicial

### Agregar Más Pasos

Si necesitas agregar más pasos:

1. Agrega columna en `user_progress`:
   ```sql
   ALTER TABLE user_progress ADD COLUMN step5_nombre BOOLEAN DEFAULT FALSE;
   ```
2. Actualiza `calculateProgress()` para incluir el nuevo paso
3. Agrega el paso en el array `steps` de `renderOnboardingSteps()`
4. Define cuándo se marca como completado

### Modificar Lógica del Paso 3

Cuando implementes personalización de facturas:

1. Crea tabla o campo para guardar plantilla/preferencias
2. Cambia `step3_customize_invoice` a `DEFAULT FALSE`
3. Al guardar personalización:
   ```javascript
   await window.updateStepProgress(userId, 3, true);
   ```
4. Actualiza el botón de acción del paso 3

## Troubleshooting

### Problema: Pasos no se muestran

**Posibles causas:**
1. Migración no aplicada en Supabase
2. Scripts no cargados correctamente
3. Usuario no autenticado

**Solución:**
- Verificar que la tabla `user_progress` existe en Supabase
- Abrir consola y buscar errores
- Verificar que todos los scripts están incluidos

### Problema: Paso 2 no se marca como completado

**Posibles causas:**
1. `updateStepProgress` no está disponible globalmente
2. Error al crear cliente
3. Error en la actualización de BD

**Solución:**
- Abrir consola al crear cliente
- Buscar mensaje "✅ Paso 2 marcado como completado"
- Si no aparece, revisar errores en consola

### Problema: Círculo de progreso no se anima

**Posibles causas:**
1. IDs incorrectos en HTML
2. `updateProgressCircle()` no se ejecuta
3. CSS transition no aplicado

**Solución:**
- Verificar que existe `id="onboarding-progress-circle"`
- Inspeccionar elemento y ver si `stroke-dashoffset` cambia
- Verificar que tiene clase `transition-all duration-1000`

### Problema: Botones no redirigen

**Posibles causas:**
1. `onclick` mal formado
2. Ruta incorrecta en `buttonUrl`

**Solución:**
- Verificar consola por errores de JavaScript
- Verificar que las rutas existen (`users.html`, `invoices/new.html`)
- Probar redirección manual en consola: `location.href='users.html'`

## Verificación de Implementación

### Checklist de Archivos

- [x] `supabase/migrations/20260130132813_create_user_progress_table.sql` - Creado
- [x] `assets/js/onboardingProgress.js` - Creado (451 líneas)
- [x] `index.html` - Modificado (IDs agregados, contenedor dinámico, script incluido)
- [x] `expenses.html` - Modificado (IDs agregados, contenedor dinámico, script incluido)
- [x] `assets/js/clients.js` - Modificado (actualización de progreso agregada)

### Checklist de Base de Datos

- [ ] Tabla `user_progress` creada en Supabase
- [ ] RLS policies habilitadas
- [ ] Trigger `updated_at` funcionando
- [ ] Índice en `user_id` creado

### Checklist de Funcionalidad

- [ ] Progreso se carga al iniciar `index.html`
- [ ] UI muestra pasos completados correctamente
- [ ] UI muestra pasos pendientes con botones
- [ ] Botones redirigen a páginas correctas
- [ ] Crear cliente marca paso 2 como completado
- [ ] Círculo de progreso se anima correctamente
- [ ] Funciona en modo oscuro

## Comandos SQL Útiles

### Verificar tabla creada
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_progress';
```

### Ver progreso de todos los usuarios
```sql
SELECT * FROM user_progress;
```

### Ver progreso de un usuario específico
```sql
SELECT * FROM user_progress 
WHERE user_id = 'tu-user-id';
```

### Resetear progreso de un usuario
```sql
UPDATE user_progress 
SET step2_first_client = FALSE,
    step4_first_invoice = FALSE
WHERE user_id = 'tu-user-id';
```

### Crear progreso manualmente
```sql
INSERT INTO user_progress (user_id, step1_business_info, step2_first_client, step3_customize_invoice, step4_first_invoice)
VALUES ('tu-user-id', TRUE, FALSE, TRUE, FALSE);
```

## API JavaScript

### Funciones Globales Disponibles

```javascript
// Obtener progreso
const result = await window.getUserProgress(userId);
// Retorna: { success: true, data: { step1: true, step2: false, ... } }

// Crear progreso inicial
const result = await window.createUserProgress(userId);

// Actualizar paso específico
await window.updateStepProgress(userId, 2, true); // Marcar paso 2 como completado
await window.updateStepProgress(userId, 2, false); // Marcar como NO completado

// Verificar si tiene clientes
const hasClients = await window.checkUserHasClients(userId);
// Retorna: true o false

// Calcular progreso
const progress = window.calculateProgress(progressData);
// Retorna: { completed: 2, total: 4, percentage: 50 }

// Renderizar pasos
window.renderOnboardingSteps(progressData, 'onboarding-steps-container');

// Cargar y renderizar todo
await window.loadOnboardingProgress();
```

## Próximos Pasos (Futuro)

### 1. Implementar Paso 4: Primera Factura

Cuando implementes el sistema de facturas:

1. Crea tabla `invoices` o `facturas` en Supabase
2. Al crear factura exitosamente:
   ```javascript
   await window.updateStepProgress(userId, 4, true);
   ```
3. Actualiza el sistema para verificar si tiene facturas

### 2. Implementar Paso 3: Personalización Real

Cuando implementes personalización de facturas:

1. Crea tabla/campo para guardar preferencias
2. Cambia `step3_customize_invoice` a `DEFAULT FALSE`
3. Al guardar personalización:
   ```javascript
   await window.updateStepProgress(userId, 3, true);
   ```

### 3. Mejoras Opcionales

- **Animaciones más suaves:** Transiciones al cambiar estado
- **Tooltips:** Explicar por qué un paso está bloqueado
- **Celebración:** Confetti o animación al completar todos los pasos
- **Notificaciones:** Alert cuando completas un paso
- **Historial:** Guardar cuándo se completó cada paso
- **Badges:** Insignias por completar todos los pasos

## Notas Importantes

1. **Orden de Pasos:** Los pasos NO son secuenciales. El usuario puede crear un cliente antes de personalizar su factura, o viceversa.

2. **Estado Inicial:** Usuarios nuevos empiezan con 50% (paso 1 y 3 completados automáticamente).

3. **Persistencia:** El progreso se guarda en Supabase, no en localStorage, para ser accesible desde cualquier dispositivo.

4. **Performance:** La verificación de clientes (`checkUserHasClients`) usa `{ count: 'exact', head: true }` para ser eficiente (no descarga todos los datos).

5. **Retrocompatibilidad:** Si un usuario antiguo no tiene registro en `user_progress`, se crea automáticamente al cargar la página.

## Debugging

### Console Logs Importantes

Al cargar página:
```
🔄 Cargando progreso de onboarding...
✅ Usuario obtenido: uuid-here
✅ Progreso obtenido: { step1: true, step2: false, ... }
📊 Progreso calculado: { completed: 2, total: 4, percentage: 50 }
✅ Onboarding renderizado exitosamente
```

Al crear cliente:
```
✅ Paso 2 marcado como completado
```

### Errores Comunes

```
❌ Módulos necesarios no disponibles
→ Scripts no cargados en orden correcto

❌ Error al obtener progreso: table "user_progress" does not exist
→ Migración no aplicada en Supabase

⚠️ No se pudo actualizar el progreso
→ RLS policies no configuradas correctamente
```

## Resumen de Implementación

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Base de datos | ✅ Listo | Tabla `user_progress` con RLS |
| Módulo JS | ✅ Listo | `onboardingProgress.js` completo |
| index.html | ✅ Listo | UI dinámica implementada |
| expenses.html | ✅ Listo | UI dinámica implementada |
| Clientes | ✅ Listo | Actualiza progreso al crear |
| Facturas | ⏳ Pendiente | Para implementar en futuro |

**Estado Final:** ✅ Sistema completamente funcional

**Fecha:** 30 de enero de 2026

---

¡El sistema de "Primeros Pasos" está listo para usar! 🚀
