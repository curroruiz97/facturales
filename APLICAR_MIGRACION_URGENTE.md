# ⚠️ MIGRACIÓN PENDIENTE - ACCIÓN REQUERIDA

## 🚨 Problema Actual

Si ves estos errores en la consola:
- "Error en getUserProgress: TypeError: supabase.from is not a function"
- "No se pudo obtener el progreso"
- El progreso marca 100/100 aunque no has completado los pasos

**Causa:** La tabla `user_progress` no existe en Supabase.

---

## ✅ Solución: Aplicar Migración

### Paso 1: Abrir Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (menú lateral izquierdo)

### Paso 2: Copiar SQL

Copia TODO el contenido del archivo:
```
supabase/migrations/20260130132813_create_user_progress_table.sql
```

### Paso 3: Ejecutar

1. Pega el código en el SQL Editor
2. Haz clic en **"Run"** (Ejecutar)
3. Deberías ver: ✅ "Success. No rows returned"

### Paso 4: Verificar

Ejecuta este comando en el SQL Editor para verificar:

```sql
SELECT * FROM user_progress;
```

**Resultado esperado:**
- Si sale error "table does not exist" → La migración NO se aplicó, repite los pasos
- Si sale "0 rows" o muestra datos → ✅ Migración aplicada correctamente

---

## 🔄 Después de Aplicar la Migración

1. **Recarga la página** (F5)
2. Abre la consola (F12) y busca:
   - ✅ "✅ Progreso obtenido"
   - ✅ "✅ Onboarding renderizado exitosamente"
3. El progreso debería mostrar el porcentaje real (no 100/100)
4. El botón de desplegable debería funcionar

---

## 📝 SQL Completo (Copia esto)

Si no puedes abrir el archivo de migración, copia y pega esto directamente:

```sql
-- Migración: Crear tabla user_progress para seguimiento de "Primeros Pasos"
-- Fecha: 2026-01-30

CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  step1_business_info BOOLEAN DEFAULT TRUE,
  step2_first_client BOOLEAN DEFAULT FALSE,
  step3_customize_invoice BOOLEAN DEFAULT TRUE,
  step4_first_invoice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice en user_id para búsquedas rápidas
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_updated_at();

-- Habilitar RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver su propio progreso
CREATE POLICY "Users can view their own progress"
  ON user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar su propio progreso
CREATE POLICY "Users can insert their own progress"
  ON user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden actualizar su propio progreso
CREATE POLICY "Users can update their own progress"
  ON user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar su propio progreso
CREATE POLICY "Users can delete their own progress"
  ON user_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comentarios
COMMENT ON TABLE user_progress IS 'Seguimiento del progreso de onboarding de usuarios';
COMMENT ON COLUMN user_progress.user_id IS 'ID del usuario (referencia a auth.users)';
COMMENT ON COLUMN user_progress.step1_business_info IS 'Paso 1: Añadir datos de negocio (auto-completado al registrarse)';
COMMENT ON COLUMN user_progress.step2_first_client IS 'Paso 2: Crear primer contacto/cliente';
COMMENT ON COLUMN user_progress.step3_customize_invoice IS 'Paso 3: Personalizar factura (siempre TRUE por ahora)';
COMMENT ON COLUMN user_progress.step4_first_invoice IS 'Paso 4: Crear primera factura (preparado para futuro)';
```

---

## 🎯 Una Vez Aplicada

El sistema funcionará automáticamente:

✅ **Progreso Real:**
- Si NO tienes clientes → 50/100 (pasos 1 y 3 completados)
- Si tienes clientes → 75/100 (pasos 1, 2 y 3 completados)

✅ **Botón Desplegable:**
- Haz clic para colapsar/expandir
- Por defecto se muestra expandido

✅ **Pasos Dinámicos:**
- Paso 2 pendiente → Botón naranja "Crear contacto"
- Paso 2 completado → Tick verde + "Completado"

---

## ❓ Si Sigue Sin Funcionar

1. **Revisa la consola del navegador (F12)**
2. **Busca errores específicos**
3. **Comparte la captura de pantalla de los errores**

---

**NOTA IMPORTANTE:** Solo necesitas aplicar esta migración UNA VEZ. Después de aplicarla, todos los usuarios del sistema podrán usar el sistema de "Primeros Pasos".
