# Instrucciones para Aplicar Migración SQL

## Migración: `20260129120604_create_clientes_table.sql`

Esta migración crea la tabla `clientes` en la base de datos de Supabase.

### Pasos para Aplicar la Migración:

1. **Ir al Dashboard de Supabase**:
   - URL: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul

2. **Abrir SQL Editor**:
   - En el menú lateral izquierdo, clic en "SQL Editor"
   - O ir directamente a: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul/sql

3. **Ejecutar la Migración**:
   - Clic en "New Query"
   - Copiar todo el contenido del archivo `supabase/migrations/20260129120604_create_clientes_table.sql`
   - Pegarlo en el editor
   - Clic en "Run" o presionar Ctrl+Enter

4. **Verificar que se Ejecutó Correctamente**:
   - Deberías ver un mensaje de éxito: "Success. No rows returned"
   - Ir a "Table Editor" en el menú lateral
   - Deberías ver la nueva tabla "clientes"

### Estructura de la Tabla Creada:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único (generado automáticamente) |
| nombre_razon_social | TEXT | Nombre o razón social (requerido) |
| identificador | TEXT | CIF/NIF/ID (requerido, único) |
| email | TEXT | Email del cliente |
| telefono | TEXT | Teléfono de contacto |
| direccion | TEXT | Dirección completa |
| codigo_postal | TEXT | Código postal |
| ciudad | TEXT | Ciudad |
| pais | TEXT | País |
| dia_facturacion | INTEGER | Día preferido de facturación (1-31) |
| estado | TEXT | Estado: 'activo' o 'inactivo' (default: 'activo') |
| created_at | TIMESTAMPTZ | Fecha de creación (automático) |
| updated_at | TIMESTAMPTZ | Fecha de última actualización (automático) |

### Índices Creados:

- `idx_clientes_nombre` - Para búsquedas por nombre
- `idx_clientes_identificador` - Para búsquedas por identificador
- `idx_clientes_estado` - Para filtrar por estado

### Triggers:

- `update_clientes_updated_at` - Actualiza automáticamente el campo `updated_at` en cada modificación

---

**Nota**: Esta migración es necesaria para que funcione el sistema de gestión de clientes.

**¿Problemas?**: Si la migración ya se ejecutó antes, puedes recibir un error de "tabla ya existe". En ese caso, ignóralo.
