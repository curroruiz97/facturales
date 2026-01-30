# Implementación del Header con Perfil de Usuario

## 📋 Resumen

Se ha implementado un sistema para mostrar dinámicamente la información del usuario en la esquina superior derecha de todas las páginas de la aplicación.

## 🎯 Características Implementadas

### 1. **Imagen de Perfil (52x52)**
- Muestra la imagen de perfil del usuario
- Se carga dinámicamente desde `business_info.profile_image_url`
- Si no hay imagen personalizada, usa la imagen por defecto
- Tamaño: 52x52 píxeles

### 2. **Nombre de Usuario**
- Muestra el `nombre_fiscal` del negocio
- Aparece en negrita debajo de la imagen
- Se carga dinámicamente desde la base de datos

### 3. **Correo Electrónico**
- Muestra el email del usuario autenticado
- Aparece debajo del nombre
- Color de texto más claro (secundario)

## 🗂️ Archivos Creados/Modificados

### Nuevo Archivo: `assets/js/userHeader.js`

**Propósito:** Script que carga y muestra la información del usuario en el header.

**Funciones principales:**
- `loadUserHeader()`: Carga la información del usuario y actualiza el DOM
- `updateHeaderDOM()`: Actualiza los elementos visuales con la información
- Inicialización automática cuando el DOM está listo

**Cómo funciona:**
1. Espera a que los módulos de Supabase estén cargados
2. Obtiene el usuario actual autenticado
3. Obtiene la información de negocio (nombre fiscal e imagen)
4. Actualiza todos los elementos con clase:
   - `.user-profile-image` → Imagen de perfil
   - `.user-profile-name` → Nombre de usuario  
   - `.user-profile-email` → Correo electrónico

### Páginas Actualizadas

✅ **Ya implementado en:**
1. `index.html` - Panel principal
2. `settings.html` - Configuración (2 ubicaciones: desktop y mobile)
3. `expenses.html` - Gastos
4. `users.html` - Usuarios
5. `invoices/new.html` - Crear factura ⭐ (recién agregado)

⏳ **Pendientes de actualizar:**
- `transaction.html`
- `support-ticket.html`
- `statistics.html`
- `my-wallet.html`
- `messages.html`
- `integrations.html`
- `index-2.html`
- `history.html`
- `calender.html`
- `analytics.html`

## 🔧 Estructura HTML Estandarizada

Todas las páginas usan la misma estructura HTML:

```html
<div onclick="profileAction()" class="flex cursor-pointer space-x-0 lg:space-x-3">
  <!-- Imagen de perfil 52x52 -->
  <div class="h-[52px] w-[52px] overflow-hidden rounded-xl border border-bgray-300">
    <img
      class="user-profile-image object-cover w-full h-full"
      src="./assets/images/avatar/profile-52x52.png"
      alt="perfil"
    />
  </div>
  
  <!-- Información del usuario (visible en pantallas grandes) -->
  <div class="hidden 2xl:block">
    <div class="flex items-center space-x-2.5">
      <h3 class="user-profile-name text-base font-bold leading-[28px] text-bgray-900 dark:text-white">
        Usuario
      </h3>
      <span>
        <!-- Icono de flecha desplegable -->
        <svg>...</svg>
      </span>
    </div>
    <p class="user-profile-email text-sm font-medium leading-[20px] text-bgray-600 dark:text-bgray-50">
      usuario@ejemplo.com
    </p>
  </div>
</div>
```

### Clases CSS Importantes

- **`.user-profile-image`**: Imagen de perfil (52x52)
- **`.user-profile-name`**: Nombre del usuario / nombre fiscal
- **`.user-profile-email`**: Correo electrónico del usuario

Estas clases son seleccionadas por `userHeader.js` para actualizar el contenido dinámicamente.

## 📦 Integración en Páginas

Para que el header funcione en una página, se necesitan 2 cosas:

### 1. HTML con las clases correctas
Usar la estructura HTML estandarizada mostrada arriba con las clases `user-profile-image`, `user-profile-name`, y `user-profile-email`.

### 2. Script de userHeader.js
Agregar el script después de los módulos de Supabase:

```html
<!-- Supabase modules -->
<script type="module" src="./assets/js/supabaseClient.js"></script>
<script type="module" src="./assets/js/auth.js"></script>
<script type="module" src="./assets/js/businessInfo.js"></script>

<!-- User Header Script -->
<script src="./assets/js/userHeader.js"></script>
```

## 🔄 Flujo de Datos

```
1. Usuario carga la página
   ↓
2. userHeader.js espera a que Supabase esté listo
   ↓
3. Obtiene usuario actual (getCurrentUser)
   ↓
4. Obtiene business_info (getBusinessInfo)
   ↓
5. Extrae:
   - nombre_fiscal → Nombre de usuario
   - profile_image_url → Imagen de perfil
   - email → Correo electrónico
   ↓
6. Actualiza DOM:
   - Cambia src de .user-profile-image
   - Cambia texto de .user-profile-name
   - Cambia texto de .user-profile-email
   ↓
7. Usuario ve su información personalizada
```

## 🧪 Pruebas

