# 📊 Database Migrations

Esta carpeta contiene las migraciones de la base de datos de Supabase.

## 📝 Convención de Nombres

Las migraciones deben seguir este formato:
```
YYYYMMDDHHMMSS_description.sql
```

Ejemplo:
```
20260129120000_create_clientes_table.sql
20260129120100_create_facturas_table.sql
```

## 🚀 Cómo Crear una Migración

### Opción 1: Manualmente
Crea un archivo SQL en esta carpeta siguiendo la convención de nombres.

### Opción 2: Con Supabase CLI
```bash
supabase migration new nombre_de_la_migracion
```

## 📦 Aplicar Migraciones

### En Supabase Cloud
Las migraciones se pueden aplicar manualmente copiando el SQL al editor SQL del dashboard de Supabase.

### Con Supabase CLI (local)
```bash
supabase db reset
```

## 📋 Estado Actual

- ✅ Carpeta de migraciones creada
- ⏳ Primera migración (tabla clientes) - pendiente

---

**Nota**: Las migraciones son irreversibles en producción. Siempre prueba en desarrollo primero.
