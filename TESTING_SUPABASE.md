# 🧪 Guía de Testing - Supabase Integration

## Preparación del Entorno de Testing

### 1. Verificar Instalación

```bash
# Verificar que las dependencias estén instaladas
npm list @supabase/supabase-js
npm list vite

# Si faltan, instalar
npm install
```

### 2. Iniciar Servidor de Desarrollo

```bash
# Opción 1: Solo Vite
npm run dev

# Opción 2: Vite + Tailwind (en terminales separadas)
# Terminal 1:
npm run dev

# Terminal 2:
npm run tailwind:dev
```

El servidor debería estar corriendo en: `http://localhost:5173`

## Checklist de Testing

### ✅ Fase 1: Configuración Básica

- [ ] **Vite funciona correctamente**
  - Navegar a `http://localhost:5173`
  - Verificar que el sitio carga sin errores
  - Verificar que hot-reload funciona (cambiar algo y ver actualización automática)

- [ ] **Variables de entorno funcionan**
  - Abrir consola del navegador (F12)
  - Buscar mensaje: "✅ Supabase client initialized successfully"
  - Buscar mensaje: "📍 Project URL: https://nukslmpdwjqlepacukul.supabase.co"
  - No deben aparecer errores de variables de entorno

### ✅ Fase 2: Autenticación

#### 2.1 Registro de Usuario (signup.html)

- [ ] **Navegación**
  - Ir a `http://localhost:5173/signup.html`
  - La página debe cargar correctamente
  
- [ ] **Validaciones del formulario**
  - Intentar enviar formulario vacío → Debe mostrar error
  - Intentar con email inválido → Debe mostrar error
  - Intentar con contraseña < 6 caracteres → Debe mostrar error
  - Intentar con contraseñas que no coinciden → Debe mostrar error
  - Intentar sin aceptar términos → Debe mostrar error

- [ ] **Registro exitoso**
  - Llenar todos los campos correctamente
    - Nombre: Juan
    - Apellido: Pérez
    - Email: test@example.com (usar email real si confirmación está activa)
    - Contraseña: 123456 (o más segura)
    - Confirmar contraseña: 123456
    - Aceptar términos ✓
  - Click en "Registrarse"
  - Debe mostrar mensaje: "¡Registro exitoso! Redirigiendo al dashboard..."
  - Debe redirigir a `index.html` después de 2 segundos

- [ ] **Verificar usuario en Supabase Dashboard**
  - Ir a: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul
  - Authentication > Users
  - Debe aparecer el usuario recién creado

#### 2.2 Inicio de Sesión (signin.html)

- [ ] **Cerrar sesión primero**
  - En el dashboard, buscar botón de logout
  - Click en logout
  - Debe redirigir a `signin.html`

- [ ] **Navegación**
  - Ir a `http://localhost:5173/signin.html`
  - La página debe cargar correctamente

- [ ] **Login con credenciales incorrectas**
  - Email: test@example.com
  - Contraseña: incorrecta123
  - Click en "Iniciar sesión"
  - Debe mostrar error: "Email o contraseña incorrectos"

- [ ] **Login con credenciales correctas**
  - Email: test@example.com
  - Contraseña: 123456
  - Click en "Iniciar sesión"
  - Debe mostrar mensaje: "¡Inicio de sesión exitoso! Redirigiendo..."
  - Debe redirigir a `index.html` después de 1 segundo

#### 2.3 Protección de Rutas (Auth Guard)

- [ ] **Acceso sin autenticación**
  - Cerrar sesión (logout)
  - Intentar acceder directamente a `http://localhost:5173/index.html`
  - Debe mostrar pantalla de loading brevemente
  - Debe redirigir automáticamente a `signin.html`

- [ ] **Acceso con autenticación**
  - Iniciar sesión
  - Navegar a `index.html`
  - Debe cargar correctamente sin redirección
  - Debe mostrar información del usuario

- [ ] **Páginas públicas**
  - Sin autenticación, intentar acceder a:
    - `signin.html` → Debe funcionar
    - `signup.html` → Debe funcionar
    - `404.html` → Debe funcionar

### ✅ Fase 3: Base de Datos y Migraciones

#### 3.1 Verificar Tabla Clientes

