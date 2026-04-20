# Admin Control Center — Blueprint Completo

> Guía paso a paso para construir un panel de administración completo en cualquier proyecto **React + TypeScript + Supabase**.
> Cubre desde la base de datos hasta la UI, incluyendo seguridad, patrones de servicio, componentes reutilizables y buenas prácticas.

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [Prerequisitos del proyecto](#2-prerequisitos-del-proyecto)
3. [Fase 1 — Base de datos: tablas y seguridad](#3-fase-1--base-de-datos-tablas-y-seguridad)
4. [Fase 2 — RPCs: lógica de negocio en PostgreSQL](#4-fase-2--rpcs-lógica-de-negocio-en-postgresql)
5. [Fase 3 — TypeScript: tipos e interfaces](#5-fase-3--typescript-tipos-e-interfaces)
6. [Fase 4 — Servicios: capa de comunicación con Supabase](#6-fase-4--servicios-capa-de-comunicación-con-supabase)
7. [Fase 5 — Componentes compartidos del admin](#7-fase-5--componentes-compartidos-del-admin)
8. [Fase 6 — Layout y navegación](#8-fase-6--layout-y-navegación)
9. [Fase 7 — Guard de autorización](#9-fase-7--guard-de-autorización)
10. [Fase 8 — Páginas del dashboard](#10-fase-8--páginas-del-dashboard)
11. [Fase 9 — Rutas y lazy loading](#11-fase-9--rutas-y-lazy-loading)
12. [Fase 10 — SEO y seguridad extra](#12-fase-10--seo-y-seguridad-extra)
13. [Resumen de archivos creados](#13-resumen-de-archivos-creados)
14. [Principios de diseño aplicados](#14-principios-de-diseño-aplicados)
15. [Checklist de implementación](#15-checklist-de-implementación)

---

## 1. Visión general

El Admin Control Center es un panel de administración interno que permite a usuarios con rol de admin gestionar toda la plataforma. Incluye:

| Módulo | Descripción |
|--------|-------------|
| **Overview** | Métricas principales (KPIs), gráficos de crecimiento y revenue |
| **Gestión de usuarios** | CRUD completo: listar, buscar, filtrar, ver detalle, suspender, eliminar |
| **Suscripciones** | Ver y modificar planes de usuarios |
| **Finanzas** | MRR, ARR, ARPU, tasa de conversión, revenue por plan |
| **Uso de API** | Métricas de consumo, top users, gráficos temporales |
| **Email Analytics** | Campañas, contactos, templates, actividad diaria |
| **System Health** | Estado de la base de datos, conexiones, errores recientes |
| **Logs** | System logs + audit logs de acciones admin |
| **Feature Flags** | Sistema completo de feature toggles con rollout progresivo |
| **Configuración** | Key-value store para parámetros del sistema |

### Arquitectura en capas

```
┌──────────────────────────────────────────────┐
│                  UI (React)                  │
│  Pages → Components → Shared Components     │
├──────────────────────────────────────────────┤
│              Services (TypeScript)            │
│  AdminUserService, AdminDashboardService...  │
├──────────────────────────────────────────────┤
│          Supabase Client (RPC calls)         │
│  supabase.rpc('admin_get_users', { ... })    │
├──────────────────────────────────────────────┤
│        PostgreSQL (SECURITY DEFINER)         │
│  RPCs + RLS + admin_users whitelist          │
└──────────────────────────────────────────────┘
```

---

## 2. Prerequisitos del proyecto

Antes de empezar, tu proyecto necesita:

### Dependencias npm

```json
{
  "@supabase/supabase-js": "^2.x",
  "react-router-dom": "^6.x",
  "recharts": "^2.x",
  "lucide-react": "^0.x",
  "sonner": "^1.x",
  "@radix-ui/react-alert-dialog": "^1.x",
  "tailwindcss": "^3.x",
  "class-variance-authority": "^0.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

### Estructura base esperada

```
src/
├── components/ui/        # Componentes base (Button, Card, Input, etc.)
├── contexts/             # AuthContext con user/session
├── integrations/supabase/
│   ├── client.ts         # createClient<Database>(URL, ANON_KEY)
│   └── types.ts          # Database type (generado por Supabase CLI)
├── lib/
│   └── utils.ts          # cn() helper (clsx + tailwind-merge)
├── types/                # Interfaces TypeScript
├── services/             # Lógica de negocio
└── pages/                # Páginas de la app
```

### Auth funcional

El proyecto debe tener un `AuthContext` que exponga al menos `user`, `session` y `loading`.

---

## 3. Fase 1 — Base de datos: tablas y seguridad

### 3.1 Tabla `admin_users` (whitelist)

La seguridad se basa en una **whitelist**: solo los usuarios registrados en `admin_users` pueden acceder al panel. Nadie puede auto-promoverse.

```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Bloquear acceso directo. Solo las RPCs SECURITY DEFINER pueden leer/escribir.
CREATE POLICY "No direct access to admin_users"
  ON admin_users FOR ALL USING (false);
```

**Por qué `USING (false)`**: Ningún usuario puede hacer SELECT/INSERT/UPDATE/DELETE directo. Toda la lógica pasa por funciones `SECURITY DEFINER` que se ejecutan con los permisos del owner (normalmente `postgres`), no del usuario autenticado.

### 3.2 Función `is_admin`

```sql
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = p_user_id
  );
END;
$$;
```

Esta función es la base de toda la autorización. Cada RPC la llama al inicio.

### 3.3 Tabla `admin_audit_logs`

Registra **cada acción** que un admin realiza. Imprescindible para trazabilidad.

```sql
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to admin_audit_logs"
  ON admin_audit_logs FOR ALL USING (false);
```

### 3.4 Helper para logging

```sql
CREATE OR REPLACE FUNCTION _admin_log_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_metadata);
END;
$$;
```

### 3.5 Tabla `feature_flags`

```sql
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  target_users UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to feature_flags"
  ON feature_flags FOR ALL USING (false);
```

### 3.6 Tabla `system_config`

Key-value store con categorías para configuración global.

```sql
CREATE TABLE IF NOT EXISTS system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('api_limits','email_limits','features','thresholds','general')),
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to system_config"
  ON system_config FOR ALL USING (false);

-- Seed de valores por defecto (adaptar a tu proyecto)
INSERT INTO system_config (key, value, category, description) VALUES
  ('api_rate_limit_per_minute', '60'::jsonb, 'api_limits', 'Max API requests per minute per user'),
  ('api_daily_limit', '10000'::jsonb, 'api_limits', 'Max API requests per day per user'),
  ('session_timeout_minutes', '480'::jsonb, 'thresholds', 'Session timeout in minutes')
ON CONFLICT (key) DO NOTHING;
```

### Patrón de seguridad aplicado

| Capa | Mecanismo |
|------|-----------|
| Tabla | RLS habilitado, policy `USING (false)` bloquea todo acceso directo |
| Función | `SECURITY DEFINER` ejecuta con permisos de owner |
| Verificación | Cada RPC comienza con `IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION` |
| Logging | Cada mutación llama a `_admin_log_action(...)` |
| Roles | `admin` vs `super_admin` para operaciones sensibles (grant/revoke) |

---

## 4. Fase 2 — RPCs: lógica de negocio en PostgreSQL

Toda la lógica compleja se ejecuta en PostgreSQL mediante RPCs. Esto tiene ventajas enormes:

- **Rendimiento**: Una sola llamada en vez de N queries desde el frontend
- **Seguridad**: `SECURITY DEFINER` + verificación `is_admin` en cada función
- **Atomicidad**: Toda la operación en una sola transacción
- **Mantenimiento**: El frontend solo necesita `supabase.rpc('nombre', params)`

### Patrón base de una RPC admin

```sql
CREATE OR REPLACE FUNCTION admin_nombre_funcion(
  p_param1 TYPE,
  p_param2 TYPE DEFAULT valor_default
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Verificar permisos
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  -- 2. Lógica de negocio
  SELECT jsonb_build_object(
    'key1', value1,
    'key2', value2
  ) INTO v_result;

  -- 3. Logging (para mutaciones)
  PERFORM _admin_log_action('action_name', 'target_type', 'target_id'::text,
    jsonb_build_object('detail', 'value'));

  -- 4. Retornar resultado
  RETURN v_result;
END;
$$;
```

### RPCs implementadas (catálogo completo)

#### Lectura (queries)

| RPC | Descripción | Parámetros |
|-----|-------------|------------|
| `admin_get_overview()` | Métricas generales de la plataforma | — |
| `admin_get_dashboard_metrics()` | KPIs extendidos (MRR, ARR, actividad) | — |
| `admin_get_users(...)` | Listado paginado con búsqueda y filtros | `p_page, p_per_page, p_search, p_plan_filter, p_sort_by, p_sort_dir` |
| `admin_get_user_detail(...)` | Perfil completo de un usuario | `p_target_user_id` |
| `admin_get_revenue_analytics(...)` | Revenue analytics completo | `p_months` |
| `admin_get_api_usage(...)` | Métricas de uso de API | `p_days` |
| `admin_get_email_analytics(...)` | Analytics de email | `p_days` |
| `admin_get_system_health()` | Estado del sistema | — |
| `admin_get_system_logs(...)` | System logs paginados | `p_page, p_per_page, p_operation_filter` |
| `admin_get_audit_logs(...)` | Audit logs paginados con búsqueda | `p_page, p_per_page, p_action_filter, p_search` |
| `admin_get_feature_flags()` | Lista de feature flags | — |
| `admin_get_config()` | Configuración del sistema | — |
| `admin_get_role()` | Rol del admin actual | — |

#### Mutaciones (writes)

| RPC | Descripción | Logging |
|-----|-------------|---------|
| `admin_update_subscription(...)` | Cambiar plan de un usuario | `plan_changed` |
| `admin_suspend_user(...)` | Suspender usuario | `user_suspended` |
| `admin_unsuspend_user(...)` | Reactivar usuario | `user_unsuspended` |
| `admin_delete_user(...)` | Eliminar usuario (con protección anti-admin) | `user_deleted` |
| `admin_grant_admin(...)` | Otorgar rol admin (solo super_admin) | `admin_granted` |
| `admin_revoke_admin(...)` | Revocar rol admin (solo super_admin, no self) | `admin_revoked` |
| `admin_upsert_feature_flag(...)` | Crear/actualizar feature flag | `feature_flag_upserted` |
| `admin_delete_feature_flag(...)` | Eliminar feature flag | `feature_flag_deleted` |
| `admin_update_config(...)` | Actualizar configuración | `config_updated` |

### Ejemplo: RPC de métricas con subqueries

```sql
CREATE OR REPLACE FUNCTION admin_get_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_users',       (SELECT COUNT(*) FROM auth.users),
    'active_users_today',(SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE created_at > now() - interval '1 day'),
    'active_users_week', (SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE created_at > now() - interval '7 days'),
    'new_users_today',   (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '1 day'),
    'new_users_week',    (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_users_month',   (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '30 days')
    -- Añadir más métricas según tu dominio
  ) INTO v_result;

  RETURN v_result;
END;
$$;
```

### Ejemplo: RPC con paginación, búsqueda y ordenamiento

```sql
CREATE OR REPLACE FUNCTION admin_get_users(
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL,
  p_plan_filter TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'desc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total INTEGER;
  v_offset INTEGER;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  -- Contar total (para paginación)
  SELECT COUNT(*) INTO v_total
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN subscriptions s ON s.user_id = u.id
  WHERE (p_search IS NULL OR u.email ILIKE '%' || p_search || '%')
    AND (p_plan_filter IS NULL OR s.plan = p_plan_filter);

  -- Obtener datos paginados
  SELECT jsonb_build_object(
    'users', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb),
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(GREATEST(v_total, 1)::float / p_per_page)
  ) INTO v_result
  FROM (
    SELECT
      u.id,
      COALESCE(p.email, u.email) AS email,
      p.name,
      u.created_at,
      COALESCE(s.plan, 'free') AS plan,
      COALESCE(s.quota_monthly, 0) AS quota_monthly,
      COALESCE(s.used_this_month, 0) AS used_this_month
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE (p_search IS NULL OR u.email ILIKE '%' || p_search || '%')
      AND (p_plan_filter IS NULL OR COALESCE(s.plan, 'free') = p_plan_filter)
    ORDER BY
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN u.created_at END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc'  THEN u.created_at END ASC,
      u.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN v_result;
END;
$$;
```

### Ejemplo: RPC de mutación con protecciones

```sql
CREATE OR REPLACE FUNCTION admin_suspend_user(
  p_target_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Verificar admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  -- 2. Ejecutar acción
  UPDATE auth.users SET banned_until = '2099-12-31'::timestamptz
  WHERE id = p_target_user_id;

  -- 3. Registrar en audit log
  PERFORM _admin_log_action('user_suspended', 'user', p_target_user_id::text,
    jsonb_build_object('reason', COALESCE(p_reason, 'No reason provided')));

  RETURN jsonb_build_object('success', true);
END;
$$;
```

### Ejemplo: Protección de roles jerárquicos

```sql
CREATE OR REPLACE FUNCTION admin_grant_admin(
  p_target_user_id UUID,
  p_role TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  -- Solo super_admin puede promover
  SELECT role INTO v_caller_role FROM admin_users WHERE user_id = auth.uid();
  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can grant admin roles';
  END IF;

  INSERT INTO admin_users (user_id, role, granted_by)
  VALUES (p_target_user_id, p_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET role = p_role;

  PERFORM _admin_log_action('admin_granted', 'user', p_target_user_id::text,
    jsonb_build_object('role', p_role));

  RETURN jsonb_build_object('success', true);
END;
$$;
```

---

## 5. Fase 3 — TypeScript: tipos e interfaces

Crear `src/types/admin.ts` con tipos que reflejen exactamente lo que devuelven las RPCs.

```typescript
// src/types/admin.ts

// ================================================
// Respuestas de las RPCs de lectura
// ================================================

export interface AdminOverview {
  total_users: number;
  users_last_30d: number;
  users_last_7d: number;
  total_leads: number;
  leads_last_30d: number;
  total_searches: number;
  searches_last_30d: number;
  total_campaigns: number;
  campaigns_sent: number;
  total_contacts: number;
  total_api_keys: number;
  subscriptions: Record<string, number>;
  revenue_estimate: number;
}

export interface AdminDashboardMetrics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  mrr: number;
  arr: number;
  total_leads: number;
  total_searches: number;
  api_requests_today: number;
  api_requests_week: number;
  emails_sent_today: number;
  total_campaigns: number;
  total_contacts: number;
  total_api_keys: number;
  subscriptions: Record<string, number>;
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  plan: string | null;
  quota_monthly: number | null;
  used_this_month: number | null;
  usage_percent: number;
  total_leads: number;
  active_api_keys: number;
  total_campaigns: number;
  total_contacts: number;
  total_searches: number;
  last_search_at: string | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  source?: 'rpc' | 'fallback';
  debug_error?: string | null;
}

export interface AdminUserDetail {
  profile: {
    id: string;
    email: string | null;
    name: string | null;
    created_at: string;
  };
  subscription: {
    plan: string;
    quota_monthly: number;
    used_this_month: number;
  } | null;
  api_keys: Array<{
    id: string;
    service: string;
    plan: string;
    status: string;
    quota_monthly: number;
    used_this_month: number;
    created_at: string;
  }>;
  stats: {
    total_leads: number;
    leads_with_email: number;
    leads_with_phone: number;
    total_searches: number;
    total_campaigns: number;
    campaigns_sent: number;
    total_contacts: number;
    total_folders: number;
  };
  recent_searches: Array<{
    id: string;
    location: string;
    business_type: string;
    results_count: number;
    created_at: string;
  }>;
  api_usage_recent: Array<{
    usage_type: string;
    amount: number;
    timestamp: string;
  }>;
}

export interface AdminRevenueAnalytics {
  mrr: number;
  arr: number;
  total_paying: number;
  total_users: number;
  by_plan: Array<{ plan: string; count: number; revenue: number }>;
  monthly_signups: Array<{ month: string; signups: number }>;
  conversion_rate: number;
  arpu: number;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminAuditLogsResponse {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  per_page: number;
}

export interface AdminSystemHealth {
  database: {
    status: string;
    size: string;
    active_connections: number;
    tables: number;
  };
  users: {
    total: number;
    active_24h: number;
  };
  api: {
    requests_1h: number;
    requests_24h: number;
    error_logs_24h: number;
  };
  email: {
    configs_active: number;
    campaigns_24h: number;
  };
  storage: {
    total_leads: number;
    total_searches: number;
    total_api_keys: number;
  };
  recent_errors: Array<{
    id: string;
    operation: string;
    timestamp: string;
    details: Record<string, unknown> | null;
  }>;
}

export interface AdminFeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  target_users: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminConfigEntry {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description: string | null;
  updated_at: string;
}

export type AdminAction =
  | 'user_suspended'
  | 'user_unsuspended'
  | 'user_deleted'
  | 'password_reset'
  | 'plan_changed'
  | 'admin_granted'
  | 'admin_revoked'
  | 'config_updated'
  | 'feature_flag_upserted'
  | 'feature_flag_deleted';
```

### Principio: los tipos son el contrato

Los tipos de TypeScript deben reflejar **exactamente** la forma del JSON que devuelven las RPCs. Si cambias una RPC, actualiza el tipo. Si agregas un campo, agrégalo al tipo.

---

## 6. Fase 4 — Servicios: capa de comunicación con Supabase

### Estructura de archivos

```
src/services/
├── admin/
│   ├── AdminDashboardService.ts    # Métricas, overview, rol
│   ├── AdminUserService.ts         # Usuarios (CRUD + mutations)
│   ├── AdminFinanceService.ts      # Revenue analytics
│   ├── AdminApiUsageService.ts     # API usage
│   ├── AdminLogsService.ts         # System logs + audit logs
│   ├── AdminEmailService.ts        # Email analytics
│   ├── AdminSystemService.ts       # System health
│   ├── AdminFeatureFlagsService.ts # Feature flags CRUD
│   ├── AdminConfigService.ts       # System config CRUD
│   └── index.ts                    # Barrel export
└── AdminService.ts                 # Facade para imports simplificados
```

### Patrón de un servicio

Cada servicio es un **objeto con métodos async** que llaman a Supabase RPCs. No usa clases ni hooks — es una función pura que se puede llamar desde cualquier componente.

```typescript
// src/services/admin/AdminDashboardService.ts
import { supabase } from '@/integrations/supabase/client';
import type { AdminDashboardMetrics, AdminOverview } from '@/types/admin';

export const AdminDashboardService = {
  async isAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_admin', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) return false;
      return data === true;
    } catch {
      return false;
    }
  },

  async getAdminRole(): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('admin_get_role');
      if (error) return 'admin';
      return (data as string | null) || 'admin';
    } catch {
      return 'admin';
    }
  },

  async getOverview(): Promise<AdminOverview | null> {
    const { data, error } = await supabase.rpc('admin_get_overview');
    if (error) {
      console.error('Admin overview error:', error.message);
      return null;
    }
    return data as unknown as AdminOverview;
  },

  async getDashboardMetrics(): Promise<AdminDashboardMetrics | null> {
    try {
      const { data, error } = await supabase.rpc('admin_get_dashboard_metrics');
      if (!error && data) {
        return data as unknown as AdminDashboardMetrics;
      }
    } catch {
      // RPC no disponible, usar fallback
    }
    // Fallback: convertir overview a metrics
    const overview = await this.getOverview();
    if (!overview) return null;
    return {
      total_users: overview.total_users,
      active_users_today: 0,
      active_users_week: overview.users_last_7d,
      new_users_today: 0,
      new_users_week: overview.users_last_7d,
      new_users_month: overview.users_last_30d,
      mrr: overview.revenue_estimate,
      arr: overview.revenue_estimate * 12,
      total_leads: overview.total_leads,
      total_searches: overview.total_searches,
      api_requests_today: 0,
      api_requests_week: 0,
      emails_sent_today: 0,
      total_campaigns: overview.total_campaigns,
      total_contacts: overview.total_contacts,
      total_api_keys: overview.total_api_keys,
      subscriptions: overview.subscriptions || {},
    };
  },
};
```

### Patrón de servicio con mutaciones

```typescript
// src/services/admin/AdminUserService.ts
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminUsersResponse, AdminUserDetail } from '@/types/admin';

export const AdminUserService = {
  async getUsers(params: {
    page?: number;
    perPage?: number;
    search?: string;
    planFilter?: string;
    sortBy?: string;
    sortDir?: string;
  } = {}): Promise<AdminUsersResponse | null> {
    try {
      const { data, error } = await supabase.rpc('admin_get_users', {
        p_page: params.page ?? 1,
        p_per_page: params.perPage ?? 50,
        p_search: params.search || null,
        p_plan_filter: params.planFilter || null,
        p_sort_by: params.sortBy ?? 'created_at',
        p_sort_dir: params.sortDir ?? 'desc',
      });
      if (error) {
        console.error('Admin get users RPC error:', error.message);
        toast.error('Error al cargar usuarios');
        return null;
      }
      return data as unknown as AdminUsersResponse;
    } catch (e) {
      console.error('Admin get users exception:', e);
      toast.error('Error de conexión');
      return null;
    }
  },

  async suspendUser(userId: string, reason?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('admin_suspend_user', {
        p_target_user_id: userId,
        p_reason: reason || null,
      });
      if (error) {
        toast.error('Error al suspender usuario');
        return false;
      }
      toast.success('Usuario suspendido');
      return (data as Record<string, unknown>)?.success === true;
    } catch {
      toast.error('Función no disponible. Ejecuta la migración.');
      return false;
    }
  },

  // ... más métodos
};
```

### Patrón de fallback resiliente

Cuando una RPC nueva no está disponible (migración no ejecutada), el servicio puede caer a un query más simple:

```typescript
async getDashboardMetrics(): Promise<AdminDashboardMetrics | null> {
  try {
    const { data, error } = await supabase.rpc('admin_get_dashboard_metrics');
    if (!error && data) return data as unknown as AdminDashboardMetrics;
  } catch {
    // RPC no disponible
  }
  // Fallback: usar RPC más básica
  const overview = await this.getOverview();
  if (!overview) return null;
  return mapOverviewToMetrics(overview);
},
```

### Barrel export

```typescript
// src/services/admin/index.ts
export { AdminDashboardService } from './AdminDashboardService';
export { AdminUserService } from './AdminUserService';
export { AdminFinanceService } from './AdminFinanceService';
export { AdminApiUsageService } from './AdminApiUsageService';
export { AdminLogsService } from './AdminLogsService';
export { AdminEmailService } from './AdminEmailService';
export { AdminSystemService } from './AdminSystemService';
export { AdminFeatureFlagsService } from './AdminFeatureFlagsService';
export { AdminConfigService } from './AdminConfigService';
```

### Facade (opcional)

Para imports más cómodos, un objeto facade que agrupa los métodos más usados:

```typescript
// src/services/AdminService.ts
import { AdminDashboardService } from './admin/AdminDashboardService';
import { AdminUserService } from './admin/AdminUserService';

export const AdminService = {
  isAdmin: AdminDashboardService.isAdmin,
  getAdminRole: AdminDashboardService.getAdminRole,
  getOverview: AdminDashboardService.getOverview,
  getUsers: AdminUserService.getUsers,
  getUserDetail: AdminUserService.getUserDetail,
  suspendUser: AdminUserService.suspendUser,
  // ...
};
```

---

## 7. Fase 5 — Componentes compartidos del admin

Componentes reutilizables que se usan en todas las páginas del admin.

### 7.1 `AdminMetricCard`

Tarjeta para mostrar una métrica con icono, valor, subtítulo y tendencia opcional.

```typescript
// src/components/admin/shared/AdminMetricCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminMetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export const AdminMetricCard: React.FC<AdminMetricCardProps> = ({
  label, value, subtitle, icon: Icon, trend, className,
}) => {
  return (
    <Card className={cn('glass-card', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className={cn(
            'mt-3 flex items-center gap-1 text-xs',
            trend.positive !== false
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          )}>
            {trend.positive !== false
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />
            }
            {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 7.2 `AdminChart`

Componente de gráficos genérico basado en Recharts. Soporta area, bar y line.

```typescript
// src/components/admin/shared/AdminChart.tsx
import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminChartProps {
  title: string;
  icon?: React.ElementType;
  data: Record<string, unknown>[];
  type: 'area' | 'bar' | 'line';
  dataKey: string;
  xKey: string;
  secondaryDataKey?: string;
  height?: number;
  color?: string;
  secondaryColor?: string;
}

export const AdminChart: React.FC<AdminChartProps> = ({
  title, icon: Icon, data, type, dataKey, xKey,
  secondaryDataKey, height = 300,
  color = 'hsl(var(--primary))',
  secondaryColor = 'hsl(var(--muted-foreground))',
}) => {
  const commonProps = {
    data,
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey={dataKey} stroke={color}
              fillOpacity={1} fill={`url(#grad-${dataKey})`} strokeWidth={2} />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey={dataKey} stroke={color}
              strokeWidth={2} dot={false} />
          </LineChart>
        );
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            Sin datos disponibles
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
```

### 7.3 `AdminStatusBadge`

Badge con variantes de color para mostrar estados.

```typescript
// src/components/admin/shared/AdminStatusBadge.tsx
import React from 'react';
import { cn } from '@/lib/utils';

type StatusVariant = 'active' | 'suspended' | 'deleted' | 'healthy' |
  'warning' | 'error' | 'draft' | 'sent' | 'default';

const VARIANTS: Record<StatusVariant, string> = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  deleted:   'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  healthy:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  error:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  draft:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  sent:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  default:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

interface AdminStatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
  dot?: boolean;
}

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({
  status, variant, className, dot = false,
}) => {
  const resolved = variant || (VARIANTS[status as StatusVariant]
    ? (status as StatusVariant)
    : 'default');

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      VARIANTS[resolved], className
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full',
        resolved === 'active' || resolved === 'healthy' ? 'bg-emerald-500' :
        resolved === 'warning' ? 'bg-amber-500' :
        resolved === 'error' || resolved === 'suspended' ? 'bg-red-500' :
        'bg-slate-400'
      )} />}
      {status}
    </span>
  );
};
```

### 7.4 `AdminConfirmDialog`

Diálogo de confirmación con opción de escribir texto para confirmar acciones destructivas.

```typescript
// src/components/admin/shared/AdminConfirmDialog.tsx
import React, { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface AdminConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  requireConfirmation?: string; // texto que el usuario debe escribir
  onConfirm: () => void | Promise<void>;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  trigger, title, description,
  confirmText = 'Confirmar', cancelText = 'Cancelar',
  variant = 'default', requireConfirmation, onConfirm,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const canConfirm = !requireConfirmation || confirmInput === requireConfirmation;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setConfirmInput('');
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) setConfirmInput('');
    }}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requireConfirmation && (
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Escribe <span className="font-mono font-bold text-foreground">
                {requireConfirmation}
              </span> para confirmar:
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={requireConfirmation}
              className="font-mono"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={!canConfirm || loading}
            className={variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : ''
            }
          >
            {loading ? 'Procesando...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

### 7.5 `AdminExportButton`

Dropdown para exportar datos en CSV o JSON.

```typescript
// src/components/admin/shared/AdminExportButton.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

interface AdminExportButtonProps {
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  disabled?: boolean;
}

export const AdminExportButton: React.FC<AdminExportButtonProps> = ({
  onExportCSV, onExportJSON, disabled,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4 mr-1.5" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportCSV && <DropdownMenuItem onClick={onExportCSV}>CSV</DropdownMenuItem>}
        {onExportJSON && <DropdownMenuItem onClick={onExportJSON}>JSON</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## 8. Fase 6 — Layout y navegación

El layout admin tiene tres zonas: **header**, **sidebar** y **contenido principal**.

### Estructura de navegación

La navegación se organiza en **secciones** con items:

```typescript
interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/admin/users', label: 'Usuarios', icon: Users },
      { path: '/admin/subscriptions', label: 'Suscripciones', icon: CreditCard },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/admin/finance', label: 'Finanzas', icon: DollarSign },
      { path: '/admin/api-usage', label: 'Uso de API', icon: Activity },
      { path: '/admin/email-analytics', label: 'Email', icon: Mail },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/admin/system', label: 'System Health', icon: HeartPulse },
      { path: '/admin/logs', label: 'Logs', icon: ScrollText },
      { path: '/admin/feature-flags', label: 'Feature Flags', icon: Flag },
      { path: '/admin/config', label: 'Configuración', icon: Settings },
    ],
  },
];
```

### AdminLayout completo

```typescript
// src/components/admin/AdminLayout.tsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Shield, ChevronLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminDashboardService } from '@/services/admin/AdminDashboardService';

// ... NAV_SECTIONS definido arriba

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    AdminDashboardService.getAdminRole().then(setRole);
  }, []);

  const allItems = NAV_SECTIONS.flatMap((s) => s.items);
  const currentPage = allItems.find(
    (item) => item.path === location.pathname ||
              location.pathname.startsWith(item.path + '/')
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header sticky */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin Control Center</h1>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              role === 'super_admin'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-primary/10 text-primary'
            )}>
              {role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ChevronLeft className="h-4 w-4" /> Volver
            </Link>
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden border-b">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium"
        >
          <span>{currentPage?.label || 'Menu'}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', mobileOpen && 'rotate-180')} />
        </button>
        {mobileOpen && (
          <div className="p-2 bg-background">
            {allItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
                  location.pathname === item.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex md:w-56 lg:w-64 shrink-0 flex-col border-r overflow-y-auto">
          <nav className="flex flex-col gap-1 p-3">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="mb-2">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
                {section.items.map((item) => {
                  const isActive = item.path === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
```

### Decisiones de diseño del layout

| Decisión | Razón |
|----------|-------|
| Header sticky | El admin siempre ve el contexto y puede volver |
| Sidebar solo en desktop | En mobile se usa dropdown para ahorrar espacio |
| Badge de rol | El admin sabe si es `admin` o `super_admin` |
| Secciones agrupadas | Reduce carga cognitiva en la navegación |
| Active state | Highlight visual del item actual |

---

## 9. Fase 7 — Guard de autorización

El `AdminGuard` es un wrapper que verifica si el usuario es admin antes de renderizar el contenido.

```typescript
// src/components/admin/AdminGuard.tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminService } from '@/services/AdminService';
import { Shield } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      AdminService.isAdmin().then(setIsAdmin);
    } else if (!authLoading && !user) {
      setIsAdmin(false);
    }
  }, [user, authLoading]);

  // Loading state
  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Verificando permisos de administrador...
          </p>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
```

### Flujo de verificación

```
1. Usuario navega a /admin/*
2. ProtectedRoute verifica autenticación (user existe)
3. AdminGuard verifica rol admin:
   a. Llama a AdminService.isAdmin()
   b. isAdmin() → supabase.rpc('is_admin', { p_user_id })
   c. La RPC consulta admin_users (SECURITY DEFINER)
4. Si es admin → renderiza children
5. Si no → Navigate to /dashboard
```

### Tres estados del Guard

| Estado | UI |
|--------|-----|
| `authLoading \|\| isAdmin === null` | Loading spinner con icono Shield |
| `!user \|\| !isAdmin` | Redirect a `/dashboard` |
| `user && isAdmin` | Renderiza children |

---

## 10. Fase 8 — Páginas del dashboard

### Patrón de una página admin

Todas las páginas siguen la misma estructura:

```typescript
export default function AdminPageName() {
  // 1. Estado local
  const [data, setData] = useState<Type | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. Carga de datos
  useEffect(() => {
    ServiceName.method().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  // 3. Loading skeleton
  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Título</h2>
            <p className="text-muted-foreground text-sm mt-1">Descripción</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // 4. Error state
  if (!data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Error al cargar datos.</p>
        </div>
      </AdminLayout>
    );
  }

  // 5. Contenido
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Título</h2>
          <p className="text-muted-foreground text-sm mt-1">Descripción</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard label="..." value={data.metric} icon={IconName} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminChart title="..." data={chartData} type="area"
            dataKey="value" xKey="date" />
        </div>

        {/* Tables / Detail cards */}
      </div>
    </AdminLayout>
  );
}
```

### Catálogo de páginas

| Página | Datos que muestra | Acciones |
|--------|-------------------|----------|
| **AdminOverview** | KPIs principales, gráficos de signups y revenue, distribución de planes | — |
| **AdminUsers** | Tabla paginada de usuarios con búsqueda y filtro por plan | Link a detalle |
| **AdminUserDetail** | Perfil, suscripción, API keys, stats, búsquedas recientes | Cambiar plan, suspender, eliminar, grant/revoke admin |
| **AdminSubscriptions** | Vista centrada en suscripciones | Cambiar plan |
| **AdminFinance** | MRR, ARR, ARPU, conversion rate, revenue por plan | — |
| **AdminApiUsage** | Requests totales, por tipo, daily usage, top users | — |
| **AdminEmailAnalytics** | Campañas, contactos, templates, actividad diaria | — |
| **AdminSystemHealth** | DB size, conexiones, errores recientes, estado de servicios | — |
| **AdminLogs** | System logs + audit logs con tabs, paginación y filtros | — |
| **AdminFeatureFlags** | Lista de flags con toggle on/off, rollout %, CRUD | Crear, editar, eliminar |
| **AdminConfig** | Lista de configs agrupadas por categoría | Editar valores |

---

## 11. Fase 9 — Rutas y lazy loading

### Configuración de rutas

```typescript
// En tu router.tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminGuard } from '@/components/admin/AdminGuard';

// Lazy loading de todas las páginas admin
const AdminOverview = React.lazy(() => import('@/pages/admin/AdminOverview'));
const AdminUsers = React.lazy(() => import('@/pages/admin/AdminUsers'));
const AdminUserDetail = React.lazy(() => import('@/pages/admin/AdminUserDetail'));
const AdminSubscriptions = React.lazy(() => import('@/pages/admin/AdminSubscriptions'));
const AdminFinance = React.lazy(() => import('@/pages/admin/AdminFinance'));
const AdminApiUsage = React.lazy(() => import('@/pages/admin/AdminApiUsage'));
const AdminEmailAnalytics = React.lazy(() => import('@/pages/admin/AdminEmailAnalytics'));
const AdminSystemHealth = React.lazy(() => import('@/pages/admin/AdminSystemHealth'));
const AdminLogs = React.lazy(() => import('@/pages/admin/AdminLogs'));
const AdminFeatureFlags = React.lazy(() => import('@/pages/admin/AdminFeatureFlags'));
const AdminConfig = React.lazy(() => import('@/pages/admin/AdminConfig'));

// Dentro del router
<Route path="/admin" element={
  <ProtectedRoute><AdminGuard><AdminOverview /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/users" element={
  <ProtectedRoute><AdminGuard><AdminUsers /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/users/:userId" element={
  <ProtectedRoute><AdminGuard><AdminUserDetail /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/subscriptions" element={
  <ProtectedRoute><AdminGuard><AdminSubscriptions /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/finance" element={
  <ProtectedRoute><AdminGuard><AdminFinance /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/api-usage" element={
  <ProtectedRoute><AdminGuard><AdminApiUsage /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/email-analytics" element={
  <ProtectedRoute><AdminGuard><AdminEmailAnalytics /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/system" element={
  <ProtectedRoute><AdminGuard><AdminSystemHealth /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/logs" element={
  <ProtectedRoute><AdminGuard><AdminLogs /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/feature-flags" element={
  <ProtectedRoute><AdminGuard><AdminFeatureFlags /></AdminGuard></ProtectedRoute>
} />
<Route path="/admin/config" element={
  <ProtectedRoute><AdminGuard><AdminConfig /></AdminGuard></ProtectedRoute>
} />
```

### Cadena de protección

```
Ruta /admin/* →
  1. React.Suspense (loading fallback)
  2. ProtectedRoute (verifica auth)
  3. AdminGuard (verifica admin role)
  4. Página admin
```

### Por qué lazy loading

Las páginas admin solo las usan admins (normalmente 1-3 personas). No tiene sentido que todos los usuarios carguen ese código en el bundle principal.

---

## 12. Fase 10 — SEO y seguridad extra

### robots.txt

```
# Bloquear indexación del panel admin
User-agent: *
Disallow: /admin
Disallow: /admin/
```

### Meta tags

No incluir meta tags en las páginas admin. Si usas helmet o similar, puedes poner:

```html
<meta name="robots" content="noindex, nofollow" />
```

### Headers de seguridad (si usas Edge Functions o middleware)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 13. Resumen de archivos creados

### Base de datos (2 migraciones)

```
supabase/migrations/
├── 20XXXXXX_admin_panel.sql           # admin_users, is_admin, RPCs básicas
└── 20XXXXXX_admin_control_center.sql  # audit_logs, feature_flags, system_config, RPCs avanzadas
```

### Frontend (35+ archivos)

```
src/
├── types/
│   └── admin.ts                              # Todas las interfaces
├── services/
│   ├── AdminService.ts                       # Facade
│   └── admin/
│       ├── index.ts                          # Barrel export
│       ├── AdminDashboardService.ts          # Métricas, overview, rol
│       ├── AdminUserService.ts               # Usuarios CRUD
│       ├── AdminFinanceService.ts            # Revenue
│       ├── AdminApiUsageService.ts           # API usage
│       ├── AdminLogsService.ts               # System + audit logs
│       ├── AdminEmailService.ts              # Email analytics
│       ├── AdminSystemService.ts             # System health
│       ├── AdminFeatureFlagsService.ts       # Feature flags
│       └── AdminConfigService.ts             # System config
├── components/
│   └── admin/
│       ├── AdminGuard.tsx                    # Guard de autorización
│       ├── AdminLayout.tsx                   # Layout con sidebar
│       └── shared/
│           ├── AdminMetricCard.tsx            # Tarjeta de métrica
│           ├── AdminChart.tsx                 # Gráficos
│           ├── AdminStatusBadge.tsx           # Badge de estado
│           ├── AdminConfirmDialog.tsx         # Diálogo de confirmación
│           ├── AdminExportButton.tsx          # Botón de exportar
│           └── AdminDateRangeFilter.tsx       # Filtro de fechas
└── pages/
    └── admin/
        ├── AdminOverview.tsx                  # Overview + KPIs
        ├── AdminUsers.tsx                     # Lista de usuarios
        ├── AdminUserDetail.tsx                # Detalle de usuario
        ├── AdminSubscriptions.tsx             # Suscripciones
        ├── AdminFinance.tsx                   # Finanzas
        ├── AdminApiUsage.tsx                  # Uso de API
        ├── AdminEmailAnalytics.tsx            # Email analytics
        ├── AdminSystemHealth.tsx              # System health
        ├── AdminLogs.tsx                      # Logs
        ├── AdminFeatureFlags.tsx              # Feature flags
        └── AdminConfig.tsx                    # Configuración
```

---

## 14. Principios de diseño aplicados

### 1. Seguridad por capas

```
Frontend:  AdminGuard → verifica isAdmin()
Service:   supabase.rpc() con parámetros tipados
Supabase:  SECURITY DEFINER + is_admin(auth.uid())
Database:  RLS USING (false) en todas las tablas admin
Roles:     admin vs super_admin para operaciones sensibles
Logging:   Cada mutación genera un audit log
```

### 2. Separación de responsabilidades

| Capa | Responsabilidad |
|------|-----------------|
| SQL RPCs | Lógica de negocio, joins, agregaciones, seguridad |
| Services | Comunicación con Supabase, manejo de errores, fallbacks, toasts |
| Components | UI reutilizable (cards, charts, badges) |
| Pages | Composición de servicios + componentes para una vista completa |
| Layout | Navegación y estructura visual |
| Guard | Control de acceso |
| Router | Orquestación de protección (auth + admin) y lazy loading |

### 3. Resilencia con fallbacks

Cada servicio tiene mecanismos de fallback cuando las RPCs nuevas no están disponibles:

- `getDashboardMetrics()` → cae a `getOverview()` si la RPC no existe
- `getUsers()` → cae a query directo en `profiles` si la RPC falla
- `getUserDetail()` → cae a query parcial si la RPC falla
- Mutaciones nuevas → `try/catch` con `toast.error('Ejecuta la migración')`

### 4. Diseño mobile-first

- Grid responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Sidebar hidden en mobile, dropdown toggle en su lugar
- Textos truncados con `truncate`
- Padding adaptativo: `p-4 sm:p-6 lg:p-8`

### 5. Dark mode nativo

Todos los componentes usan variables CSS de Tailwind (`text-foreground`, `bg-background`, `border-border`) y variantes `dark:` explícitas para colores de estado.

### 6. Performance

- Lazy loading de todas las páginas admin
- Skeleton loading en vez de spinners
- RPCs que devuelven exactamente los datos necesarios (no over-fetching)
- Paginación server-side en listados

---

## 15. Checklist de implementación

Usa esta checklist para implementar el Admin Control Center en tu proyecto:

### Base de datos
- [ ] Crear tabla `admin_users` con RLS `USING (false)`
- [ ] Crear función `is_admin(p_user_id)`
- [ ] Crear función `_admin_log_action(...)`
- [ ] Crear tabla `admin_audit_logs` con índices
- [ ] Crear tabla `feature_flags`
- [ ] Crear tabla `system_config` con seeds
- [ ] Crear RPCs de lectura (overview, users, detail, etc.)
- [ ] Crear RPCs de mutación (suspend, delete, grant, etc.)
- [ ] Insertar tu usuario en `admin_users` con `super_admin`

### TypeScript
- [ ] Crear `src/types/admin.ts` con todas las interfaces
- [ ] Verificar que los tipos coincidan con las RPCs

### Servicios
- [ ] Crear `src/services/admin/` con un servicio por dominio
- [ ] Crear barrel export `index.ts`
- [ ] Crear facade `AdminService.ts`
- [ ] Implementar fallbacks en servicios críticos

### Componentes
- [ ] Crear `AdminGuard.tsx`
- [ ] Crear `AdminLayout.tsx` con sidebar y mobile nav
- [ ] Crear `AdminMetricCard.tsx`
- [ ] Crear `AdminChart.tsx`
- [ ] Crear `AdminStatusBadge.tsx`
- [ ] Crear `AdminConfirmDialog.tsx`
- [ ] Crear `AdminExportButton.tsx`

### Páginas
- [ ] Crear AdminOverview con KPIs y gráficos
- [ ] Crear AdminUsers con tabla paginada y búsqueda
- [ ] Crear AdminUserDetail con stats y acciones
- [ ] Crear AdminSubscriptions
- [ ] Crear AdminFinance con revenue analytics
- [ ] Crear AdminApiUsage
- [ ] Crear AdminEmailAnalytics
- [ ] Crear AdminSystemHealth
- [ ] Crear AdminLogs con tabs system/audit
- [ ] Crear AdminFeatureFlags con CRUD
- [ ] Crear AdminConfig con editor

### Router
- [ ] Lazy import de todas las páginas admin
- [ ] Envolver en `ProtectedRoute` + `AdminGuard`
- [ ] Verificar que `/admin` no sea accesible sin permisos

### Seguridad
- [ ] Añadir `Disallow: /admin` a robots.txt
- [ ] Verificar que RLS bloquea acceso directo a tablas admin
- [ ] Verificar que solo `super_admin` puede grant/revoke
- [ ] Verificar que no se puede auto-eliminar ni auto-revocar

---

## Licencia

Este documento es una guía arquitectónica. Adáptalo libremente a cualquier proyecto React + TypeScript + Supabase.
