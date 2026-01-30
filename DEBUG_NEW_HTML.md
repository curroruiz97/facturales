# 🔍 Debug: Botones de new.html

## Error Actual

```
TypeError: window.createInvoice is not a function
at saveDraft (new-page.js:247:29)
```

## Verificaciones a Realizar

### 1. Abrir Consola del Navegador (F12)

**En la pestaña Console, busca estos mensajes EN ORDEN:**

```
✅ Debe aparecer:
🔄 Cargando invoices.js...
✅ invoices.js cargado correctamente
✅ Funciones exportadas: { createInvoice: "function", updateInvoice: "function", ... }
✅ new-page.js cargado
🔄 Inicializando página de factura...
➕ Modo creación - Formulario vacío
```

**Si NO ves "invoices.js cargado correctamente":**
→ El script `invoices.js` NO se está cargando o tiene un error

### 2. Verificar Carga de Scripts

**En la pestaña Network del navegador:**

1. Recarga la página (`Ctrl + F5`)
2. Filtra por "invoices.js"
3. Verifica que el status sea `200` (no `404` o `500`)

**Si ves 404:**
→ La ruta del archivo es incorrecta

**Si ves 500:**
→ Error del servidor al servir el archivo

### 3. Ejecutar Comandos Manualmente

**En la consola del navegador, ejecuta UNO POR UNO:**

```javascript
// 1. Verificar que supabaseClient existe
console.log('supabaseClient:', typeof window.supabaseClient);
// Esperado: "object"

// 2. Verificar funciones de invoices.js
console.log('createInvoice:', typeof window.createInvoice);
console.log('updateInvoice:', typeof window.updateInvoice);
console.log('getInvoiceById:', typeof window.getInvoiceById);
// Esperado para todos: "function"

// 3. Verificar funciones de new-page.js
console.log('saveDraft:', typeof window.saveDraft);
console.log('goToPreview:', typeof window.goToPreview);
// Esperado: "function"

// 4. Listar todas las funciones relacionadas con Invoice
Object.keys(window).filter(k => k.includes('Invoice'));
// Esperado: Array con createInvoice, updateInvoice, etc.
```

### 4. Verificar Orden de Scripts en new.html

**Abre `invoices/new.html` y busca al final del archivo.**

**El orden DEBE ser:**

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
<script src="../assets/js/invoices.js"></script>  ← DEBE ESTAR ANTES DE new-page.js
<script src="../assets/js/new-page.js"></script>
```

**Si `new-page.js` está ANTES de `invoices.js`:**
→ Cambiar el orden

### 5. Limpiar Caché

**Método 1: Hard Refresh**
```
Ctrl + Shift + R  (Linux/Windows)
Cmd + Shift + R   (Mac)
```

**Método 2: Borrar caché desde DevTools**
1. F12 para abrir DevTools
2. Click derecho en el botón de reload
3. Seleccionar "Empty Cache and Hard Reload"

**Método 3: Navegación privada**
1. Abrir ventana de incógnito (`Ctrl + Shift + N`)
2. Navegar a `invoices/new.html`
3. Probar los botones

## Soluciones Rápidas

### Si `invoices.js` no se carga:

**Verificar ruta del archivo:**
```bash
# Debe existir:
assets/js/invoices.js
```

**Verificar permisos:**
```bash
# El archivo debe ser legible
ls -la assets/js/invoices.js
```

### Si las funciones no se exportan:

**Editar `invoices.js` y agregar al PRINCIPIO del archivo:**

```javascript
console.log('=== INICIO DE INVOICES.JS ===');
console.log('window:', typeof window);
```

**Agregar al FINAL del archivo (antes del console.log final):**

```javascript
console.log('=== EXPORTANDO FUNCIONES ===');
console.log('createInvoice definido?', typeof createInvoice);
console.log('updateInvoice definido?', typeof updateInvoice);
```

### Si hay error de sintaxis:

**Buscar línea del error:**
1. Abrir consola (F12)
2. Buscar error en rojo
3. Click en el link `invoices.js:línea`
4. Ver qué línea tiene el error

**Errores comunes:**
- Falta cerrar llave `}`
- Falta cerrar paréntesis `)`
- Falta punto y coma `;` (menos común)
- Uso de `await` fuera de función `async`

## Prueba Final

**Si TODO lo anterior está correcto, ejecuta esto en la consola:**

```javascript
// Test manual de createInvoice
(async () => {
  const testData = {
    client_name: 'Cliente Test',
    issue_date: '2026-01-30',
    subtotal: 100,
    tax_amount: 21,
    total_amount: 121,
    invoice_data: {
      issuer: { name: 'Test', nif: '12345678A' },
      client: { name: 'Cliente Test', nif: '87654321B' },
      concepts: []
    }
  };
  
  const result = await window.createInvoice(testData, 'draft');
  console.log('Resultado:', result);
})();
```

**Esperado:**
```javascript
{
  success: true,
  data: { id: '...', invoice_number: 'A-...', ... }
}
```

**Si falla:**
→ Copiar el error completo y revisar

## Contacto con Desarrollador

**Si NADA de lo anterior funciona**, enviar:

1. Captura de la consola completa (F12 → Console)
2. Captura de Network mostrando los archivos .js (F12 → Network → filtrar por "js")
3. Resultado de este comando en consola:
```javascript
{
  supabaseClient: typeof window.supabaseClient,
  createInvoice: typeof window.createInvoice,
  updateInvoice: typeof window.updateInvoice,
  saveDraft: typeof window.saveDraft,
  scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
}
```

---

**Última actualización:** 30 de enero de 2026