- [ ] **En Supabase Dashboard**
  - Ir a Table Editor
  - Buscar tabla `clientes`
  - Verificar campos:
    - id (uuid)
    - nombre_razon_social (text)
    - identificador (text)
    - email (text)
    - telefono (text)
    - direccion (text)
    - codigo_postal (text)
    - ciudad (text)
    - pais (text)
    - dia_facturacion (int4)
    - estado (text)
    - created_at (timestamptz)
    - updated_at (timestamptz)

#### 3.2 Insertar Cliente de Prueba Manualmente

- [ ] **Desde Table Editor**
  - Click en "Insert row"
  - Llenar:
    - nombre_razon_social: "Empresa Test S.L."
    - identificador: "B12345678"
    - email: "test@empresa.com"
    - telefono: "+34 600 000 000"
    - direccion: "Calle Test 123"
    - ciudad: "Madrid"
    - pais: "España"
    - estado: "activo"
  - Click en "Save"
  - Debe aparecer en la tabla

### ✅ Fase 4: Row Level Security (RLS)

#### 4.1 Verificar RLS Habilitado

- [ ] **En SQL Editor**
  - Ejecutar:
    ```sql
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'clientes';
    ```
  - Resultado: `rowsecurity = true`

#### 4.2 Verificar Políticas

- [ ] **Listar políticas**
  - Ejecutar:
    ```sql
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'clientes';
    ```
  - Debe mostrar 8 políticas (2 por cada operación: SELECT, INSERT, UPDATE, DELETE)

#### 4.3 Probar RLS desde la Aplicación

- [ ] **Sin autenticación**
  - Cerrar sesión
  - Abrir consola del navegador (F12)
  - Ejecutar:
    ```javascript
    window.getClients().then(console.log)
    ```
  - Debe devolver error o array vacío (RLS bloqueando)

- [ ] **Con autenticación**
  - Iniciar sesión
  - Abrir consola del navegador (F12)
  - Ejecutar:
    ```javascript
    window.getClients().then(console.log)
    ```
  - Debe devolver: `{ success: true, data: [...clientes] }`

### ✅ Fase 5: CRUD de Clientes

#### 5.1 Crear Cliente desde Modal (Mejorado)

- [ ] **Desde users.html**
  - Ir a `http://localhost:5173/users.html`
  - Click en botón "Nuevo Cliente"
  - El modal debe abrirse centrado y amplio (896px)
  - Debe mostrar grid de 2 columnas en pantallas grandes
  - Campos obligatorios marcados con asterisco rojo

- [ ] **Validaciones del formulario**
  - Intentar guardar sin llenar campos obligatorios
  - Debe mostrar errores bajo los campos
  - Campos deben marcarse con borde rojo
  - Llenar solo Nombre → Error en NIF/CIF
  - Llenar email inválido → Error "Email no válido"

- [ ] **Crear cliente completo**
  - Llenar todos los campos:
    - Nombre: "Cliente Prueba"
    - NIF: "A11111111"
    - Email: "prueba@test.com"
    - Teléfono: "+34 611 222 333"
    - Dirección: "Calle Prueba 1"
    - Código Postal: "28001"
    - Ciudad: "Barcelona"
    - País: "España"
    - Día facturación: "30"
    - Estado: "Activo"
  - Click en "Guardar Cliente"
  - Botón debe mostrar spinner y "Guardando..."
  - Modal debe cerrarse con animación
  - Debe aparecer toast de éxito
  - Tabla debe actualizarse automáticamente
  - Cliente debe aparecer en la lista

- [ ] **Verificar user_id en Supabase**
  - Ir a Table Editor > clientes
  - Buscar el cliente recién creado
  - Verificar que tiene `user_id` asignado
  - El user_id debe coincidir con tu usuario

- [ ] **Crear cliente desde consola (legacy)**
  - Iniciar sesión
  - Ejecutar:
    ```javascript
    window.createClient({
      nombre_razon_social: 'Cliente Prueba 2',
      identificador: 'B22222222',
      email: 'prueba2@test.com',
      telefono: '+34 611 222 333',
      direccion: 'Calle Prueba 1',
      ciudad: 'Barcelona',
      pais: 'España',
      estado: 'activo'
    }).then(console.log)
    ```
  - Debe devolver: `{ success: true, data: {cliente creado} }`
  - Debe incluir `user_id` en los datos

