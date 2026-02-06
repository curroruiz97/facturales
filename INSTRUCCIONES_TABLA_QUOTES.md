# Instrucciones para crear la tabla de Presupuestos (quotes)

## 📋 Descripción
Se ha creado la migración para la tabla `quotes` que gestionará los presupuestos de la aplicación. La estructura es idéntica a la tabla `invoices` pero adaptada para presupuestos.

## 🗄️ Estructura de la tabla

La tabla `quotes` contiene los siguientes campos:

- **id**: UUID único del presupuesto (generado automáticamente)
- **user_id**: UUID del usuario propietario (con CASCADE DELETE)
- **quote_number**: Número único del presupuesto (formato: SERIE-AÑO-NÚMERO)
- **quote_series**: Serie del presupuesto (por defecto 'P')
- **client_id**: UUID del cliente asociado (con SET NULL)
- **client_name**: Nombre del cliente (desnormalizado)
- **issue_date**: Fecha de emisión
- **due_date**: Fecha de vencimiento
- **subtotal**: Subtotal sin impuestos
- **tax_amount**: Total de impuestos
- **total_amount**: Importe total del presupuesto
- **currency**: Moneda (EUR, USD, GBP)
- **status**: Estado (draft, issued, cancelled)
- **is_paid**: Indica si está pagado
- **paid_at**: Fecha y hora de pago
- **quote_data**: Datos completos en formato JSONB
- **created_at**: Fecha de creación
- **updated_at**: Fecha de última actualización

## 🔧 Funcionalidades implementadas

### 1. Generación automática de números
- Los números de presupuesto se generan automáticamente siguiendo el formato: **SERIE-AÑO-NÚMERO**
- Ejemplo: `P-2026-00001`
- La numeración es correlativa por serie y año

### 2. Validación de actualizaciones
- Los presupuestos emitidos (status='issued') NO pueden modificar sus datos principales
- Solo se pueden actualizar: `is_paid`, `paid_at` y `status`
- Al marcar como pagado, se establece automáticamente `paid_at`

### 3. Actualización automática de timestamps
- El campo `updated_at` se actualiza automáticamente en cada modificación

### 4. Row Level Security (RLS)
- Los usuarios solo pueden ver, crear, modificar y eliminar sus propios presupuestos
- Protección a nivel de base de datos

### 5. Índices optimizados
- Índices en: `user_id`, `status`, `quote_number`, `issue_date`, `client_id`
- Mejora el rendimiento de las consultas

## 📦 Aplicar la migración

### Opción 1: Supabase CLI (Recomendado)

```bash
# 1. Asegúrate de estar en el directorio del proyecto
cd "d:\Usuarios\ivanr\Escritorio\GEST\AVENUE MEDIA\facturaldigital-main\facturaldigital-main"

# 2. Aplicar la migración
npx supabase db push

# 3. Verificar que se aplicó correctamente
npx supabase db diff
```

### Opción 2: Supabase Dashboard

1. Ve al Dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega el contenido del archivo: `supabase/migrations/20260206000000_create_quotes_table.sql`
5. Ejecuta el script (botón "Run")

## ✅ Verificar la creación

Después de aplicar la migración, verifica que la tabla se creó correctamente:

```sql
-- Ver la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quotes'
ORDER BY ordinal_position;

-- Ver las políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'quotes';

-- Ver los índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'quotes';

-- Ver las funciones relacionadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%quote%';
```

## 🔄 Relación con otras tablas

- **auth.users**: Relación con el usuario propietario (CASCADE DELETE)
- **clientes**: Relación con el cliente (SET NULL si se elimina el cliente)

## 📊 Estados del presupuesto

- **draft**: Borrador (editable)
- **issued**: Emitido (no editable, solo se puede marcar como pagado o cancelar)
- **cancelled**: Anulado (soft delete)

## 🎯 Próximos pasos

Después de aplicar esta migración, necesitarás:

1. ✅ Crear páginas para listar presupuestos (borradores y emitidos)
2. ✅ Adaptar la funcionalidad JavaScript de `quote.html` para usar la tabla `quotes`
3. ✅ Crear endpoints o funciones para operaciones CRUD de presupuestos
4. ✅ Implementar la conversión de presupuesto a factura (si es necesario)

## ⚠️ Notas importantes

- La serie por defecto de presupuestos es **'P'** (mientras que las facturas usan 'A')
- El campo `quote_data` almacena toda la información en formato JSONB
- La numeración es independiente de las facturas
- Los presupuestos emitidos están protegidos contra modificaciones accidentales

## 🔗 Archivos relacionados

- Migración: `supabase/migrations/20260206000000_create_quotes_table.sql`
- Frontend: `invoices/quote.html`
- Migración de referencia (invoices): `supabase/migrations/20260130141629_create_invoices_table.sql`
