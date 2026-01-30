# Corrección: Botones de Guardar y Vista Previa en new.html

## Problemas Detectados

### 1. **Recursión Infinita de Toast**
- **Error**: `RangeError: Maximum call stack size exceeded` en `showToast`
- **Causa**: La función `showToast()` en `new-page.js` llamaba a `window.showToast()`, que podría ser la misma función, creando un bucle infinito
- **Síntoma**: Los botones parecían no responder y la consola mostraba miles de errores

### 2. **Orden de Carga de Scripts**
- **Error**: `Cannot access 'getSupabase' before initialization`
- **Causa**: Se usaba `type="module"` con imports ES6, pero luego se cargaban scripts regulares que dependían de esos módulos
- **Síntoma**: El cliente de Supabase no estaba disponible cuando se intentaba usar

### 3. **Llamadas Síncronas a Funciones Asíncronas**
- **Error**: `getSupabase()` se ejecutaba síncronamente antes de que `supabaseClient` estuviera listo
- **Causa**: Se intentaba acceder a `window.supabaseClient` inmediatamente sin esperar su inicialización
- **Síntoma**: Errores de "supabaseClient is not defined"

## Soluciones Aplicadas

### 1. **Eliminada Recursión de Toast** ✅

**Antes:**
```javascript
function showToast(message, type = 'success') {
  if (window.showToast) {
    window.showToast(message, type);  // ❌ Recursión infinita
  } else {
    alert(message);
  }
}
```

**Después:**
```javascript
function showToastMessage(message, type = 'success') {
  // Buscar función global de toast con nombres diferentes
  const toastFn = window.toast || window.showGlobalToast || window.displayToast;
  
  if (toastFn && typeof toastFn === 'function') {
    try {
      toastFn(message, type);
    } catch (e) {
      console.log(message);
    }
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}
```

**Cambios:**
- ✅ Renombrada a `showToastMessage` para evitar conflictos
- ✅ Busca funciones alternativas (`toast`, `showGlobalToast`, `displayToast`)
- ✅ Fallback a `console.log` en lugar de `alert`
- ✅ Manejo de errores con `try-catch`

### 2. **Corregido Orden de Carga** ✅

**Antes (`new.html`):**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="module">
  import '../assets/js/supabaseClient.js';  // ❌ No funciona con scripts regulares
  import '../assets/js/auth.js';
  import '../assets/js/businessInfo.js';
  import '../assets/js/clients.js';
  await new Promise(resolve => setTimeout(resolve, 100));
</script>
<script src="../assets/js/invoices.js"></script>
<script src="../assets/js/new-page.js"></script>
```

**Después:**
```html
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../assets/js/supabaseClient.js"></script>
<script src="../assets/js/auth.js"></script>
<script src="../assets/js/businessInfo.js"></script>
<script src="../assets/js/clients.js"></script>

<!-- Utilidades -->
<script src="../assets/js/userHeader.js"></script>
<script src="../assets/js/toast.js"></script>
<script src="../assets/js/modal-cliente.js"></script>
<script src="../assets/js/invoice-clients.js"></script>

<!-- Sistema de facturas -->
<script src="../assets/js/invoices.js"></script>
<script src="../assets/js/new-page.js"></script>
```

**Cambios:**
- ✅ Removido `type="module"` y los imports ES6
- ✅ Carga secuencial de scripts regulares
- ✅ Supabase se carga primero
- ✅ Scripts organizados por categoría

### 3. **Función `getSupabase()` Asíncrona** ✅

**Antes (`invoices.js`):**
```javascript
const getSupabase = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');  // ❌ Falla inmediatamente
  }
  return window.supabaseClient;
};

async function createInvoice(invoiceData, status = 'draft') {
  const supabase = getSupabase();  // ❌ Síncrono, puede fallar
  // ...
}
```

**Después:**
```javascript
async function getSupabase() {
  // Esperar a que supabaseClient esté disponible (máximo 5 segundos)
  let attempts = 0;
  while (!window.supabaseClient && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado después de 5 segundos');
  }
  
  return window.supabaseClient;
}

