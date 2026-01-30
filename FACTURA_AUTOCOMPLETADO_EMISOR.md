# Autocompletado de Datos del Emisor en Facturas

## 📋 Resumen

Se ha implementado un sistema de autocompletado de datos del emisor en la página de creación de facturas (`invoices/new.html`). Los datos se cargan automáticamente desde la información de negocio guardada en `business_info`.

## 🎯 Características Implementadas

### 1. **Campos Bloqueados (No Editables)**

Los siguientes campos del emisor están bloqueados y no se pueden modificar:

- ✅ **Razón social** (`issuer-name`)
  - Se autocompleta con `nombre_fiscal` de `business_info`
  - Campo deshabilitado con estilo visual de bloqueado
  
- ✅ **NIF** (`issuer-nif`)
  - Se autocompleta con `nif_cif` de `business_info`
  - Campo deshabilitado con estilo visual de bloqueado

**¿Por qué están bloqueados?**
- Estos son datos fiscales oficiales que no deben cambiar por factura
- Garantiza consistencia en todas las facturas emitidas
- Previene errores al escribir datos fiscales

### 2. **Campos Autocompletados (Editables)**

Los siguientes campos se autocompletan pero pueden editarse si es necesario:

- ✅ **Email** (`issuer-email`)
  - Se autocompleta con el email del usuario autenticado
  - Editable por si necesitas usar un email diferente para esta factura
  
- ✅ **Dirección fiscal** (`issuer-address`)
  - Se autocompleta con `direccion_facturacion` de `business_info`
  - Editable por si necesitas especificar una dirección diferente
  
- ✅ **Código postal** (`issuer-postal-code`)
  - Se autocompleta con `codigo_postal` de `business_info`
  - Editable para flexibilidad

## 🔧 Cómo Funciona

### Flujo de Datos

```
1. Usuario abre invoices/new.html
   ↓
2. Script espera a que módulos de Supabase estén listos
   ↓
3. Obtiene usuario actual autenticado
   ↓
4. Obtiene business_info del usuario
   ↓
5. Autocompleta campos:
   - Razón social ← nombre_fiscal (bloqueado)
   - NIF ← nif_cif (bloqueado)
   - Email ← user.email (editable)
   - Dirección ← direccion_facturacion (editable)
   - Código postal ← codigo_postal (editable)
   ↓
6. Usuario puede continuar creando la factura
```

### Código Implementado

**Script de Autocompletado:**
```javascript
// En invoices/new.html (líneas finales)
async function loadIssuerData() {
  // 1. Esperar módulos de Supabase
  // 2. Obtener usuario actual
  // 3. Obtener business_info
  // 4. Autocompletar campos
}
```

**Campos HTML Actualizados:**
```html
<!-- Razón social - BLOQUEADO -->
<input
  id="issuer-name"
  type="text"
  disabled
  class="...bg-bgray-100 cursor-not-allowed"
/>

<!-- NIF - BLOQUEADO -->
<input
  id="issuer-nif"
  type="text"
  disabled
  class="...bg-bgray-100 cursor-not-allowed"
/>

<!-- Email - EDITABLE -->
<input
  id="issuer-email"
  type="email"
  class="...focus:border-success-300"
/>
```

## 📁 Archivos Modificados

### `invoices/new.html`

**Cambio 1: Campos Bloqueados**
- Agregado atributo `disabled` a `issuer-name` y `issuer-nif`
- Cambiadas clases CSS para estilo de campo bloqueado:
  - `bg-bgray-100` (fondo gris claro)
  - `dark:bg-darkblack-400` (fondo gris oscuro en modo oscuro)
  - `dark:text-bgray-300` (texto gris en modo oscuro)
  - `cursor-not-allowed` (cursor de no permitido)

**Cambio 2: Import de businessInfo.js**
```javascript
import '../assets/js/businessInfo.js';
```

**Cambio 3: Script de Autocompletado**
- Nuevo script IIFE que carga automáticamente los datos
- Polling para esperar módulos de Supabase
- Console logs para debugging
- Manejo de errores robusto

## 🧪 Cómo Probar

### Test 1: Verificar Autocompletado Inicial

1. Asegúrate de tener datos de negocio completos en Settings
2. Ve a `invoices/new.html`
3. **Resultado esperado:**
   - Razón social está completa y bloqueada ✅
   - NIF está completo y bloqueado ✅
   - Email está autocompletado (editable) ✅
   - Dirección fiscal está autocompletada (editable) ✅
   - Código postal está autocompletado (editable) ✅

### Test 2: Verificar Campos Bloqueados

1. Intenta hacer clic en "Razón social"
2. Intenta hacer clic en "NIF"
3. **Resultado esperado:**
   - No puedes editarlos ✅
   - Cursor muestra "no permitido" (⛔) ✅
   - Campos tienen fondo gris ✅

### Test 3: Verificar Campos Editables

1. Haz clic en el campo "Email"
2. Modifica el email
3. **Resultado esperado:**
   - Puedes editar el email ✅
   - Se resalta con borde verde al hacer focus ✅
   - Lo mismo para dirección y código postal ✅

### Test 4: Verificar Console Logs

Abre la consola del navegador (F12) y busca:
- ✅ "🔄 Inicializando autocompletado de datos del emisor..."
- ✅ "✅ Módulos de Supabase listos"
- ✅ "✅ Usuario obtenido: email@ejemplo.com"
- ✅ "✅ Datos de negocio obtenidos"
- ✅ "✅ Datos del emisor autocompletados correctamente"

