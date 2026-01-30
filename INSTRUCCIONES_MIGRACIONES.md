# 📋 Instrucciones para Aplicar Migraciones en Supabase

## Paso 1: Acceder al Dashboard de Supabase

1. Ve a: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul
2. Inicia sesión con tu cuenta de Supabase
3. Selecciona tu proyecto (nukslmpdwjqlepacukul)

## Paso 2: Abrir el SQL Editor

1. En el menú lateral izquierdo, haz clic en **SQL Editor**
2. Haz clic en el botón **New query** (Nueva consulta)

## Paso 3: Ejecutar Migración de Tabla Clientes

1. Abre el archivo: `supabase/migrations/20260129120604_create_clientes_table.sql`
2. Copia TODO el contenido del archivo
3. Pega el contenido en el SQL Editor de Supabase
4. Haz clic en **Run** (Ejecutar) o presiona `Ctrl + Enter`
5. Verifica que aparezca el mensaje: **Success. No rows returned**

## Paso 4: Verificar la Tabla Creada

1. En el menú lateral, haz clic en **Table Editor**
2. Deberías ver la tabla **clientes** en la lista
3. Haz clic en la tabla para ver su estructura
4. Verifica que tenga los siguientes campos:
   - id (uuid)
   - nombre_razon_social (text)
   - identificador (text)
   - email (text)
   - telefono (text)
   - direccion (text)
   - codigo_postal (text)
   - ciudad (text)
   - pais (text)
   - dia_facturacion (integer)
   - estado (text)
   - created_at (timestamptz)
   - updated_at (timestamptz)

## Paso 5: Insertar Cliente de Prueba (Opcional)

Puedes insertar un cliente de prueba para verificar que todo funciona:

```sql
INSERT INTO clientes (
  nombre_razon_social, 
  identificador, 
  email, 
  telefono, 
  direccion, 
  ciudad, 
  pais, 
  estado
) VALUES (
  'Empresa Test S.L.',
  'B12345678',
  'test@empresa.com',
  '+34 600 000 000',
  'Calle Test 123',
  'Madrid',
  'España',
  'activo'
);
```

## ✅ Verificación Exitosa

Si todo salió bien, deberías poder:
- Ver la tabla `clientes` en el Table Editor
- Ver el cliente de prueba (si lo insertaste)
- Los triggers y funciones están activos

## 🔄 Siguiente Paso

Una vez completado, continúa con la configuración de Row Level Security (RLS).
