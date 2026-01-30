# 🔧 Corrección de Errores de Sintaxis

## 🐛 Problemas Identificados

### Error 1: `import.meta` fuera de módulo
```
Uncaught SyntaxError: Cannot use 'import.meta' outside a module
at supabaseClient.js:1
```

**Causa:** `supabaseClient.js` intentaba usar `import.meta.env` para variables de entorno de Vite, pero esto solo funciona con `<script type="module">`.

**Solución:** Eliminar completamente la verificación de `import.meta` y usar credenciales directas.

### Error 2: Identificador duplicado `getSupabase`
```
Uncaught SyntaxError: Identifier 'getSupabase' has already been declared
at businessInfo.js:1:1
at clients.js:1:1
at invoices.js:1:1
```

**Causa:** Múltiples archivos declaraban `const getSupabase = () => {...}` en el scope global, causando conflictos de nombres.

**Solución:** Renombrar cada función con nombre único:
- `businessInfo.js` → `getSupabaseForBusinessInfo()`
- `clients.js` → `getSupabaseForClients()`
- `invoices.js` → `getSupabaseForInvoices()`

---

## ✅ Archivos Corregidos

### 1. `assets/js/supabaseClient.js`

**ANTES:**
```javascript
// Verificar si estamos usando Vite (import.meta.env disponible)
if (typeof import.meta !== 'undefined' && import.meta.env) {
  SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  console.log('🔧 Using Vite environment variables');
}
```

**DESPUÉS:**
```javascript
// Credenciales de Supabase (configuración directa)
// NOTA: En producción, considera usar variables de entorno
const SUPABASE_URL = 'https://nukslmpdwjqlepacukul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...';
```

### 2. `assets/js/businessInfo.js`

**ANTES:**
```javascript
const getSupabase = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');
  }
  return window.supabaseClient;
};
```

**DESPUÉS:**
```javascript
const getSupabaseForBusinessInfo = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');
  }
  return window.supabaseClient;
};

// Y todas las llamadas actualizadas:
const supabase = getSupabaseForBusinessInfo();
```

### 3. `assets/js/clients.js`

**ANTES:**
```javascript
const getSupabase = () => { ... };
```

**DESPUÉS:**
```javascript
const getSupabaseForClients = () => { ... };
```

### 4. `assets/js/invoices.js`

**ANTES:**
```javascript
async function getSupabase() { ... }
```

**DESPUÉS:**
```javascript
async function getSupabaseForInvoices() { ... }
```

### 5. `assets/js/auth.js`

**ANTES:**
```javascript
const getSupabase = () => { ... };
```

**DESPUÉS:**
```javascript
const getSupabaseForAuth = () => { ... };
```

---

## 🧪 Verificación

### Paso 1: Limpiar Caché Completo

**CRÍTICO:** Estos errores de sintaxis pueden quedar cacheados.

```
Método 1: DevTools
→ F12
→ Click derecho en reload
→ "Empty Cache and Hard Reload"

Método 2: Ventana de incógnito
→ Ctrl + Shift + N
→ Abrir invoices/new.html

Método 3: Borrar caché completo
→ Ctrl + Shift + Delete
→ Seleccionar "Todo el tiempo"
→ Marcar "Archivos e imágenes en caché"
```

### Paso 2: Verificar Consola (F12)

**Busca estos mensajes EN ORDEN (sin errores rojos):**

```
✅ Supabase client initialized successfully
📍 Project URL: https://nukslmpdwjqlepacukul.supabase.co
✅ auth.js cargado
✅ businessInfo.js cargado
✅ clients.js cargado
🔄 Cargando invoices.js...
✅ invoices.js cargado correctamente
✅ Funciones exportadas: { createInvoice: "function", ... }
✅ new-page.js cargado
🔄 Inicializando página de factura...
```

**NO debe haber:**
- ❌ `SyntaxError`
- ❌ `import.meta`
- ❌ `Identifier 'getSupabase' has already been declared`

