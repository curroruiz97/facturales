# 🚀 Configuración de Supabase - Guía Completa

Este documento explica la configuración completa de Supabase en el proyecto, incluyendo autenticación, RLS y CRUD.

## 📋 Estado Actual

### ✅ Instalación Completada

- **Paquete**: `@supabase/supabase-js` (v2.93.2)
- **Bundler**: Vite (para desarrollo y producción)
- **Cliente**: Configurado en `assets/js/supabaseClient.js` con variables de entorno
- **Autenticación**: Módulo completo en `assets/js/auth.js`
- **Protección**: Auth guard en `assets/js/auth-guard.js`
- **CRUD**: Módulo de clientes en `assets/js/clients.js`
- **Credenciales**: Almacenadas en `.env` (no se sube a Git)

### 📁 Estructura de Archivos

```
facturales/
├── .env                                    # Credenciales (NO en Git)
├── .env.example                            # Template de credenciales
├── vite.config.js                          # Configuración de Vite
├── package.json                            # Scripts y dependencias
├── assets/
│   └── js/
│       ├── supabaseClient.js               # Cliente inicializado
│       ├── auth.js                         # Módulo de autenticación
│       ├── auth-guard.js                   # Middleware de protección
│       └── clients.js                      # CRUD de clientes
├── supabase/
│   ├── config.toml                         # Configuración de Supabase CLI
│   ├── seed.sql                            # Seeds para desarrollo
│   └── migrations/                         # Migraciones de base de datos
│       ├── 20260129120604_create_clientes_table.sql
│       └── 20260129120605_setup_rls_clientes.sql
├── signin.html                             # Login con funcionalidad real
├── signup.html                             # Registro con funcionalidad real
├── index.html                              # Dashboard protegido
├── users.html                              # Gestión de clientes protegida
├── SUPABASE_SETUP.md                       # Este archivo
├── INSTRUCCIONES_MIGRACIONES.md            # Cómo aplicar migraciones
├── INSTRUCCIONES_AUTH.md                   # Configuración de autenticación
├── INSTRUCCIONES_RLS.md                    # Configuración de RLS
└── TESTING_SUPABASE.md                     # Guía de testing
```

## 🔑 Credenciales y Variables de Entorno

### Supabase Cloud
- **Project URL**: `https://nukslmpdwjqlepacukul.supabase.co`
- **Anon Key**: Almacenada en `.env`
- **Dashboard**: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul

### Configurar Variables de Entorno

1. **Crear archivo `.env`** en la raíz del proyecto:
   ```env
   VITE_SUPABASE_URL=https://nukslmpdwjqlepacukul.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_clave_aqui
   ```

2. **Obtener credenciales** desde el Dashboard:
   - Ir a: Settings > API
   - Copiar "Project URL" → VITE_SUPABASE_URL
   - Copiar "anon public" key → VITE_SUPABASE_ANON_KEY

⚠️ **Importante**: 
- El archivo `.env` NO se sube a Git (está en `.gitignore`)
- Solo variables con prefijo `VITE_` son accesibles en el frontend
- La clave `anon` es segura para el frontend (RLS protege los datos)

## 🚀 Instalación y Desarrollo

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crear archivo `.env` con las credenciales (ver sección anterior).

### 3. Iniciar Servidor de Desarrollo

```bash
# Solo Vite
npm run dev

# O en terminales separadas para desarrollo completo:
# Terminal 1: Vite (desarrollo)
npm run dev

# Terminal 2: Tailwind (compilar CSS en tiempo real)
npm run tailwind:dev
```

El sitio estará disponible en: `http://localhost:5173`

### 4. Build para Producción

```bash
# Compilar CSS de Tailwind
npm run tailwind:build

# Build de Vite
npm run build

# Previsualizar build
npm run preview
```

## 📦 Uso del Cliente Supabase

### En archivos HTML

```html
<!-- Cargar la biblioteca de Supabase desde CDN -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Cargar módulos como ES modules -->
<script type="module" src="./assets/js/supabaseClient.js"></script>
<script type="module" src="./assets/js/auth.js"></script>
<script type="module" src="./assets/js/clients.js"></script>

<!-- Para páginas protegidas, agregar auth-guard -->
<script type="module" src="./assets/js/auth-guard.js"></script>
```

### Uso en JavaScript

```javascript
// Leer clientes
const { data, error } = await window.supabaseClient
  .from('clientes')
  .select('*');

// O usar las funciones del módulo clients.js
const result = await window.getClients();
console.log(result.data); // Array de clientes
```

