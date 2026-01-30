# 🔧 Corrección: Autocompletado de Cliente en Facturas

## ❌ Errores Originales

Al seleccionar un cliente guardado en "Emitir factura":

1. **NIF duplicado**: Aparecía en el campo NIF Y dentro de "Dirección fiscal"
2. **Código postal en blanco**: No se rellenaba el campo de código postal

### Ejemplo del error:
```
NIF: B70829601 ✓
Dirección fiscal: B70829601 CALLE PAULINA HAR, 08018, ... ❌ (NIF NO debe estar aquí)
Código postal: [VACÍO] ❌ (debería tener 08018)
```

## 🔍 Causa del Problema

**Archivo**: `assets/js/invoice-clients.js`  
**Función**: `fillClientFields(client)` líneas 113-150

**ANTES (MAL):**
```javascript
// Dirección completa
const addressInput = document.getElementById('client-address');
if (addressInput) {
  // Formar dirección completa
  const addressParts = [];
  if (client.direccion) addressParts.push(client.direccion);
  if (client.codigo_postal) addressParts.push(client.codigo_postal); // ❌ Mete el CP en la dirección
  if (client.ciudad) addressParts.push(client.ciudad);
  if (client.pais) addressParts.push(client.pais);
  
  addressInput.value = addressParts.join(', '); // ❌ Todo mezclado
}
// ❌ NO había código para rellenar el campo de código postal
```

**Problema**: 
- Metía el código postal, ciudad y país dentro del campo "Dirección fiscal"
- No existía código para rellenar el campo `client-postal-code`
- Resultado: Dirección fiscal con datos mezclados y código postal vacío

## ✅ Solución Aplicada

**AHORA (CORRECTO):**
```javascript
// Dirección fiscal (SOLO la dirección, sin código postal, ciudad ni país)
const addressInput = document.getElementById('client-address');
if (addressInput) {
  addressInput.value = client.direccion || ''; // ✅ Solo la dirección
}

// Código postal (campo separado)
const postalInput = document.getElementById('client-postal-code');
if (postalInput) {
  postalInput.value = client.codigo_postal || ''; // ✅ CP en su propio campo
}
```

## 🎯 Resultado

Ahora cada campo se rellena correctamente:

```
Razón social / Nombre: AVENUE DIGITAL GROUP SL ✅
NIF: B70829601 ✅
Email: francisco@avenuemedia.io ✅
Dirección fiscal: CALLE PAULINA HAR ✅ (solo la dirección)
Código postal: 08018 ✅ (en su propio campo)
```

## ✅ Cómo Probar la Corrección

### 1. Refrescar navegador
```
Ctrl + Shift + R (hard reload)
```

### 2. Ir a Emitir Factura
```
http://localhost:5173/invoices/new.html
```

### 3. Buscar cliente
- Escribir al menos 3 letras en "Razón social / Nombre"
- Ejemplo: "AVE"
- Aparece dropdown con clientes

### 4. Seleccionar cliente
- Click en un cliente del dropdown
- Verificar campos:

**✅ DEBE aparecer:**
```
Razón social: AVENUE DIGITAL GROUP SL
NIF: B70829601 (solo aquí)
Email: francisco@avenuemedia.io
Dirección fiscal: CALLE PAULINA HAR (sin el NIF)
Código postal: 08018 (NO vacío)
```

**❌ NO DEBE aparecer:**
```
Dirección fiscal: B70829601 CALLE PAULINA HAR (NIF duplicado)
Código postal: [vacío]
```

## 📋 Detalles Técnicos

### Campos afectados:

| Campo HTML | ID | Valor |
|---|---|---|
| Razón social | `client-name` | `client.nombre_razon_social` |
| NIF | `client-nif` | `client.identificador` |
| Email | `client-email` | `client.email` |
| Teléfono | `client-phone` | `client.telefono` |
| Dirección fiscal | `client-address` | `client.direccion` (solo dirección) |
| Código postal | `client-postal-code` | `client.codigo_postal` |

### Cambios específicos:

**Archivo**: `assets/js/invoice-clients.js`  
**Líneas modificadas**: 113-150  
**Función**: `fillClientFields(client)`

**Cambios**:
1. Campo `client-address` ahora solo recibe `client.direccion`
2. Agregado código para campo `client-postal-code` con `client.codigo_postal`
3. Eliminada lógica de concatenación de todos los datos de dirección

## 🔄 Funcionalidad Relacionada

Esta corrección también mejora:

1. **Edición manual**: Ahora puedes editar el código postal independientemente
2. **Claridad**: Cada campo tiene su propósito claro
3. **Consistencia**: Misma estructura que en la gestión de contactos

## ✨ Estado Final

✅ **CORREGIDO** - Autocompletado funciona correctamente  
✅ NIF solo aparece en su campo  
✅ Código postal se rellena correctamente  
✅ Dirección fiscal solo contiene la dirección  

---

**Fecha**: 29 enero 2026  
**Archivo**: `CORRECCION_AUTOCOMPLETADO_CLIENTE.md`