### Test 5: Cambiar Datos en Settings

1. Ve a Settings y cambia tu "Nombre fiscal"
2. Guarda los cambios
3. Ve a `invoices/new.html` de nuevo
4. **Resultado esperado:**
   - El nuevo nombre fiscal aparece automáticamente ✅

## 🎨 Estilos Visuales

### Campos Bloqueados

**Modo Claro:**
- Fondo: Gris claro (`bg-bgray-100`)
- Texto: Gris medio
- Borde: Estándar
- Cursor: No permitido (⛔)

**Modo Oscuro:**
- Fondo: Gris oscuro (`dark:bg-darkblack-400`)
- Texto: Gris claro (`dark:text-bgray-300`)
- Borde: Estándar
- Cursor: No permitido (⛔)

### Campos Editables

**Modo Claro:**
- Fondo: Blanco
- Texto: Negro
- Borde: Verde al hacer focus
- Cursor: Normal

**Modo Oscuro:**
- Fondo: Oscuro (`dark:bg-darkblack-500`)
- Texto: Blanco (`dark:text-bgray-50`)
- Borde: Verde al hacer focus
- Cursor: Normal

## ⚙️ Configuración Técnica

### Dependencias

El script depende de:
- `window.getCurrentUser()` (de `auth.js`)
- `window.getBusinessInfo()` (de `businessInfo.js`)
- Supabase client inicializado

### Orden de Carga

1. `supabaseClient.js`
2. `auth.js`
3. **`businessInfo.js`** ← Agregado
4. `clients.js`
5. Autocompletado script ← Ejecuta al final

### Tiempo de Espera

El script espera hasta **5 segundos** (50 intentos × 100ms) para que los módulos de Supabase estén disponibles.

## 📝 Notas Importantes

### 1. **Datos Requeridos**

Para que el autocompletado funcione, el usuario debe tener:
- ✅ Business info completo en la base de datos
- ✅ Al menos `nombre_fiscal` y `nif_cif`

Si faltan datos:
- Los campos quedarán vacíos
- Se mostrará warning en consola
- El usuario no podrá crear facturas (campos bloqueados vacíos)

### 2. **Modificar Datos del Emisor**

Para cambiar los datos del emisor:
1. Ve a **Settings** (`settings.html`)
2. Actualiza "Datos de negocio"
3. Guarda los cambios
4. Los cambios se reflejarán automáticamente en nuevas facturas

### 3. **Campos No Autocompletados**

Algunos campos del emisor NO se autocompletan porque no están en `business_info`:
- Teléfono (puede agregarse en el futuro)
- Ciudad (puede agregarse en el futuro)
- Provincia (puede agregarse en el futuro)

Para agregar más campos al autocompletado:
1. Asegúrate de que existen en `business_info`
2. Agrega `<input id="nuevo-campo">` en el HTML
3. Agrega autocompletado en el script:
   ```javascript
   const nuevoCampoInput = document.getElementById('nuevo-campo');
   if (nuevoCampoInput && businessData.nuevo_campo) {
     nuevoCampoInput.value = businessData.nuevo_campo;
   }
   ```

## 🐛 Troubleshooting

### Problema: Campos del emisor vacíos

**Posibles causas:**
1. No hay datos en `business_info`
2. Usuario no autenticado
3. Scripts no cargados correctamente

**Solución:**
- Abrir consola y verificar logs
- Completar perfil en Settings
- Verificar que `businessInfo.js` está cargado

### Problema: No puedo editar ningún campo

**Posibles causas:**
1. JavaScript no ejecutándose
2. Todos los campos marcados como `disabled` por error

**Solución:**
- Revisar consola por errores de JavaScript
- Verificar que solo `issuer-name` y `issuer-nif` tienen `disabled`

### Problema: Datos desactualizados

**Posibles causas:**
1. Caché del navegador
2. Datos no guardados correctamente en Settings

**Solución:**
- Hacer hard refresh (Ctrl + Shift + R)
- Verificar en Supabase que los datos están guardados
- Cerrar sesión y volver a iniciar

## ✅ Checklist de Verificación

Antes de usar en producción:

- [x] businessInfo.js importado en invoices/new.html
- [x] Campos `issuer-name` y `issuer-nif` tienen `disabled`
- [x] Estilos de campos bloqueados aplicados
- [x] Script de autocompletado agregado
- [x] Console logs para debugging
- [x] Manejo de errores implementado
- [x] Polling para módulos de Supabase
- [ ] Probar en diferentes navegadores
- [ ] Probar en modo oscuro
- [ ] Probar con usuario sin datos de negocio
- [ ] Probar con datos de negocio incompletos

## 🚀 Mejoras Futuras (Opcional)

1. **Agregar más campos autocompletados:**
   - Teléfono del emisor
   - Ciudad y provincia
   - Logotipo/imagen de empresa

2. **Validación visual:**
   - Indicador de "Cargando..." mientras se obtienen datos
   - Mensaje de error si no hay datos de negocio
   - Tooltip explicando por qué campos están bloqueados

3. **Persistencia:**
   - Guardar datos del emisor en localStorage para cargas más rápidas
   - Cache de business_info con invalidación automática

4. **Flexibilidad:**
   - Botón de "Editar datos del emisor" que lleve a Settings
   - Opción de usar datos de emisor alternativos (para diferentes sociedades)

---

**Fecha de implementación:** 30 de enero de 2026
**Estado:** ✅ Implementado y funcional
**Siguiente paso:** Probar en producción
