# Instrucciones: Validación de Business Info en Páginas del Dashboard

## Resumen

Se ha implementado un sistema de validación para verificar que los usuarios tengan información de negocio completa antes de acceder al dashboard.

## Archivos Creados

1. **`assets/js/businessInfo.js`**: Módulo con funciones CRUD para gestionar información de negocio
2. **`assets/js/checkBusinessInfo.js`**: Middleware de validación para verificar business_info completo
3. **`complete-profile.html`**: Página para completar datos de negocio después del registro

## Páginas Ya Actualizadas

Las siguientes páginas ya tienen la validación implementada:

- ✅ `index.html` (Dashboard principal)
- ✅ `expenses.html` (Página de gastos)
- ✅ `settings.html` (Configuración - carga/edita datos de negocio)
- ✅ `complete-profile.html` (Completar perfil - solo verifica autenticación)

## Cómo Añadir Validación a Otras Páginas del Dashboard

Para añadir la validación a cualquier otra página protegida del dashboard, sigue estos pasos:

### 1. Identificar Páginas que Necesitan Protección

Páginas que probablemente necesitan protección:
- `users.html`
- `transaction.html`
- `messages.html`
- `analytics.html`
- `statistics.html`
- `calender.html`
- `my-wallet.html`
- `invoices/new.html`
- `invoices/preview.html`
- Cualquier otra página del dashboard interno

### 2. Añadir Scripts de Validación

Antes del cierre del `</body>`, añade el siguiente código:

```html
<!-- Supabase y Business Info Validation -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="module" src="./assets/js/supabaseClient.js"></script>
<script type="module" src="./assets/js/auth.js"></script>
<script type="module" src="./assets/js/businessInfo.js"></script>
<script type="module" src="./assets/js/checkBusinessInfo.js"></script>

<!-- Verificar business info completo -->
<script type="module">
  // Esperar a que todos los módulos se carguen
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Verificar que el usuario tenga información de negocio completa
  await window.checkBusinessInfoComplete();
</script>
```

**Nota:** Si la página ya tiene los scripts de Supabase (como `index.html`), solo añade los que falten.

### 3. Ajustar Rutas si la Página está en Subcarpeta

Si la página está en una subcarpeta (como `invoices/new.html`), ajusta las rutas:

```html
<script type="module" src="../assets/js/supabaseClient.js"></script>
<script type="module" src="../assets/js/auth.js"></script>
<script type="module" src="../assets/js/businessInfo.js"></script>
<script type="module" src="../assets/js/checkBusinessInfo.js"></script>
```

## Flujo de Validación

```
Usuario accede a página protegida
    ↓
¿Está autenticado?
    NO → Redirige a signin.html
    SÍ ↓
¿Tiene business_info?
    NO → Redirige a complete-profile.html
    SÍ ↓
Acceso permitido
```

## Páginas que NO Necesitan Validación

Las siguientes páginas NO deben tener validación porque son públicas o de autenticación:

- ❌ `index-2.html` (Landing page)
- ❌ `home.html` (Landing page)
- ❌ `signin.html` (Login)
- ❌ `signup.html` (Registro)
- ❌ `404.html` (Error page)
- ❌ `coming-soon.html` (Página pública)

## Funciones Disponibles

### En `checkBusinessInfo.js`:

```javascript
// Verificar autenticación + business_info completo
await window.checkBusinessInfoComplete();

// Solo verificar autenticación (sin business_info)
await window.checkAuthOnly();
```

### En `businessInfo.js`:

```javascript
// Guardar información de negocio
await window.saveBusinessInfo(data);

// Obtener información de negocio
await window.getBusinessInfo(userId);

// Actualizar información de negocio
await window.updateBusinessInfo(userId, updates);

// Verificar si tiene información de negocio
await window.hasBusinessInfo(userId);

// Verificar si un NIF/CIF existe
await window.checkNifCifExists(nifCif);
```

## Migración de Base de Datos

Para aplicar la migración de Supabase:

1. Accede al dashboard de Supabase
2. Ve a SQL Editor
3. Ejecuta el archivo: `supabase/migrations/20260130112925_create_business_info_table.sql`

O usa Supabase CLI:

```bash
supabase db push
```

## Verificación

Para verificar que la validación funciona correctamente:

1. Cierra sesión si estás autenticado
2. Regístrate con un nuevo usuario
3. Deberías ser redirigido a `complete-profile.html`
4. Completa el formulario de datos de negocio
5. Deberías ser redirigido al dashboard
6. Intenta acceder a cualquier página protegida - debería funcionar sin redirecciones

## Solución de Problemas

### Error: "Supabase client no está inicializado"
- Verifica que `supabaseClient.js` se cargue antes de `checkBusinessInfo.js`
- Aumenta el tiempo de espera en el script (de 200ms a 500ms)

### Bucle de redirección infinito
- Verifica que `complete-profile.html` y `settings.html` NO llamen a `checkBusinessInfoComplete()`
- Estas páginas solo deben verificar autenticación con `checkAuthOnly()`

### Usuario no es redirigido a complete-profile
- Verifica que la tabla `business_info` esté creada en Supabase
- Verifica que las políticas RLS estén activas
- Revisa la consola del navegador para errores

## Contacto

Si encuentras problemas o necesitas ayuda, revisa:
- Console del navegador (F12) para errores de JavaScript
- Network tab para verificar llamadas a Supabase
- Logs de Supabase Dashboard para errores de base de datos
