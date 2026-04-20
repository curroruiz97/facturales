# APIs y Dependencias Externas - Facturales

Guia paso a paso para configurar todas las integraciones externas del proyecto.

---

## 1. Supabase (Backend principal)

**Servicios utilizados:** Auth, Database (PostgreSQL), Storage, Edge Functions, Realtime

### Variables de entorno (Frontend)
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Pasos de configuracion

1. **Crear proyecto** en [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Obtener credenciales** en Settings > API:
   - `Project URL` -> `VITE_SUPABASE_URL`
   - `anon public` key -> `VITE_SUPABASE_ANON_KEY`
3. **Ejecutar migraciones** (48 archivos en `supabase/migrations/`):
   ```bash
   npx supabase db push
   ```
4. **Verificar RLS**: Todas las tablas tienen Row Level Security habilitado
5. **Configurar Auth**:
   - Authentication > Providers > Email (habilitado)
   - Authentication > Providers > Google (opcional, necesita OAuth credentials)
   - Authentication > URL Configuration > Site URL: `https://facturales.es`
   - Redirect URLs: `https://facturales.es/confirm-email`, `https://facturales.es/reset-password`

### Tablas principales
| Tabla | Proposito |
|-------|-----------|
| `clientes` | Contactos/clientes |
| `invoices` | Facturas (borradores y emitidas) |
| `quotes` | Presupuestos |
| `transacciones` | Gastos e ingresos |
| `productos` | Catalogo de productos/servicios |
| `business_info` | Perfil de empresa |
| `billing_subscriptions` | Suscripciones Stripe |
| `billing_events` | Idempotencia de webhooks |
| `billing_usage` | Uso por plan |
| `user_progress` | Progreso onboarding |
| `invoice_series` | Series de facturacion |
| `document_email_log` | Historial de emails |
| `expense_ocr_log` | Log de OCR |

---

## 2. Stripe (Pagos y suscripciones)

**Uso:** Gestion de suscripciones con 3 planes (Starter, Pro, Business)

### Variables de entorno (Solo Edge Functions)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
APP_URL=https://facturales.es
```

### Pasos de configuracion

1. **Crear cuenta** en [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Crear productos y precios**:
   - Starter: 0 EUR/mes (free tier)
   - Pro: 19 EUR/mes | 180 EUR/ano (15 EUR/mes)
   - Business: 49 EUR/mes | 468 EUR/ano (39 EUR/mes)
3. **Copiar Price IDs** de cada precio creado a las variables correspondientes
4. **Configurar webhook**:
   - Developers > Webhooks > Add endpoint
   - URL: `https://[SUPABASE_URL]/functions/v1/stripe-webhook`
   - Eventos a escuchar:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copiar Signing Secret -> `STRIPE_WEBHOOK_SECRET`
5. **Configurar variables** en Supabase Dashboard > Settings > Edge Functions > Environment Variables

### Edge Functions de Stripe
| Funcion | Proposito |
|---------|-----------|
| `stripe-webhook` | Recibe eventos de Stripe, sincroniza billing_subscriptions |
| `create-checkout-session` | Crea sesion de pago para nueva suscripcion |
| `update-subscription` | Cambia plan/intervalo de suscripcion existente |
| `cancel-subscription` | Cancela suscripcion (al final del periodo) |
| `reactivate-subscription` | Reactiva suscripcion cancelada |
| `preview-proration` | Calcula prorrateo para cambio de plan |
| `get-payment-method` | Obtiene metodo de pago guardado |
| `update-payment-method` | Actualiza metodo de pago |

---

## 3. Resend (Email transaccional)

**Uso:** Envio de facturas/presupuestos por email con PDF adjunto

### Variables de entorno (Solo Edge Functions)
```
RESEND_API_KEY=re_...
```

### Pasos de configuracion

1. **Crear cuenta** en [resend.com](https://resend.com)
2. **Verificar dominio**: Domains > Add domain > Configurar registros DNS
3. **Crear API Key**: API Keys > Create API Key
4. **Configurar en Supabase**: Settings > Edge Functions > Environment Variables > `RESEND_API_KEY`

### Edge Functions de Email
| Funcion | Proposito |
|---------|-----------|
| `send-document-email` | Envia facturas/presupuestos con PDF adjunto. Soporta envio programado |
| `send-support-ticket` | Envia tickets de soporte |

---

## 4. Azure Document Intelligence (OCR)

**Uso:** Escaneo automatico de tickets de gasto

### Variables de entorno (Solo Edge Functions)
```
AZURE_DI_ENDPOINT=https://[resource].cognitiveservices.azure.com
AZURE_DI_KEY=...
```

### Pasos de configuracion

1. **Crear recurso** en [Azure Portal](https://portal.azure.com) > Create > Document Intelligence
2. **Obtener credenciales**: Keys and Endpoint
3. **Configurar en Supabase**: Settings > Edge Functions > Environment Variables
4. **Rate limit**: 10 solicitudes cada 5 minutos por usuario

### Edge Function
| Funcion | Proposito |
|---------|-----------|
| `analyze-expense-document` | Analiza PDF/imagen de gasto, extrae datos (importe, fecha, concepto, IVA) |

---

## 5. Vercel (Despliegue)

**Archivo de configuracion:** `vercel.json`

### Pasos de configuracion

1. **Conectar repositorio** en [vercel.com](https://vercel.com) > Import Project
2. **Framework preset**: Vite
3. **Build command**: `npm run build`
4. **Output directory**: `dist`
5. **Variables de entorno**: Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
6. **Headers de seguridad**: Ya configurados en vercel.json (CSP, HSTS, X-Frame-Options)
7. **Redirects**: 42 redirects de URLs legacy (.html) a rutas React

### CSP (Content Security Policy)
El header CSP en vercel.json debe incluir los dominios de:
- Supabase: `*.supabase.co`
- Stripe: `js.stripe.com`, `*.stripe.com`
- Google Fonts: `fonts.googleapis.com`, `fonts.gstatic.com`

---

## 6. Google OAuth (opcional)

**Uso:** Login con Google

### Pasos de configuracion

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services > Credentials > Create OAuth client ID
3. Authorized redirect URIs: `https://[SUPABASE_URL]/auth/v1/callback`
4. Configurar en Supabase: Authentication > Providers > Google > Client ID + Secret

---

## Resumen de variables de entorno

### Frontend (.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Edge Functions (Supabase Dashboard)
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_STARTER_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_BUSINESS_MONTHLY=
STRIPE_PRICE_BUSINESS_YEARLY=
APP_URL=
RESEND_API_KEY=
AZURE_DI_ENDPOINT=
AZURE_DI_KEY=
```

---

## Deploy de Edge Functions

```bash
# Desplegar todas las Edge Functions
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy create-checkout-session
npx supabase functions deploy update-subscription
npx supabase functions deploy cancel-subscription
npx supabase functions deploy reactivate-subscription
npx supabase functions deploy preview-proration
npx supabase functions deploy get-payment-method
npx supabase functions deploy update-payment-method
npx supabase functions deploy send-document-email
npx supabase functions deploy send-support-ticket
npx supabase functions deploy analyze-expense-document
```

> **Nota:** `stripe-webhook` usa `--no-verify-jwt` porque Stripe envia requests sin JWT; la autenticacion se hace por firma de webhook.