#### 5.1.5 Crear Cliente desde Facturas

- [ ] **Desde invoices/new.html**
  - Ir a `http://localhost:5173/invoices/new.html`
  - Buscar sección de cliente
  - Click en "+ Crear cliente"
  - El modal debe abrirse centrado y amplio
  - Llenar los campos obligatorios
  - Click en "Guardar Cliente"
  - Debe guardarse en Supabase
  - Debe auto-seleccionarse en el formulario de factura
  - Campos de la factura deben rellenarse con datos del cliente
  - Modal debe cerrarse

#### 5.2 Leer Clientes (con user_id)

- [ ] **Listar todos (solo propios)**
  - Ejecutar:
    ```javascript
    window.getClients().then(console.log)
    ```
  - Debe devolver array con clientes
  - SOLO debe mostrar clientes con tu user_id (RLS filtra)

- [ ] **Verificar aislamiento entre usuarios**
  - Registrar otro usuario diferente
  - Crear clientes con ese usuario
  - Cerrar sesión y loguearse con el primer usuario
  - Ejecutar: `window.getClients().then(console.log)`
  - NO debe mostrar clientes del segundo usuario

- [ ] **Buscar por término**
  - Ejecutar:
    ```javascript
    window.getClients('Prueba').then(console.log)
    ```
  - Debe devolver solo TUS clientes que contienen "Prueba" en el nombre

#### 5.3 Actualizar Cliente

- [ ] **Obtener ID de un cliente primero**
  - Ejecutar:
    ```javascript
    window.getClients().then(r => console.log(r.data[0].id))
    ```
  - Copiar el ID

- [ ] **Actualizar cliente**
  - Ejecutar (reemplazar ID_AQUI):
    ```javascript
    window.updateClient('ID_AQUI', {
      nombre_razon_social: 'Cliente Actualizado',
      identificador: 'A11111111',
      telefono: '+34 699 888 777'
    }).then(console.log)
    ```
  - Debe devolver: `{ success: true, data: {cliente actualizado} }`

#### 5.4 Eliminar Cliente

- [ ] **Eliminar cliente**
  - Ejecutar (reemplazar ID_AQUI):
    ```javascript
    window.deleteClient('ID_AQUI').then(console.log)
    ```
  - Debe devolver: `{ success: true }`

- [ ] **Verificar eliminación**
  - Ejecutar:
    ```javascript
    window.getClients().then(console.log)
    ```
  - El cliente eliminado no debe aparecer

### ✅ Fase 6: Interfaz de Usuario y Modal Mejorado

#### 6.1 Dashboard (index.html)

- [ ] **Cargar con autenticación**
  - Iniciar sesión
  - Ir a `index.html`
  - Debe cargar correctamente
  - Verificar en consola que no hay errores

- [ ] **Información de usuario**
  - Buscar elementos con clase `.user-email`
  - Debe mostrar el email del usuario actual
  - Buscar elementos con clase `.user-name`
  - Debe mostrar el nombre del usuario

- [ ] **Botón de logout**
  - Buscar botón de cerrar sesión
  - Click en logout
  - Debe mostrar confirmación
  - Confirmar
  - Debe redirigir a `signin.html`

#### 6.2 Modal de Cliente - UI/UX (users.html)

- [ ] **Diseño y presentación**
  - Click en "Nuevo Cliente"
  - Modal debe estar centrado verticalmente
  - Modal debe estar centrado horizontalmente
  - Ancho del modal debe ser amplio (896px en pantallas grandes)
  - Debe tener borde verde (border-success-300)
  - Debe tener sombra y blur en el overlay

- [ ] **Grid responsive**
  - En pantalla grande: 2 columnas visibles
  - En móvil: 1 columna
  - Campos bien organizados y espaciados
  - Labels claramente visibles

- [ ] **Interacciones**
  - Click en overlay → debe cerrar el modal
  - Click en botón X → debe cerrar el modal
  - Presionar ESC → debe cerrar el modal
  - Click en "Cancelar" → debe cerrar el modal
  - Al abrir, primer campo debe tener focus

- [ ] **Animaciones**
  - Modal debe aparecer con fade in
  - Contenido debe hacer slide in
  - Al cerrar, debe desaparecer suavemente

