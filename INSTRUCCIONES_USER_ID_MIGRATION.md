# 🔄 Instrucciones: Migración user_id en Clientes

## ¿Qué hace esta migración?

Esta migración agrega la columna `user_id` a la tabla `clientes` para que cada cliente esté asociado a un usuario específico. Esto permite que cada usuario solo vea y gestione sus propios clientes.

## Paso 1: Acceder al SQL Editor

1. Ve a: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New query**

## Paso 2: Ejecutar la Migración

1. Abre el archivo: `supabase/migrations/20260129150000_add_user_id_to_clientes.sql`
2. Copia TODO el contenido del archivo
3. Pega el contenido en el SQL Editor de Supabase
4. Haz clic en **Run** o presiona `Ctrl + Enter`
5. Verifica que aparezca el mensaje: **Success**

## Paso 3: Migrar Datos Existentes (Si Aplica)

Si ya tienes clientes creados antes de esta migración, necesitas asignarles un usuario:

### Opción A: Asignar todos los clientes a tu usuario actual

1. Obtén tu UUID de usuario:
   - Ve a **Authentication** > **Users** en Supabase Dashboard
   - Copia el UUID de tu usuario (columna "UID")

2. Ejecuta este SQL (reemplazando `TU_UUID_AQUI`):

```sql
UPDATE clientes 
SET user_id = 'TU_UUID_AQUI'
WHERE user_id IS NULL;
```

### Opción B: Eliminar clientes antiguos

Si prefieres empezar de cero:

```sql
DELETE FROM clientes WHERE user_id IS NULL;
```

## Paso 4: Verificar que Funciona

### Verificar la columna

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clientes' AND column_name = 'user_id';
```

**Resultado esperado**: Debe mostrar que la columna existe.

### Verificar las políticas

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'clientes' AND policyname LIKE '%solo%';
```

**Resultado esperado**: Debe mostrar 4 políticas:
- Usuarios ven solo sus clientes
- Usuarios crean sus propios clientes
- Usuarios actualizan solo sus clientes
- Usuarios eliminan solo sus clientes

### Verificar el índice

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'clientes' AND indexname = 'idx_clientes_user_id';
```

**Resultado esperado**: Debe mostrar el índice.

## Paso 5: Probar desde la Aplicación

1. Inicia sesión en la aplicación
2. Crea un nuevo cliente
3. El cliente debe guardarse automáticamente con tu user_id
4. Solo debes ver tus propios clientes

### Prueba de aislamiento

1. Regístrate con otro usuario
2. Crea clientes con ese usuario
3. Verifica que el primer usuario no ve los clientes del segundo usuario

## 🚨 Troubleshooting

### Error: "column user_id already exists"

La columna ya fue agregada. Puedes:
1. Omitir la parte `ALTER TABLE ADD COLUMN`
2. Solo ejecutar las políticas de RLS

### Error: "violates foreign key constraint"

El user_id que intentas asignar no existe. Verifica:
1. Que el UUID sea correcto
2. Que el usuario exista en `auth.users`

### Error: "permission denied for table clientes"

Tu usuario de SQL no tiene permisos. Esto no debería pasar en Supabase Dashboard, pero si ocurre:
1. Verifica que estás usando el SQL Editor del Dashboard
2. Contacta con soporte de Supabase

## ✅ Checklist de Verificación

- [ ] Migración ejecutada sin errores
- [ ] Columna `user_id` existe en tabla clientes
- [ ] Índice `idx_clientes_user_id` creado
- [ ] 4 políticas RLS nuevas creadas
- [ ] Políticas antiguas eliminadas
- [ ] Datos existentes migrados (si aplica)
- [ ] Crear cliente desde app funciona
- [ ] Solo se ven propios clientes
- [ ] Aislamiento entre usuarios verificado

## 🔄 Siguiente Paso

Una vez completada la migración, el código de la aplicación automáticamente:
- Asignará el `user_id` al crear clientes
- Filtrará clientes por usuario actual
- Bloqueará acceso a clientes de otros usuarios

No necesitas hacer nada más. El sistema está listo para usarse con múltiples usuarios.

---

**Fecha**: 29 de enero de 2026  
**Estado**: Migración preparada y lista para aplicar