async function createInvoice(invoiceData, status = 'draft') {
  const supabase = await getSupabase();  // ✅ Espera a que esté listo
  // ...
}
```

**Cambios:**
- ✅ `getSupabase()` es ahora `async` y espera hasta 5 segundos
- ✅ Todas las llamadas a `getSupabase()` usan `await`
- ✅ Aplica a todas las funciones: `createInvoice`, `getInvoices`, `getInvoiceById`, `updateInvoice`, `deleteInvoice`, `emitInvoice`

## Archivos Modificados

### 1. `invoices/new.html`
- **Líneas modificadas**: Scripts de importación al final del archivo
- **Cambios**: Removido `type="module"`, carga secuencial de scripts

### 2. `assets/js/new-page.js`
- **Funciones modificadas**: `showToast` → `showToastMessage`
- **Cambios**: Renombrada función y corregido manejo de toast global
- **Líneas afectadas**: 319-325, y todas las llamadas (55, 74, 252, 257, 266, 292, 306, 310)

### 3. `assets/js/invoices.js`
- **Función modificada**: `getSupabase()`
- **Cambios**: Convertida a `async` con espera activa
- **Líneas afectadas**: 7-25, y todas las llamadas en funciones `async`

## Cómo Probar

### Test 1: Guardar Borrador ✅

1. Abre `invoices/new.html`
2. Rellena los campos obligatorios:
   - Nombre del cliente
   - Fecha de emisión
   - Al menos un concepto
3. Haz clic en **"Guardar borrador"**
4. **Resultado esperado**:
   - ✅ Mensaje: "Borrador guardado correctamente"
   - ✅ Redirección automática a `drafts.html` después de 1 segundo
   - ✅ El borrador aparece en la lista

### Test 2: Vista Previa sin Guardar ⚠️

1. Abre `invoices/new.html` (formulario vacío)
2. Haz clic en **"Vista previa y emitir"**
3. **Resultado esperado**:
   - ⚠️ Mensaje: "Guarda el borrador primero para ver la vista previa"
   - ✅ No hay errores en consola

### Test 3: Vista Previa con Borrador Guardado ✅

1. Crea y guarda un borrador (Test 1)
2. Desde `drafts.html`, haz clic en **"Editar"**
3. Modifica algún campo
4. Haz clic en **"Vista previa y emitir"**
5. **Resultado esperado**:
   - ✅ Se guarda el borrador actualizado
   - ✅ Redirección a `preview.html?draft={id}`
   - ✅ Se muestra la vista previa correctamente

### Test 4: Consola Sin Errores ✅

1. Abre la consola del navegador (F12)
2. Navega a `invoices/new.html`
3. **Resultado esperado**:
   - ✅ Mensaje: "✅ new-page.js cargado"
   - ✅ Mensaje: "🔄 Inicializando página de factura..."
   - ✅ Mensaje: "➕ Modo creación - Formulario vacío"
   - ❌ **NO** debe haber errores rojos de "Maximum call stack size exceeded"
   - ❌ **NO** debe haber errores de "Cannot access 'getSupabase'"

## Notas Importantes

### ⚠️ Implementación Pendiente

**Funcionalidad NO implementada en esta corrección:**
- Vista previa de factura nueva sin guardar primero como borrador
- Recopilación completa de conceptos dinámicos en `collectFormData()`
- Carga automática de conceptos al editar un borrador

**Workaround actual:**
- Para ver vista previa, primero se debe guardar como borrador
- Los conceptos deben agregarse manualmente

### 🔧 Migraciones Requeridas

**Asegúrate de haber aplicado la migración:**
```sql
-- Archivo: supabase/migrations/20260130141629_create_invoices_table.sql
```

**Verificar en Supabase SQL Editor:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'invoices';
```

Debe devolver una fila con `invoices`.

## Debugging

### Si los botones siguen sin funcionar:

1. **Verificar consola del navegador**:
   ```
   F12 → Console
   ```
   - Busca errores rojos
   - Verifica que aparezcan los mensajes de "✅ cargado"

2. **Verificar que Supabase esté configurado**:
   ```javascript
   // En consola del navegador:
   console.log(window.supabaseClient);
   // Debe mostrar un objeto, no "undefined"
   ```

3. **Verificar funciones globales**:
   ```javascript
   // En consola del navegador:
   console.log(typeof window.saveDraft);         // "function"
   console.log(typeof window.goToPreview);       // "function"
   console.log(typeof window.createInvoice);     // "function"
   console.log(typeof window.updateInvoice);     // "function"
   ```