- [ ] **Estados de carga**
  - Al guardar, botón debe mostrar spinner
  - Texto del botón debe cambiar a "Guardando..."
  - Botón debe deshabilitarse durante guardado
  - Campos deben permanecer accesibles

- [ ] **Dark mode**
  - Activar dark mode
  - Modal debe adaptarse correctamente
  - Textos deben ser legibles
  - Contraste adecuado

#### 6.3 Modal de Cliente - Funcionalidad (invoices/new.html)

- [ ] **Abrir desde facturas**
  - Ir a `invoices/new.html`
  - Click en "Crear cliente" o botón similar
  - Modal debe abrirse con mismo diseño que users.html
  - Debe ser el mismo ancho y centrado

- [ ] **Auto-selección tras crear**
  - Llenar campos del cliente
  - Guardar cliente
  - Cliente debe guardarse en Supabase
  - Cliente debe auto-seleccionarse
  - Campos del formulario de factura deben rellenarse
  - Modal debe cerrarse automáticamente

- [ ] **Consistencia**
  - El modal debe verse y funcionar idéntico en ambas páginas
  - Mismas validaciones
  - Mismas animaciones
  - Mismo diseño

#### 6.4 Página de Clientes (users.html)

- [ ] **Cargar con autenticación**
  - Iniciar sesión
  - Ir a `users.html`
  - Debe cargar correctamente
  - Verificar protección con auth-guard

- [ ] **Listar clientes**
  - Debe mostrar SOLO tus clientes (filtrado por user_id)
  - Verificar que los datos se cargan desde Supabase
  - Contador de clientes debe ser correcto

- [ ] **Editar cliente**
  - Click en botón "Editar" de un cliente
  - Modal debe abrirse en modo editar
  - Título debe decir "Editar Cliente"
  - Campos deben estar prellenados
  - Botón debe decir "Actualizar Cliente"
  - Hacer cambios y guardar
  - Cliente debe actualizarse en la tabla

- [ ] **Eliminar cliente**
  - Click en botón "Eliminar"
  - Debe mostrar modal de confirmación
  - Confirmar eliminación
  - Cliente debe eliminarse de la tabla
  - Debe actualizarse el contador

## 🐛 Troubleshooting

### Problema: "Supabase client no está inicializado"

**Solución**:
1. Verificar que el archivo `.env` existe y tiene las credenciales correctas
2. Reiniciar el servidor de desarrollo (`Ctrl+C` y `npm run dev`)
3. Limpiar caché del navegador (`Ctrl+Shift+R`)

### Problema: "Error 401 o JWT expired"

**Solución**:
1. Cerrar sesión y volver a iniciar sesión
2. Verificar configuración de JWT en Supabase Dashboard
3. Verificar que las credenciales en `.env` son correctas

### Problema: "No se pueden leer clientes (RLS)"

**Solución**:
1. Verificar que el usuario está autenticado
2. Verificar que RLS está configurado correctamente
3. Ejecutar script de RLS nuevamente si es necesario

### Problema: "Vite no inicia"

**Solución**:
1. Verificar que el puerto 5173 no está en uso
2. Ejecutar `npm install` para instalar dependencias
3. Verificar que `vite.config.js` existe

## ✅ Checklist Final

- [ ] Vite funciona y hot-reload está activo
- [ ] Variables de entorno se cargan correctamente
- [ ] Registro de usuarios funciona
- [ ] Login funciona con credenciales correctas
- [ ] Login falla con credenciales incorrectas
- [ ] Auth guard protege rutas privadas
- [ ] RLS está habilitado y funciona
- [ ] CRUD de clientes funciona completamente
- [ ] Dashboard muestra información del usuario
- [ ] Logout funciona correctamente
- [ ] No hay errores en la consola del navegador

## 📊 Reporte de Resultados

Al completar el testing, documenta:

- ✅ **Tests exitosos**: [número]
- ❌ **Tests fallidos**: [número]
- ⚠️ **Tests con advertencias**: [número]
- 📝 **Observaciones**: [notas]

## 🔄 Siguiente Paso

Una vez completado el testing:
1. Documentar cualquier error encontrado
2. Corregir errores críticos
3. Actualizar documentación si es necesario
4. Preparar para deploy a producción
