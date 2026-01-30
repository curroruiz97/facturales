# Correcciones Sistema "Primeros Pasos"

## 📋 Problemas Identificados y Solucionados

### ✅ Problema 1: Paso 2 no se marca como completado
**Descripción:** Usuario tiene 4 contactos pero el paso "Añade tu primer contacto" no se marca como completado.

**Causa:** El registro de progreso se creaba una sola vez y no se actualizaba posteriormente aunque se agregaran clientes.

**Solución implementada:**
- Modificado `loadOnboardingProgress()` en `onboardingProgress.js`
- Ahora verifica si el usuario tiene clientes cada vez que carga la página
- Si tiene clientes pero el paso 2 está marcado como `false`, lo actualiza automáticamente

**Código agregado:**
```javascript
// Verificar y actualizar paso 2 si tiene clientes pero no está marcado
if (!progressData.step2_first_client) {
  const hasClients = await checkUserHasClients(userId);
  if (hasClients) {
    console.log('🔄 Usuario tiene clientes, actualizando paso 2...');
    const updateResult = await updateStepProgress(userId, 2, true);
    if (updateResult.success) {
      progressData = updateResult.data;
      console.log('✅ Paso 2 actualizado correctamente');
    }
  }
}
```

---

### ✅ Problema 2: Paso 4 no se marca como completado al emitir factura
**Descripción:** Al hacer clic en "Emitir factura" en `preview.html`, no se marca el paso 4 "Crea tu primera factura" como completado.

**Solución implementada:**
1. **Agregados scripts necesarios** en `preview.html`:
   - `@supabase/supabase-js` (CDN)
   - `supabaseClient.js`
   - `auth.js`
   - `onboardingProgress.js`

2. **Modificado evento del botón "Emitir factura"**:
   - Ahora es `async` para poder usar `await`
   - Después de emitir, llama a `updateStepProgress(userId, 4, true)`
   - Manejo de errores para no interrumpir el flujo si falla

**Código modificado:**
```javascript
document.getElementById('emit-invoice-btn').addEventListener('click', async function() {
  if (confirm('¿Estás seguro de que quieres emitir esta factura?')) {
    alert('Factura emitida correctamente');
    
    // Marcar paso 4 como completado
    try {
      if (window.getCurrentUser && window.updateStepProgress) {
        const userResult = await window.getCurrentUser();
        if (userResult.success && userResult.user) {
          await window.updateStepProgress(userResult.user.id, 4, true);
          console.log('✅ Paso 4 "Primera factura" marcado como completado');
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo actualizar el progreso:', error);
    }
  }
});
```

---

## 🎯 Resultado Final

### Estado de los Pasos

| Paso | Condición | Cuándo se marca completado |
|------|-----------|----------------------------|
| **1. Datos de negocio** | ✅ Siempre TRUE | Automático (tienen business_info) |
| **2. Primer contacto** | 🔄 **CORREGIDO** | Al tener >= 1 cliente (se verifica en cada carga) |
| **3. Personalizar factura** | ✅ Siempre TRUE | Por ahora marcado (funcionalidad futura) |
| **4. Primera factura** | 🔄 **CORREGIDO** | Al hacer clic en "Emitir factura" en preview.html |

---

## 🧪 Cómo Probar

### Test 1: Paso 2 (Primer Contacto)

**Escenario:** Usuario tiene clientes pero paso 2 no estaba marcado

1. Ve a `index.html`
2. **Esperado:** El paso 2 debería aparecer como ✅ Completado automáticamente
3. **En consola:**
   ```
   🔄 Usuario tiene clientes, actualizando paso 2...
   ✅ Paso 2 actualizado correctamente
   ```

**Si no funciona:**
- Abre Supabase Dashboard → SQL Editor
- Ejecuta: `SELECT * FROM user_progress WHERE user_id = 'tu-user-id';`
- Verifica que `step2_first_client` sea `true`

---

### Test 2: Paso 4 (Primera Factura)

**Escenario:** Usuario emite su primera factura