### Paso 3: Test Manual en Consola

```javascript
// Ejecutar en consola del navegador:
console.log({
  supabaseClient: typeof window.supabaseClient,
  createInvoice: typeof window.createInvoice,
  updateInvoice: typeof window.updateInvoice,
  saveDraft: typeof window.saveDraft
});
```

**Resultado esperado:**
```javascript
{
  supabaseClient: "object",     // ✅
  createInvoice: "function",    // ✅
  updateInvoice: "function",    // ✅
  saveDraft: "function"         // ✅
}
```

**Si alguno es `undefined`:**
→ Todavía hay caché o un error de carga

### Paso 4: Probar Funcionalidad

1. Ir a `invoices/new.html`
2. Rellenar campos básicos (al menos "Emisor" y "Cliente")
3. Click en **"Guardar borrador"**
4. Debería mostrar:
   - ✅ Toast de éxito: "Borrador guardado correctamente"
   - ✅ Número de factura asignado
   - ✅ Redirección a vista previa (o permanecer en la página)

5. Click en **"Vista previa y emitir"**
6. Debería:
   - ✅ Guardar borrador primero (si hay cambios)
   - ✅ Redirigir a `preview.html?draft=...`

---

## 🔍 Troubleshooting

### Si sigue sin funcionar después de limpiar caché:

**1. Verificar que los archivos están guardados:**
```bash
# En terminal, desde la raíz del proyecto:
ls -la assets/js/supabaseClient.js
ls -la assets/js/businessInfo.js
ls -la assets/js/clients.js
ls -la assets/js/invoices.js
```

**2. Verificar que no hay errores de sintaxis:**
```javascript
// En consola del navegador:
fetch('../assets/js/invoices.js')
  .then(r => r.text())
  .then(code => {
    try {
      new Function(code);
      console.log('✅ Sin errores de sintaxis');
    } catch(e) {
      console.error('❌ Error de sintaxis:', e);
    }
  });
```

**3. Verificar orden de carga en Network:**
```
F12 → Network → Reload página
Filtrar por "js"

Orden esperado:
1. supabase-js@2 (CDN)               → 200
2. supabaseClient.js                 → 200
3. auth.js                           → 200
4. businessInfo.js                   → 200
5. clients.js                        → 200
6. userHeader.js                     → 200
7. toast.js                          → 200
8. modal-cliente.js                  → 200
9. invoice-clients.js                → 200
10. invoices.js                      → 200
11. new-page.js                      → 200
```

**Si alguno tiene status 404:**
→ La ruta es incorrecta en `new.html`

**Si alguno tiene status 500:**
→ Error del servidor al servir el archivo

---

## 📊 Resumen de Cambios

| Archivo | Cambio Principal | Líneas Afectadas |
|---------|------------------|------------------|
| `supabaseClient.js` | Eliminar `import.meta` | ~14-18 |
| `auth.js` | Renombrar `getSupabase` | ~7, 17, 61, 113, 149 |
| `businessInfo.js` | Renombrar `getSupabase` | ~7, 21, 88, 127, 175, 222 |
| `clients.js` | Renombrar `getSupabase` | ~7, 21, 44, 93, 137, 186, 220 |
| `invoices.js` | Renombrar `getSupabase` | ~10, 32, 103, 156, 188, 282, 316, 364, 402 |

**Total de líneas modificadas:** ~50

---

## ⚠️ Notas Importantes

1. **No usar `type="module"`**: Todos los scripts deben ser scripts regulares
2. **No usar `import`/`export`**: Usar `window.*` para exportaciones globales
3. **No usar `import.meta`**: Solo funciona en módulos ES6
4. **Nombres únicos**: Evitar `const getSupabase` duplicado en múltiples archivos

---

**Última actualización:** 30 de enero de 2026  
**Estado:** ✅ Errores de sintaxis corregidos  
**Próximo paso:** Limpiar caché y probar
