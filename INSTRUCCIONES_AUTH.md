# 🔐 Instrucciones para Configurar Autenticación en Supabase

## Paso 1: Acceder a Configuración de Autenticación

1. Ve a: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul
2. En el menú lateral, haz clic en **Authentication**
3. Haz clic en la pestaña **Providers**

## Paso 2: Configurar Email/Password Provider

1. Busca **Email** en la lista de providers
2. Asegúrate de que esté **habilitado** (toggle en verde)
3. Configuración recomendada:
   - ✅ **Enable email provider**
   - ✅ **Confirm email** (desactivar para desarrollo, activar en producción)
   - ✅ **Secure email change** (recomendado)
   - ✅ **Secure password change** (recomendado)

## Paso 3: Configurar URLs de Redirección

1. Ve a **Authentication** > **URL Configuration**
2. Configura las siguientes URLs:

### Site URL (URL principal)
- **Desarrollo**: `http://localhost:5173`
- **Producción**: Tu dominio real (ej: `https://tuapp.com`)

### Redirect URLs (URLs permitidas)
Agrega las siguientes URLs (una por línea):
```
http://localhost:5173/**
http://localhost:5173/index.html
http://localhost:5173/signin.html
http://localhost:5173/signup.html
https://tudominio.com/**
```

## Paso 4: Configurar Opciones de Seguridad

1. Ve a **Authentication** > **Policies**
2. Configuración recomendada:

### Password Requirements (Requisitos de contraseña)
- Minimum password length: **6** caracteres (o más para mayor seguridad)
- Password strength: Puedes dejarlo en el nivel por defecto

### Email Templates (Plantillas de email)
- Puedes personalizar los emails de confirmación y recuperación de contraseña
- Por defecto están bien configurados

## Paso 5: Verificar Configuración

1. Ve a **Authentication** > **Users**
2. Debería estar vacío inicialmente
3. Una vez que registres usuarios, aparecerán aquí

## Configuración para Desarrollo (Opcional)

Si quieres facilitar el desarrollo, puedes:

### Desactivar confirmación de email temporalmente:
1. **Authentication** > **Providers** > **Email**
2. Desactiva **Confirm email**
3. ⚠️ **IMPORTANTE**: Vuelve a activarlo en producción

### Habilitar auto-confirmación (solo desarrollo):
1. **Authentication** > **Settings**
2. Busca **Email confirmations**
3. Puedes configurar auto-confirmación para desarrollo

## Configuración Avanzada (Opcional)

### Rate Limiting
- Por defecto Supabase tiene rate limiting activado
- Protege contra ataques de fuerza bruta
- Puedes ajustar los límites en **Settings**

### Session Settings
- **JWT expiry**: 3600 segundos (1 hora) por defecto
- **Refresh token rotation**: Activado por defecto
- Estas configuraciones están bien para la mayoría de casos

## ✅ Verificación

Para verificar que todo está configurado:

1. La autenticación por email debe estar habilitada
2. Las URLs de redirección deben incluir tu localhost y dominio de producción
3. Los usuarios podrán registrarse e iniciar sesión

## 🔄 Siguiente Paso

Una vez completada la configuración, puedes:
1. Probar el registro de usuarios desde la aplicación
2. Verificar que los usuarios aparecen en **Authentication** > **Users**
3. Configurar Row Level Security (RLS) en las tablas
