# 🔧 Corrección: Error al Cambiar Estado (Activo/Inactivo)

## ❌ Error Original

Al hacer click en el badge "Activo" o "Inactivo", aparecía el error:

```
El nombre/razón social es obligatorio
```

## 🔍 Causa del Problema

La función `updateClient()` en `assets/js/clients.js` tenía una lógica defectuosa:

**ANTES (MAL):**
```javascript
async function updateClient(clientId, clientData) {
  // Preparaba TODOS los campos siempre
  const data = {
    nombre_razon_social: clientData.nombre_razon_social?.trim(),  // undefined si no viene
    identificador: clientData.identificador?.trim().toUpperCase(), // undefined si no viene
    // ... todos los campos
  };

  // SIEMPRE validaba estos campos, incluso si no se estaban actualizando
  if (!data.nombre_razon_social) {
    throw new Error('El nombre/razón social es obligatorio'); // ❌ ERROR AQUÍ
  }
  if (!data.identificador) {
    throw new Error('El identificador es obligatorio');
  }
}
```

**Problema**: Cuando llamabas a `updateClient(id, { estado: 'inactivo' })`, intentaba validar `nombre_razon_social` que NO estaba en el objeto, dando error.

## ✅ Solución Aplicada

**Archivo modificado**: `assets/js/clients.js` líneas 163-226

**AHORA (CORRECTO):**
```javascript
async function updateClient(clientId, clientData) {
  // Preparar datos - SOLO los campos que se están enviando
  const data = {};
  
  // Procesar cada campo solo si existe en clientData
  if (clientData.nombre_razon_social !== undefined) {
    data.nombre_razon_social = clientData.nombre_razon_social?.trim();
  }
  
  if (clientData.identificador !== undefined) {
    data.identificador = clientData.identificador?.trim().toUpperCase();
  }
  
  // ... todos los campos con esta lógica
  
  if (clientData.estado !== undefined) {
    data.estado = clientData.estado || 'activo';
  }

  // Validaciones SOLO si se están actualizando esos campos
  if (data.nombre_razon_social !== undefined && !data.nombre_razon_social) {
    throw new Error('El nombre/razón social es obligatorio'); // ✅ Solo valida si se está actualizando
  }
  
  if (data.identificador !== undefined && !data.identificador) {
    throw new Error('El identificador es obligatorio');
  }
}
```

## 🎯 Resultado

Ahora la función es inteligente:

1. **Solo procesa** los campos que recibe
2. **Solo valida** los campos que se están actualizando
3. **No toca** los campos que no se envían

### Ejemplo de uso:

```javascript
// Toggle de estado - SOLO actualiza el estado
await updateClient(clientId, { estado: 'inactivo' });
// ✅ Funciona sin validar nombre/identificador

// Actualización completa - Valida campos obligatorios
await updateClient(clientId, {
  nombre_razon_social: 'Empresa S.L.',
  identificador: 'B12345678',
  estado: 'activo'
});
// ✅ Funciona y valida que nombre e identificador no estén vacíos
```

## ✅ Cómo Probar la Corrección

### 1. Refrescar navegador
```
Ctrl + Shift + R (hard reload)
```

### 2. Ir a Contactos
```
http://localhost:5173/users.html
```

### 3. Hacer click en badge de estado
- Click en "Activo" → Cambia a "Inactivo" (gris)
- Toast: "Cliente desactivado correctamente"
- Click en "Inactivo" → Cambia a "Activo" (verde)
- Toast: "Cliente activado correctamente"

### 4. Verificar que NO aparece ningún error
- ✅ NO error de "nombre/razón social obligatorio"
- ✅ NO error en consola (F12)
- ✅ Cambio instantáneo
- ✅ Toast de confirmación

## 🔄 Otros Beneficios de esta Mejora

Esta corrección también mejora:

1. **Edición parcial**: Ahora puedes actualizar solo el email sin tocar otros campos
2. **Rendimiento**: Solo se envían los campos que cambian a Supabase
3. **Validaciones precisas**: Solo valida lo que estás modificando
4. **Menos errores**: No hay validaciones innecesarias

## 📝 Cambios en el Código

### Archivo: `assets/js/clients.js`

**Líneas modificadas**: 163-226  
**Función**: `updateClient(clientId, clientData)`  
**Cambio**: Procesamiento condicional de campos + validaciones selectivas

## ✨ Estado Final

✅ **CORREGIDO** - Toggle de estado funciona perfectamente  
✅ Validaciones solo cuando corresponde  
✅ Sin errores falsos  
✅ Mejor experiencia de usuario  

---

**Fecha**: 29 enero 2026  
**Archivo**: `CORRECCION_TOGGLE_ESTADO.md`
