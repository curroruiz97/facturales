# Guia paso a paso: Reconexion de servicios externos

> Documento para reconectar todos los servicios de Facturales al nuevo proyecto/dominio.
> Proyecto Supabase actual: `nukslmpdwjqlepacukul`
> Dominio actual: `facturales.es`

---

## 1. SUPABASE (Base de datos + Auth + Edge Functions)

### 1.1 Variables de entorno del frontend (Vercel)

```
VITE_SUPABASE_URL=https://<TU_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu_anon_key>
```

**Donde configurar:** Vercel > Settings > Environment Variables

**Archivo que las consume:** `src/services/supabase/client.ts` (lineas 84-85)

### 1.2 Configuracion del proyecto Supabase

1. Ve a [app.supabase.com](https://app.supabase.com) > tu proyecto
2. Settings > API: copia `Project URL` y `anon public key`
3. Settings > API: copia `service_role key` (solo para Edge Functions)

### 1.3 Aplicar migraciones

```bash
# Vincular al proyecto remoto
supabase link --project-ref <TU_PROJECT_REF>

# Aplicar todas las migraciones
supabase db push
```

Las migraciones estan en `supabase/migrations/`. Tablas clave:
- `business_info` - Datos fiscales del usuario
- `clientes` - Contactos/clientes
- `invoices` - Facturas
- `quotes` - Presupuestos
- `transactions` - Gastos/ingresos
- `products` - Productos
- `invoice_series` - Series de numeracion
- `billing_subscriptions` - Suscripciones Stripe
- `user_progress` - Onboarding (4 pasos)
- `document_email_log` - Historial de emails
- `access_log` - Registro de accesos
- `support_tickets` - Tickets de soporte

### 1.4 Deploy de Edge Functions

```bash
# Variables de entorno para Edge Functions (Supabase Dashboard > Edge Functions > Secrets)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
APP_URL=https://facturales.es
AZURE_DI_ENDPOINT=https://<tu-recurso>.cognitiveservices.azure.com
AZURE_DI_KEY=<tu_azure_key>
RESEND_API_KEY=re_...
RESEND_FROM=Facturales <noreply@facturales.es>

# Deploy todas las funciones
supabase functions deploy analyze-expense-document
supabase functions deploy cancel-subscription
supabase functions deploy create-checkout-session
supabase functions deploy get-payment-method
supabase functions deploy preview-proration
supabase functions deploy reactivate-subscription
supabase functions deploy send-document-email
supabase functions deploy send-support-ticket
supabase functions deploy stripe-webhook
supabase functions deploy update-payment-method
supabase functions deploy update-subscription
```

### 1.5 CORS en Edge Functions

**Archivo:** `supabase/functions/_shared/cors.ts`

Actualizar los origenes permitidos:
```typescript
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://tu-nuevo-dominio.com",
  "https://www.tu-nuevo-dominio.com",
  // Para desarrollo local:
  // "http://localhost:5173",
]);
```

### 1.6 Content Security Policy (Vercel)

**Archivo:** `vercel.json` (linea 9)

Actualizar la directiva `connect-src` con la nueva URL de Supabase:
```
connect-src 'self' https://<NUEVO_REF>.supabase.co wss://<NUEVO_REF>.supabase.co https://api.stripe.com https://api.resend.com;
```

---

## 2. STRIPE (Pagos y suscripciones)

### 2.1 Dashboard de Stripe

1. Ve a [dashboard.stripe.com](https://dashboard.stripe.com)
2. Cambia a modo **Live** (no Test)

### 2.2 Crear productos y precios

Crea 3 productos con 2 precios cada uno (mensual + anual):

| Plan | Mensual | Anual |
|------|---------|-------|
| Starter | `STRIPE_PRICE_STARTER_MONTHLY` | `STRIPE_PRICE_STARTER_YEARLY` |
| Pro | `STRIPE_PRICE_PRO_MONTHLY` | `STRIPE_PRICE_PRO_YEARLY` |
| Business | `STRIPE_PRICE_BUSINESS_MONTHLY` | `STRIPE_PRICE_BUSINESS_YEARLY` |

Copia cada `price_id` y configuralo como variable de entorno en Supabase Edge Functions.

### 2.3 Configurar Webhook

1. Stripe Dashboard > Developers > Webhooks > Add endpoint
2. **URL del endpoint:**
   ```
   https://<TU_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
   ```
3. **Eventos a escuchar:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copia el **Signing secret** (`whsec_...`) y guardalo como `STRIPE_WEBHOOK_SECRET` en Supabase Edge Functions

### 2.4 URLs de retorno (Checkout)

Definidas en `create-checkout-session/index.ts` (linea 99):
```typescript
const appUrl = Deno.env.get("APP_URL") || "https://facturales.es";
// Success: ${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}
// Cancel:  ${appUrl}/billing/cancel?plan=${plan}
```

**Accion:** Configura `APP_URL` en Supabase Edge Functions con tu nuevo dominio.

### 2.5 Trial gratuito

Configurado en `create-checkout-session/index.ts`:
- **Duracion:** 14 dias
- **Planes elegibles:** starter, pro, business

### 2.6 Edge Functions de Stripe

| Funcion | Descripcion |
|---------|-------------|
| `create-checkout-session` | Crea sesion de pago |
| `stripe-webhook` | Recibe eventos de Stripe (NO requiere JWT) |
| `cancel-subscription` | Cancela suscripcion |
| `reactivate-subscription` | Reactiva suscripcion cancelada |
| `update-subscription` | Cambia de plan |
| `preview-proration` | Calcula prorrateo al cambiar plan |
| `get-payment-method` | Obtiene metodo de pago actual |
| `update-payment-method` | Actualiza metodo de pago |

---

## 3. GOOGLE OAUTH (Inicio de sesion con Google)

### 3.1 Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services > Credentials
3. Crea o edita un **OAuth 2.0 Client ID** (tipo Web Application)

### 3.2 Configurar URLs autorizadas

**Authorized JavaScript Origins:**
```
https://tu-nuevo-dominio.com
https://<TU_PROJECT_REF>.supabase.co
```

**Authorized Redirect URIs:**
```
https://<TU_PROJECT_REF>.supabase.co/auth/v1/callback
```

### 3.3 Configurar en Supabase

1. Supabase Dashboard > Authentication > Providers > Google
2. **Client ID:** `<tu_google_client_id>.apps.googleusercontent.com`
3. **Client Secret:** `<tu_google_client_secret>`
4. **Activar** el proveedor

### 3.4 Configurar Site URL y Redirect URLs

1. Supabase Dashboard > Authentication > URL Configuration
2. **Site URL:** `https://tu-nuevo-dominio.com`
3. **Redirect URLs (adicionar):**
   ```
   https://tu-nuevo-dominio.com/dashboard
   https://tu-nuevo-dominio.com/confirm-email
   https://tu-nuevo-dominio.com/reset-password
   https://tu-nuevo-dominio.com/complete-profile
   ```

> **IMPORTANTE:** El `config.toml` local usa `site_url = "http://127.0.0.1:3000"` para desarrollo. La configuracion de produccion se hace desde el Dashboard de Supabase.

---

## 4. MICROSOFT AZURE - OCR (Document Intelligence)

### 4.1 Crear recurso en Azure

1. Ve a [portal.azure.com](https://portal.azure.com)
2. Crea un recurso **Azure AI Document Intelligence**
3. Region recomendada: West Europe
4. Pricing tier: S0 (Standard)

### 4.2 Obtener credenciales

1. En el recurso > Keys and Endpoint
2. Copia **Endpoint** y **Key 1**

### 4.3 Configurar variables de entorno

En Supabase Edge Functions Secrets:
```
AZURE_DI_ENDPOINT=https://<tu-recurso>.cognitiveservices.azure.com
AZURE_DI_KEY=<tu_key_1>
```

### 4.4 Como funciona el flujo OCR

**Edge Function:** `analyze-expense-document/index.ts`

1. El usuario sube una imagen/PDF desde la pagina `/ocr`
2. El frontend envia el archivo al Edge Function
3. El Edge Function llama a Azure Document Intelligence API:
   ```
   POST ${AZURE_DI_ENDPOINT}/documentintelligence/documentModels/${model}:analyze?api-version=2024-11-30
   ```
4. Modelos soportados: `prebuilt-invoice` y `prebuilt-receipt`
5. Timeout: 45 segundos
6. Devuelve los campos extraidos (proveedor, importe, fecha, etc.)

### 4.5 Verificacion

Prueba con:
```bash
curl -X POST "https://<ENDPOINT>/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: <KEY>" \
  -H "Content-Type: application/pdf" \
  --data-binary @factura_ejemplo.pdf
```

---

## 5. RESEND (Envio de emails)

### 5.1 Crear cuenta y dominio

1. Ve a [resend.com](https://resend.com)
2. Registrate y verifica tu dominio (`facturales.es` o el nuevo)
3. Anade registros DNS:
   - **SPF:** `v=spf1 include:_spf.resend.com ~all`
   - **DKIM:** proporcionado por Resend
   - **DMARC:** `v=DMARC1; p=none;`

### 5.2 Obtener API Key

1. Resend Dashboard > API Keys > Create API Key
2. Permisos: Full access
3. Copia la clave (`re_...`)

### 5.3 Configurar variables de entorno

En Supabase Edge Functions Secrets:
```
RESEND_API_KEY=re_...
RESEND_FROM=Facturales <noreply@facturales.es>
```

### 5.4 Edge Functions que usan Resend

| Funcion | Descripcion | From |
|---------|-------------|------|
| `send-document-email` | Envia facturas/presupuestos por email con PDF adjunto | `RESEND_FROM` o `Facturales <noreply@facturales.es>` |
| `send-support-ticket` | Envia tickets de soporte | `RESEND_FROM` o `Facturales <noreply@facturales.es>` |

### 5.5 Flujo de envio de emails

1. El usuario pulsa "Enviar por email" en una factura/presupuesto
2. Se genera el PDF en el frontend
3. Se sube el PDF al bucket `document-pdfs` en Supabase Storage
4. Se registra en `document_email_log` con status `queued`
5. Se llama al Edge Function `send-document-email`
6. El Edge Function envia via Resend API
7. Se actualiza `document_email_log` a `sent` o `failed`

---

## 6. PROCESO DE ONBOARDING

### 6.1 Tabla de base de datos

**Tabla:** `user_progress`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `user_id` | UUID (PK, FK) | Referencia a auth.users |
| `step1_business_info` | boolean | Ha completado datos fiscales |
| `step2_first_client` | boolean | Ha creado al menos un cliente |
| `step3_customize_invoice` | boolean | Ha subido logo o personalizado color |
| `step4_first_invoice` | boolean | Ha emitido al menos una factura |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 6.2 Los 4 pasos del onboarding

**Servicio:** `src/services/onboarding/onboarding.service.ts`

| Paso | Titulo | Condicion de completado | Accion |
|------|--------|------------------------|--------|
| 1 | Completa tu informacion fiscal | Registro en tabla `business_info` | Ir a `/ajustes?tab=business` |
| 2 | Anade tu primer cliente | Al menos 1 registro en tabla `clientes` | Ir a `/contactos?action=create` |
| 3 | Personaliza tu factura | Logo subido (`invoice_image_url`) O color personalizado (`brand_color` != #000000) | Ir a `/ajustes?tab=business` |
| 4 | Crea tu primera factura | Al menos 1 factura con `status = 'issued'` | Ir a `/facturas/emision` |

### 6.3 Auto-deteccion de pasos

Al crear el progreso (`createUserProgress`), el servicio verifica automaticamente:
- Consulta `business_info` para el paso 1
- Cuenta registros en `clientes` para el paso 2
- Revisa `brand_color` e `invoice_image_url` para el paso 3
- Cuenta facturas emitidas para el paso 4

### 6.4 Actualizacion automatica

Los pasos se marcan automaticamente cuando:
- **Paso 1:** El usuario guarda datos fiscales en `/ajustes?tab=business`
- **Paso 2:** El usuario crea un cliente desde cualquier punto
- **Paso 3:** El usuario sube un logo o cambia el color de marca
- **Paso 4:** El usuario emite una factura (status draft → issued)

### 6.5 UI del onboarding

Se muestra en el Dashboard (`DashboardPage.tsx`) como un panel colapsable debajo del apartado "Que deseas hacer?". Muestra una barra de progreso y los 4 pasos con estado (completado/pendiente).

---

## 7. CHECKLIST DE RECONEXION

### Variables de entorno - Vercel (Frontend)

```env
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Variables de entorno - Supabase Edge Functions (Secrets)

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
APP_URL=https://tu-dominio.com

# Azure OCR
AZURE_DI_ENDPOINT=https://<recurso>.cognitiveservices.azure.com
AZURE_DI_KEY=...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM=Facturales <noreply@tu-dominio.com>
```

### Archivos a actualizar si cambia el dominio

| Archivo | Que cambiar |
|---------|-------------|
| `supabase/functions/_shared/cors.ts` | Origenes CORS permitidos |
| `vercel.json` | Content-Security-Policy (connect-src) |
| Supabase Dashboard > Auth > URL Config | Site URL + Redirect URLs |
| Google Cloud Console | Authorized origins + redirect URIs |
| Stripe Dashboard | Webhook endpoint URL |

### Orden de ejecucion recomendado

1. Crear/configurar proyecto Supabase
2. Aplicar migraciones (`supabase db push`)
3. Configurar Google OAuth en Supabase + Google Console
4. Configurar Stripe (productos, precios, webhook)
5. Configurar Azure Document Intelligence
6. Configurar Resend (dominio + API key)
7. Setear todas las variables de entorno en Supabase Edge Functions
8. Deploy de todas las Edge Functions
9. Actualizar CORS en `_shared/cors.ts` y re-deploy
10. Configurar variables de entorno en Vercel
11. Deploy del frontend
12. Verificar: login Google, crear factura, pagar suscripcion, OCR, enviar email