## 🔐 Autenticación

### Funciones Disponibles

El módulo `auth.js` exporta las siguientes funciones globalmente:

```javascript
// Registrar usuario
const result = await window.signUp(email, password, metadata);
// metadata ejemplo: { first_name: 'Juan', last_name: 'Pérez' }

// Iniciar sesión
const result = await window.signIn(email, password);

// Cerrar sesión
const result = await window.signOut();

// Obtener usuario actual
const result = await window.getCurrentUser();

// Verificar si está autenticado
const isAuth = await window.checkAuth();

// Listener de cambios de auth
const subscription = window.onAuthStateChange((event, session) => {
  console.log('Auth cambió:', event, session);
});

// Recuperar contraseña
const result = await window.resetPassword(email);

// Actualizar contraseña
const result = await window.updatePassword(newPassword);
```

### Proteger Páginas

Las páginas incluyen automáticamente `auth-guard.js` que:
- Verifica autenticación al cargar
- Redirige a `signin.html` si no está autenticado
- Muestra información del usuario en elementos con clases especiales:
  - `.user-email` - Muestra el email
  - `.user-name` - Muestra el nombre completo
  - `.user-avatar` - Muestra avatar o iniciales

### Páginas Públicas vs Protegidas

**Páginas públicas** (no requieren login):
- `signin.html`
- `signup.html`
- `404.html`
- `coming-soon.html`

**Páginas protegidas** (requieren login):
- `index.html` (dashboard)
- `users.html` (gestión de clientes)
- Todas las demás páginas de la aplicación

## 📊 Base de Datos

### Tabla: clientes

**Campos:**
- `id` (UUID) - Primary key, auto-generado
- `nombre_razon_social` (TEXT) - Nombre o razón social (requerido)
- `identificador` (TEXT) - CIF/NIF/DNI (requerido, único)
- `email` (TEXT) - Email de contacto
- `telefono` (TEXT) - Teléfono
- `direccion` (TEXT) - Dirección completa
- `codigo_postal` (TEXT) - Código postal
- `ciudad` (TEXT) - Ciudad
- `pais` (TEXT) - País
- `dia_facturacion` (INTEGER) - Día preferido de facturación (1-31)
- `estado` (TEXT) - Estado del cliente (activo/inactivo)
- `created_at` (TIMESTAMPTZ) - Fecha de creación
- `updated_at` (TIMESTAMPTZ) - Fecha de última actualización

**Índices:**
- `idx_clientes_nombre` - Optimiza búsquedas por nombre
- `idx_clientes_identificador` - Optimiza búsquedas por identificador
- `idx_clientes_estado` - Optimiza filtros por estado

**Triggers:**
- `update_clientes_updated_at` - Actualiza `updated_at` automáticamente

### Aplicar Migraciones

Ver archivo: `INSTRUCCIONES_MIGRACIONES.md`

1. Ir al SQL Editor de Supabase
2. Ejecutar: `supabase/migrations/20260129120604_create_clientes_table.sql`
3. Verificar que la tabla se creó correctamente

## 🔒 Row Level Security (RLS)

RLS está configurado para proteger los datos:

### Políticas Activas

**Para usuarios autenticados** (`authenticated`):
- ✅ Pueden leer clientes (SELECT)
- ✅ Pueden crear clientes (INSERT)
- ✅ Pueden actualizar clientes (UPDATE)
- ✅ Pueden eliminar clientes (DELETE)

**Para usuarios anónimos** (`anon`):
- ❌ No pueden acceder a clientes (todas las operaciones bloqueadas)

### Aplicar RLS

Ver archivo: `INSTRUCCIONES_RLS.md`

1. Ir al SQL Editor de Supabase
2. Ejecutar: `supabase/migrations/20260129120605_setup_rls_clientes.sql`
3. Verificar que las políticas se crearon correctamente

## 🛠️ CRUD de Clientes

### Funciones Disponibles

El módulo `clients.js` exporta las siguientes funciones:

```javascript
// Crear cliente
const result = await window.createClient({
  nombre_razon_social: 'Empresa S.L.',
  identificador: 'B12345678',
  email: 'info@empresa.com',
  telefono: '+34 600 000 000',
  direccion: 'Calle Principal 123',
  ciudad: 'Madrid',
  pais: 'España',
  estado: 'activo'
});

// Listar clientes
const result = await window.getClients();
// Con búsqueda:
const result = await window.getClients('empresa');

// Obtener cliente por ID
const result = await window.getClientById(clientId);

// Actualizar cliente
const result = await window.updateClient(clientId, {
  telefono: '+34 611 222 333'
});

// Eliminar cliente
const result = await window.deleteClient(clientId);

// Autocompletado (mínimo 3 caracteres)
const result = await window.searchClientsAutocomplete('emp');
```

### Respuestas

Todas las funciones devuelven un objeto con estructura:

```javascript
// Éxito
{ success: true, data: {...} }

// Error
{ success: false, error: 'Mensaje de error' }
```

## 🗂️ Estructura Completa Implementada

### ✅ Completado:

1. ✅ Configuración de Vite con multi-page support
2. ✅ Variables de entorno con prefijo VITE_
3. ✅ Cliente de Supabase con env vars
4. ✅ Módulo de autenticación completo
5. ✅ Auth guard para protección de rutas
6. ✅ Páginas de login/registro funcionales
7. ✅ Tabla de clientes con migraciones
8. ✅ Row Level Security configurado
9. ✅ CRUD completo de clientes
10. ✅ Dashboard con info de usuario

## 🔒 Seguridad

- ✅ Credenciales en `.env` (protegido por `.gitignore`)
- ✅ Solo se usa la clave pública (anon key)
- ✅ RLS habilitado en tabla clientes
- ✅ Políticas de acceso configuradas
- ✅ Auth guard protegiendo rutas privadas
- ✅ Validaciones en frontend y backend
- ✅ Manejo de errores de autenticación

### Buenas Prácticas Implementadas

1. **Variables de entorno**: Credenciales nunca en el código
2. **RLS**: Protección a nivel de base de datos
3. **Auth guard**: Verificación de autenticación en cada página
4. **Validaciones**: Frontend y backend validan datos
5. **Mensajes de error**: No revelan información sensible

## 🧪 Testing

Ver archivo completo: `TESTING_SUPABASE.md`

### Quick Test

```bash
# 1. Iniciar servidor
npm run dev

# 2. Navegar a http://localhost:5173

# 3. Registrarse en signup.html

# 4. Verificar que redirige al dashboard

# 5. Abrir consola (F12) y probar:
window.getClients().then(console.log)

# 6. Crear un cliente:
window.createClient({
  nombre_razon_social: 'Test',
  identificador: 'A12345678'
}).then(console.log)
```

## 📚 Documentación y Recursos

### Documentos del Proyecto

- `SUPABASE_SETUP.md` - Este archivo (guía completa)
- `INSTRUCCIONES_MIGRACIONES.md` - Cómo aplicar migraciones
- `INSTRUCCIONES_AUTH.md` - Configuración de autenticación
- `INSTRUCCIONES_RLS.md` - Configuración de RLS
- `TESTING_SUPABASE.md` - Guía de testing completa

### Enlaces Útiles

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Dashboard del Proyecto](https://supabase.com/dashboard/project/nukslmpdwjqlepacukul)
- [Vite Docs](https://vitejs.dev/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🚨 Problemas Comunes

### "Supabase client no está inicializado"
- Verificar que `.env` existe con credenciales correctas
- Reiniciar servidor de desarrollo
- Limpiar caché del navegador

### "Error 401 o JWT expired"
- Cerrar sesión y volver a iniciar sesión
- Verificar configuración de JWT en Supabase Dashboard

### "No se pueden leer clientes"
- Verificar que el usuario está autenticado
- Verificar que RLS está configurado correctamente
- Ver logs en consola del navegador

### "Vite no inicia"
- Verificar que puerto 5173 no está en uso
- Ejecutar `npm install`
- Verificar que `vite.config.js` existe

## 🔄 Próximos Pasos Recomendados

1. **Testing Completo**: Seguir `TESTING_SUPABASE.md`
2. **Personalización**: Adaptar validaciones y campos según necesidades
3. **Optimización**: Implementar paginación en listado de clientes
4. **Features**: Agregar más tablas (facturas, productos, etc.)
5. **Deploy**: Configurar deployment a producción

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en consola del navegador (F12)
2. Verificar logs en Supabase Dashboard > Logs
3. Consultar documentación en los archivos INSTRUCCIONES_*.md
4. Revisar guía de testing en TESTING_SUPABASE.md

---

**Última actualización**: 29 de enero de 2026
**Estado**: Configuración completa y funcional ✅