1. Ve a `invoices/new.html` (crear factura)
2. Completa los datos de la factura
3. Haz clic en **"Vista previa"** → Te lleva a `preview.html`
4. Verifica que el PDF se genere correctamente
5. Haz clic en **"Emitir factura"**
6. Confirma el diálogo
7. **Esperado:** Alert de "Factura emitida correctamente"
8. **En consola:**
   ```
   ✅ Paso 4 "Primera factura" marcado como completado
   ```
9. Vuelve a `index.html`
10. **Esperado:** Progreso 100/100, paso 4 ✅ Completado

---

## 📊 Progreso Esperado

### Usuario nuevo (sin clientes ni facturas)
```
Progreso: 50/100
Paso 1: ✅ Completado
Paso 2: ⏳ Pendiente → Botón "Crear contacto"
Paso 3: ✅ Completado
Paso 4: ⏳ Pendiente → Botón "Crear factura"
```

### Usuario con clientes (pero sin facturas)
```
Progreso: 75/100
Paso 1: ✅ Completado
Paso 2: ✅ Completado ← CORREGIDO
Paso 3: ✅ Completado
Paso 4: ⏳ Pendiente → Botón "Crear factura"
```

### Usuario con clientes y primera factura emitida
```
Progreso: 100/100
Estado: COMPLETADO (verde)
Paso 1: ✅ Completado
Paso 2: ✅ Completado
Paso 3: ✅ Completado
Paso 4: ✅ Completado ← CORREGIDO
```

---

## 🔍 Debugging

### Consola del Navegador

Al cargar `index.html` con clientes existentes:
```
✅ Progreso obtenido: { step1: true, step2: false, ... }
🔄 Usuario tiene clientes, actualizando paso 2...
✅ Paso 2 actualizado correctamente
✅ Progreso calculado: { completed: 3, total: 4, percentage: 75 }
✅ Onboarding renderizado exitosamente
```

Al emitir factura en `preview.html`:
```
✅ Paso 4 "Primera factura" marcado como completado
```

---

## 📝 Archivos Modificados

1. **`assets/js/onboardingProgress.js`**
   - Agregada verificación automática de clientes en cada carga
   - Actualiza paso 2 si tiene clientes pero no está marcado

2. **`invoices/preview.html`**
   - Agregados scripts de Supabase y módulos
   - Modificado evento del botón "Emitir factura" para marcar paso 4

---

## 🚀 Para Aplicar los Cambios

1. **Recarga la aplicación** (Ctrl + F5 o Cmd + Shift + R)
2. **Limpia la caché** del navegador si es necesario
3. **Prueba el flujo completo:**
   - Ve a `index.html` → Verifica que paso 2 esté completado
   - Crea una factura → Emítela → Vuelve a `index.html` → Verifica paso 4

---

## ⚠️ Notas Importantes

1. **Primera Carga:** La primera vez que cargues `index.html` después de estos cambios, el paso 2 se actualizará automáticamente si tienes clientes.

2. **Paso 4 Retroactivo:** Si ya emitiste facturas antes de esta corrección, NO se marcarán automáticamente. El sistema solo detecta nuevas facturas emitidas después de aplicar estos cambios.

3. **Resetear Progreso (opcional):** Si quieres probar desde cero:
   ```sql
   UPDATE user_progress 
   SET step2_first_client = FALSE, step4_first_invoice = FALSE
   WHERE user_id = 'tu-user-id';
   ```

4. **Verificar Estado en BD:**
   ```sql
   SELECT * FROM user_progress WHERE user_id = 'tu-user-id';
   ```

---

## ✅ Checklist de Verificación

- [ ] Paso 2 se marca automáticamente si tengo clientes
- [ ] Paso 4 se marca al emitir factura en `preview.html`
- [ ] Progreso visual correcto (no 100/100 si faltan pasos)
- [ ] Consola muestra logs de actualización correctos
- [ ] No hay errores en consola del navegador

---

**Fecha:** 30 de enero de 2026  
**Estado:** ✅ Correcciones completadas y listas para probar
