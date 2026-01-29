# 🚀 Configuración de Supabase

Este documento explica la configuración de Supabase en el proyecto.

## 📋 Configuración Actual

### ✅ Instalación Completada

- **Paquete**: `@supabase/supabase-js` (v2.x)
- **Cliente**: Configurado en `assets/js/supabaseClient.js`
- **Credenciales**: Almacenadas en `.env` (no se sube a Git)

### 📁 Estructura de Archivos

```
facturaldigital-main/
├── .env                          # Credenciales (NO en Git)
├── .env.example                  # Template de credenciales
├── assets/
│   └── js/
│       └── supabaseClient.js     # Cliente inicializado
├── supabase/
│   ├── config.toml               # Configuración de Supabase CLI
│   ├── seed.sql                  # Seeds para desarrollo
│   └── migrations/               # Migraciones de base de datos
│       └── (pendiente)
└── SUPABASE_SETUP.md            # Este archivo
```

## 🔑 Credenciales

### Supabase Cloud
- **Project URL**: `https://nukslmpdwjqlepacukul.supabase.co`
- **Anon Key**: Almacenada en `.env`
- **Dashboard**: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul

### Variables de Entorno

Archivo `.env`:
```env
VITE_SUPABASE_URL=https://nukslmpdwjqlepacukul.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_aqui
```

⚠️ **Importante**: Nunca subas el archivo `.env` a Git. Ya está incluido en `.gitignore`.

## 📦 Uso del Cliente

### En archivos HTML

```html
<!-- Cargar la biblioteca de Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Cargar el cliente configurado -->
<script src="./assets/js/supabaseClient.js"></script>

<!-- Usar en tu código -->
<script>
  // El cliente está disponible globalmente como window.supabaseClient
  const { data, error } = await window.supabaseClient
    .from('clientes')
    .select('*');
</script>
```

## 🗄️ Próximos Pasos

### Pendiente de Implementación:

1. ✅ Configuración inicial de Supabase
2. ⏳ Crear tabla de `clientes` (migración SQL)
3. ⏳ Implementar CRUD de clientes
4. ⏳ Integrar con formularios existentes
5. ⏳ Configurar Row Level Security (RLS)

## 🔒 Seguridad

- ✅ Credenciales en `.env` (protegido por `.gitignore`)
- ✅ Solo se usa la clave pública (anon key)
- ⏳ RLS a configurar en las tablas
- ⏳ Políticas de acceso por implementar

## 📚 Documentación

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Dashboard del Proyecto](https://supabase.com/dashboard/project/nukslmpdwjqlepacukul)

---

**Última actualización**: 29 de enero de 2026