### Test 1: Verificar Carga Inicial
1. Inicia sesión en la aplicación
2. Ve a cualquier página implementada (index.html, settings.html, etc.)
3. **Resultado esperado:**
   - La imagen de perfil aparece (personalizada o por defecto)
   - El nombre fiscal del negocio aparece
   - El correo electrónico aparece

### Test 2: Verificar Imagen Personalizada
1. Ve a Settings y sube una imagen de perfil
2. Guarda los cambios
3. Recarga cualquier página
4. **Resultado esperado:**
   - La nueva imagen aparece en el header

### Test 3: Verificar Cambio de Nombre
1. Ve a Settings y cambia el "Nombre fiscal"
2. Guarda los cambios
3. Recarga cualquier página
4. **Resultado esperado:**
   - El nuevo nombre aparece en el header

### Test 4: Console Logs
Abre la consola del navegador y busca:
- ✅ "🔄 Cargando información del usuario para el header..."
- ✅ "✅ Usuario obtenido: email@ejemplo.com"
- ✅ "✅ Header del usuario actualizado correctamente"

Si hay errores:
- ❌ "⚠️ No hay usuario autenticado"
- ❌ "❌ Error al cargar información del usuario"
- ❌ "❌ Módulos de Supabase no disponibles"

## ⚙️ Configuración Técnica

### Dependencias

El script `userHeader.js` depende de:
- `window.getCurrentUser()` (de `auth.js`)
- `window.getBusinessInfo()` (de `businessInfo.js`)
- Supabase client inicializado

### Polling de Módulos

El script espera hasta 5 segundos (50 intentos × 100ms) para que los módulos de Supabase estén disponibles antes de cargar la información del usuario.

```javascript
let attempts = 0;
while ((!window.getCurrentUser || !window.getBusinessInfo) && attempts < 50) {
  await new Promise(resolve => setTimeout(resolve, 100));
  attempts++;
}
```

## 📝 Notas Importantes

1. **Orden de Scripts:** El script `userHeader.js` debe cargarse **después** de los módulos de Supabase (`auth.js`, `businessInfo.js`).

2. **Imagen por Defecto:** Si el usuario no tiene una imagen personalizada, se usa `./assets/images/avatar/profile-52x52.png`.

3. **Responsive:** El nombre y correo solo se muestran en pantallas grandes (2xl+). En móviles solo se muestra la imagen.

4. **Modo Oscuro:** Las clases de Tailwind CSS incluyen variantes para modo oscuro (`dark:text-white`, `dark:bg-darkblack-600`, etc.).

5. **Múltiples Instancias:** Si una página tiene múltiples headers (desktop/mobile), todas las instancias se actualizan automáticamente gracias a `document.querySelectorAll`.

## 🚀 Próximos Pasos

1. **Completar implementación en páginas restantes:**
   - Actualizar HTML en las 11 páginas pendientes
   - Agregar script `userHeader.js` en cada una

2. **Mejoras futuras (opcionales):**
   - Agregar menú desplegable al hacer clic en el perfil
   - Mostrar rol del usuario (si se implementa sistema de roles)
   - Agregar indicador de estado online/offline
   - Cache de imagen de perfil para mejor rendimiento

## 🐛 Troubleshooting

### Problema: No se muestra la información del usuario

**Posibles causas:**
1. Usuario no autenticado → Revisar autenticación
2. Business info no existe → Completar perfil en settings
3. Scripts no cargados → Revisar consola de errores
4. Clases CSS incorrectas → Verificar HTML

**Solución:**
- Abrir consola del navegador
- Buscar mensajes de error de `userHeader.js`
- Verificar que `window.getCurrentUser` y `window.getBusinessInfo` existen

### Problema: Imagen no se muestra

**Posibles causas:**
1. `profile_image_url` es null o inválido
2. Base64 corrupto
3. Ruta incorrecta a imagen por defecto

**Solución:**
- Verificar en Supabase que `profile_image_url` tiene contenido válido
- Probar volver a subir la imagen en Settings
- Verificar que existe `./assets/images/avatar/profile-52x52.png`

### Problema: Nombre o email no actualizan

**Posibles causas:**
1. Clases CSS incorrectas en HTML
2. JavaScript no ejecutándose
3. Datos no guardados en BD

**Solución:**
- Inspeccionar elemento y verificar que tiene las clases correctas
- Revisar consola por errores de JavaScript
- Verificar en Supabase que los datos están guardados

## ✅ Checklist de Implementación por Página

Para implementar el header de usuario en una nueva página:

- [ ] 1. Actualizar HTML con estructura estandarizada
  - [ ] Agregar clase `user-profile-image` a la imagen
  - [ ] Agregar clase `user-profile-name` al nombre
  - [ ] Agregar clase `user-profile-email` al email
- [ ] 2. Agregar scripts necesarios
  - [ ] Supabase client
  - [ ] auth.js
  - [ ] businessInfo.js
  - [ ] **userHeader.js** (importante!)
- [ ] 3. Probar en navegador
  - [ ] Ver consola por errores
  - [ ] Verificar que información aparece
  - [ ] Cambiar datos en settings y verificar actualización

---

**Fecha de implementación:** 30 de enero de 2026
**Estado:** ✅ Parcialmente implementado (5 de 15 páginas)
**Siguiente paso:** Completar implementación en páginas restantes