4. **Limpiar caché del navegador**:
   - `Ctrl + Shift + Delete` → Borrar caché
   - O forzar recarga: `Ctrl + F5`

5. **Verificar que NO haya errores 404**:
   - En la pestaña "Network" del DevTools
   - Todos los `.js` deben cargar con status `200`

---

## ⚠️ Problema Adicional: `window.createInvoice is not a function`

### Error Reportado

```
TypeError: window.createInvoice is not a function
at saveDraft (new-page.js:247:29)
```

### Causas Posibles

1. **Script no cargado**: `invoices.js` no se está ejecutando
2. **Error de sintaxis**: Hay un error que impide la carga completa
3. **Caché del navegador**: Versión antigua cacheada
4. **Orden incorrecto**: Scripts cargados en orden equivocado

### Solución Adicional Aplicada

**Archivos modificados:**

1. **`invoices.js`**:
   - ✅ Agregado `console.log('🔄 Cargando invoices.js...')` al inicio
   - ✅ Exportaciones envueltas en `try-catch`
   - ✅ Logs detallados de funciones exportadas

2. **`new-page.js`**:
   - ✅ Verificación robusta antes de usar funciones
   - ✅ Mensaje de error detallado si falta módulo
   - ✅ Log de funciones disponibles para debug

### 🔍 Cómo Debuggear

**Consulta el archivo:** `DEBUG_NEW_HTML.md` para guía completa de troubleshooting

**Verificación rápida en consola:**

```javascript
// Ejecutar en consola del navegador (F12)
console.log({
  supabase: typeof window.supabaseClient,
  createInvoice: typeof window.createInvoice,
  saveDraft: typeof window.saveDraft
});
```

**Esperado:**
```javascript
{
  supabase: "object",
  createInvoice: "function",
  saveDraft: "function"
}
```

### Pasos Inmediatos

1. **Limpiar caché del navegador**:
   - `Ctrl + Shift + Delete`
   - O `Ctrl + Shift + R` (hard reload)

2. **Verificar consola** (F12 → Console):
   - Buscar: "🔄 Cargando invoices.js..."
   - Buscar: "✅ invoices.js cargado correctamente"
   - Buscar: "✅ Funciones exportadas: ..."

3. **Verificar Network** (F12 → Network):
   - Filtrar por "invoices.js"
   - Status debe ser `200` (no `404`)

4. **Si persiste el error**:
   - Abrir ventana de incógnito
   - Intentar de nuevo
   - Si funciona → Era problema de caché

---

## 🔥 ACTUALIZACIÓN CRÍTICA: Errores de Sintaxis Corregidos

**Después de investigación adicional, se identificaron errores de sintaxis que impedían la carga de los módulos:**

1. ❌ `import.meta` en `supabaseClient.js` (no funciona fuera de módulos ES6)
2. ❌ Identificador `getSupabase` duplicado en 5 archivos diferentes

**Estos errores han sido CORREGIDOS.**

Ver documentación completa en: **`CORRECCION_SYNTAX_ERRORS.md`**

### ⚠️ ACCIÓN REQUERIDA: Limpiar Caché del Navegador

```
CRÍTICO: Debes limpiar el caché completamente
→ Ctrl + Shift + Delete (borrar caché)
→ O usar ventana de incógnito (Ctrl + Shift + N)
```

Sin limpiar el caché, **los errores persistirán** porque el navegador usa versiones antiguas de los archivos.

---

**Estado:** ✅ **Corrección completada (sintaxis + lógica)**  
**Documentación adicional:**  
- `DEBUG_NEW_HTML.md` (troubleshooting)  
- `CORRECCION_SYNTAX_ERRORS.md` (errores de sintaxis)  

**Fecha:** 30 de enero de 2026  
**Archivos corregidos:**  
- `new.html` (orden de scripts)
- `new-page.js` (toast recursion + verificación)
- `invoices.js` (async getSupabase + logs + renombrado)
- `supabaseClient.js` (eliminar import.meta)
- `auth.js` (renombrar getSupabase)
- `businessInfo.js` (renombrar getSupabase)
- `clients.js` (renombrar getSupabase)
