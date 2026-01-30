# Menú Lateral y Header - Corrección Completada

## Problemas Reportados
1. El menú lateral en las páginas `drafts.html` e `issued.html` no se veía correctamente
2. El header superior no mostraba la barra de búsqueda ni la miniatura de perfil con nombre y correo

## Solución Aplicada

Ambas páginas ahora tienen:
- **Menú lateral completo**, idéntico al de `index.html` con todas las secciones
- **Header superior completo** con barra de búsqueda y perfil de usuario

### Estructura del Menú Completo

```
📁 Menú
├─ 🏠 Paneles (desplegable)
│  ├─ Panel de control Default
│  ├─ Panel de control Two
│  ├─ Estadísticas
│  └─ Analítica
├─ 📄 Transacciones
├─ 📋 Facturas (desplegable) ← ACTIVO
│  ├─ Emitir factura
│  ├─ Borradores ← RESALTADO en drafts.html
│  └─ Facturas emitidas ← RESALTADO en issued.html
├─ 💰 Gastos
├─ 📊 Estadísticas
├─ 📈 Analítica
├─ 💼 Mi cartera
├─ 📧 Bandeja de entrada
├─ 🔗 Integraciones
├─ 👥 Contactos
└─ 🕒 Historial

📁 Ayuda
├─ 🎫 Tickets
├─ 📅 Calendario
└─ ⚙️ Configuración
```

## Archivos Modificados

### 1. `invoices/drafts.html`

**Menú Lateral:**
- ✅ Menú completo agregado
- ✅ Sección "Facturas" expandida por defecto (`class="sub-menu ... active"`)
- ✅ "Borradores" resaltado en verde (`text-success-300`)
- ✅ Todas las rutas relativas correctas con `../` (ej: `../index.html`, `../users.html`)

**Header Superior:**
- ✅ Botón drawer para colapsar sidebar
- ✅ Título de página: "Borradores"
- ✅ Barra de búsqueda completa con atajo "K"
- ✅ Botón de dark mode/light mode
- ✅ Miniatura de perfil (52x52)
- ✅ Nombre de usuario dinámico (clase `user-profile-name`)
- ✅ Email dinámico (clase `user-profile-email`)
- ✅ Dropdown de perfil funcional

### 2. `invoices/issued.html`

**Menú Lateral:**
- ✅ Menú completo agregado
- ✅ Sección "Facturas" expandida por defecto
- ✅ "Facturas emitidas" resaltado en verde
- ✅ Todas las rutas relativas correctas

**Header Superior:**
- ✅ Botón drawer para colapsar sidebar
- ✅ Título de página: "Facturas Emitidas"
- ✅ Barra de búsqueda completa con atajo "K"
- ✅ Botón de dark mode/light mode
- ✅ Miniatura de perfil (52x52)
- ✅ Nombre de usuario dinámico
- ✅ Email dinámico
- ✅ Dropdown de perfil funcional

## Verificación Visual

### En drafts.html

**Menú Lateral:**
- ✅ Desplegado automáticamente (sin necesidad de clic)
- ✅ "Borradores" en color verde
- ✅ Todas las demás opciones visibles (Estadísticas, Analítica, etc.)

**Header Superior:**
- ✅ Barra de búsqueda visible y funcional
- ✅ Miniatura de perfil de 52x52 píxeles
- ✅ Nombre de usuario (cargado dinámicamente)
- ✅ Email (cargado dinámicamente)
- ✅ Botón de tema funcional
- ✅ Diseño idéntico a `index.html`

### En issued.html

**Menú Lateral:**
- ✅ Desplegado automáticamente
- ✅ "Facturas emitidas" en color verde
- ✅ Todas las demás opciones visibles

**Header Superior:**
- ✅ Barra de búsqueda visible y funcional
- ✅ Miniatura de perfil de 52x52 píxeles
- ✅ Nombre de usuario (cargado dinámicamente)
- ✅ Email (cargado dinámicamente)
- ✅ Botón de tema funcional
- ✅ Diseño idéntico a `index.html`

## Funcionalidad del Menú

### Menú Desplegable
- Clic en "Facturas" → Expande/colapsa el submenu
- Funciona automáticamente gracias a `assets/js/main.js`
- La clase `active` en el `<ul class="sub-menu">` hace que empiece expandido

### Navegación
Todos los enlaces redirigen correctamente:
- `new.html` → Nueva factura
- `drafts.html` → Lista de borradores
- `issued.html` → Lista de facturas emitidas
- `../index.html` → Dashboard principal
- `../users.html` → Contactos
- etc.

## Prueba Rápida

### Verificación del Sidebar (Menú Lateral)

1. Abre `drafts.html` en el navegador
2. **Verifica que veas** en el sidebar:
   - Paneles (con flecha)
   - Transacciones
   - **Facturas (expandido)**
     - Emitir factura
     - **Borradores (verde)**
     - Facturas emitidas
   - Gastos
   - Estadísticas
   - Analítica
   - Mi cartera
   - Bandeja de entrada
   - Integraciones
   - Contactos
   - Historial
   - **Ayuda**
     - Tickets
     - Calendario
     - Configuración

3. Haz clic en cualquier enlace → Debería redirigir correctamente

### Verificación del Header Superior

1. **Verifica que veas**:
   - Botón verde en la izquierda para colapsar el sidebar
   - Título "Borradores" o "Facturas Emitidas" (según la página)
   - **Barra de búsqueda** en el centro con placeholder "Buscar..." y tecla "K"
   - Botón de dark mode (luna/sol)
   - Separador vertical
   - **Miniatura de perfil** (círculo de 52x52px)
   - **Nombre de usuario** (en negrita, 2xl visible)
   - **Email del usuario** (texto gris, 2xl visible)
   - Flecha hacia abajo para dropdown

2. **Funcionalidad**:
   - Clic en botón drawer → Colapsa/expande el sidebar
   - Clic en perfil → Abre dropdown de perfil
   - Clic en dark mode → Cambia tema
   - La barra de búsqueda debe ser funcional

### Carga Dinámica de Datos

El script `userHeader.js` debe cargar automáticamente:
- ✅ Imagen de perfil desde `business_info.profile_image_url`
- ✅ Nombre desde `business_info.nombre_fiscal`
- ✅ Email desde `auth.users.email`

---

## Estructura del Header

El header ahora es **idéntico** al de todas las demás páginas (`index.html`, `users.html`, `expenses.html`, etc.):

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] TÍTULO        [🔍 Buscar... K]      [🌙] │ [👤 Nombre]      │
│                                                │     Email       │
└─────────────────────────────────────────────────────────────────┘
```

---

**Estado:** ✅ Menú lateral y header completamente funcionales en ambas páginas  
**Fecha:** 30 de enero de 2026  
**Archivos corregidos:** `invoices/drafts.html`, `invoices/issued.html`
**Estructura aplicada:** Header completo de `index.html` con título personalizado
