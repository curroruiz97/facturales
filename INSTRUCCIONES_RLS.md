# 🔒 Instrucciones para Configurar Row Level Security (RLS)

## ¿Qué es RLS?

Row Level Security (RLS) es una característica de PostgreSQL que permite controlar el acceso a los datos a nivel de fila. Con RLS, puedes definir políticas que determinen qué usuarios pueden leer, insertar, actualizar o eliminar filas específicas en una tabla.

## Paso 1: Acceder al SQL Editor

1. Ve a: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New query**

## Paso 2: Ejecutar Script de RLS

1. Abre el archivo: `supabase/migrations/20260129120605_setup_rls_clientes.sql`
2. Copia TODO el contenido del archivo
3. Pega el contenido en el SQL Editor de Supabase
4. Haz clic en **Run** o presiona `Ctrl + Enter`
5. Verifica que aparezca el mensaje: **Success**

## Paso 3: Verificar Políticas Creadas

### Opción A: En el SQL Editor

Ejecuta esta consulta para ver todas las políticas:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'clientes';
```

Deberías ver **8 políticas** en total:
- 2 para SELECT (lectura)
- 2 para INSERT (inserción)
- 2 para UPDATE (actualización)
- 2 para DELETE (eliminación)

### Opción B: En la Interfaz de Supabase

1. Ve a **Authentication** > **Policies**
2. Busca la tabla **clientes**
3. Deberías ver todas las políticas listadas

## Paso 4: Entender las Políticas

### Políticas para Usuarios Autenticados (authenticated)

✅ **PERMITIDO**:
- Leer todos los clientes (`SELECT`)
- Crear nuevos clientes (`INSERT`)
- Actualizar clientes existentes (`UPDATE`)
- Eliminar clientes (`DELETE`)

### Políticas para Usuarios Anónimos (anon)

❌ **BLOQUEADO**:
- No pueden leer clientes
- No pueden crear clientes
- No pueden actualizar clientes
- No pueden eliminar clientes

## Paso 5: Probar RLS

### Prueba 1: Sin Autenticación (Debe Fallar)

Ejecuta en el SQL Editor (como usuario anónimo):

```sql
SELECT * FROM clientes;
```

**Resultado esperado**: Sin resultados o error (RLS bloqueando acceso)

### Prueba 2: Con Autenticación (Debe Funcionar)

1. Regístrate en la aplicación (`signup.html`)
2. Inicia sesión (`signin.html`)
3. Intenta crear un cliente desde la aplicación

**Resultado esperado**: Cliente creado exitosamente

## Paso 6: Verificar RLS está Habilitado

Ejecuta en el SQL Editor:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'clientes';
```

**Resultado esperado**: `rowsecurity = true`

## 🔧 Modificar Políticas (Avanzado)

### Eliminar una Política

```sql
DROP POLICY "nombre_de_la_politica" ON clientes;
```

### Crear Nueva Política Personalizada

Ejemplo: Permitir que cada usuario solo vea sus propios clientes

```sql
CREATE POLICY "Usuarios ven solo sus clientes"
ON clientes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

**Nota**: Esto requiere agregar una columna `user_id` a la tabla clientes

## 🚨 Troubleshooting

### Problema: "No se pueden leer clientes desde la app"

**Solución**:
1. Verifica que el usuario esté autenticado
2. Revisa la consola del navegador para errores
3. Asegúrate de que RLS esté habilitado
4. Verifica que las políticas estén creadas correctamente

### Problema: "RLS is enabled but no policies"

**Solución**:
- Ejecuta el script de RLS nuevamente
- Verifica que no haya errores en la ejecución

### Problema: "Row is returned even with RLS enabled"

**Solución**:
- Si eres el propietario de la tabla (owner), RLS no se aplica
- Prueba desde la aplicación con un usuario normal

## ✅ Checklist de Verificación

- [ ] RLS está habilitado en la tabla `clientes`
- [ ] 8 políticas creadas (4 para authenticated, 4 para anon)
- [ ] Usuarios autenticados pueden leer clientes
- [ ] Usuarios autenticados pueden crear clientes
- [ ] Usuarios anónimos NO pueden acceder a clientes
- [ ] La aplicación funciona correctamente con RLS

## 🔄 Siguiente Paso

Una vez completada la configuración de RLS:
1. Prueba el CRUD de clientes desde la aplicación
2. Verifica que solo usuarios autenticados puedan acceder
3. Intenta acceder sin autenticación (debe redirigir al login)

## 📚 Recursos Adicionales

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
