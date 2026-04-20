# Domain Contracts Draft (F1)

- Fecha: 10 de marzo de 2026
- Objetivo: fijar contratos observables de dominio para desacoplar UI legacy y preparar migracion incremental a React + TypeScript

## 1) Entidades principales observadas

## 1.1 Cliente (`clientes`)

Campos observados en SQL + JS:

- `id` (uuid)
- `user_id` (uuid)
- `nombre_razon_social`
- `identificador` (NIF/CIF)
- `tipo_cliente` (`autonomo` | `empresa`)
- `email`, `telefono`, `direccion`, `codigo_postal`, `ciudad`, `provincia`, `pais`
- `dia_facturacion`
- `estado` (historico: `activo/inactivo`, vigente por migracion: `recurrente/puntual`)
- `created_at`, `updated_at`

Contrato TS draft:

- `src/shared/types/domain.ts` -> `Client`

## 1.2 Producto (`productos`)

Campos observados:

- `id`, `user_id`
- `nombre`, `referencia`, `descripcion`
- `precio_compra`, `precio_venta`
- `impuesto`, `descuento`
- `created_at`, `updated_at`

Contrato TS draft:

- `Product`

## 1.3 Transaccion (`transacciones`)

Campos observados:

- `id`, `user_id`
- `cliente_id` (nullable)
- `importe`, `concepto`, `fecha`
- `categoria` (incluye `factura`)
- `tipo` (`gasto` | `ingreso`)
- `observaciones`
- `iva_porcentaje`, `irpf_porcentaje`
- `invoice_id` (nullable, acople con factura pagada)
- `created_at`, `updated_at`

Contrato TS draft:

- `Transaction`

## 1.4 Factura (`invoices`)

Campos observados:

- `id`, `user_id`
- `invoice_number`, `invoice_series`
- `client_id` (nullable en legacy historico)
- `client_name`
- `issue_date`, `due_date`
- `subtotal`, `tax_amount`, `total_amount`, `currency`
- `status` (`draft`, `issued`, `cancelled`)
- `is_paid`, `paid_at`
- `invoice_data` (JSON completo del documento)
- `created_at`, `updated_at`

Contratos TS draft:

- `Invoice`, `InvoiceDraft`, `IssuedInvoice`

## 1.5 Presupuesto (`quotes`)

Campos observados:

- `id`, `user_id`
- `quote_number`, `quote_series`
- `client_id` (nullable en legacy historico)
- `client_name`
- `issue_date`, `due_date`
- `subtotal`, `tax_amount`, `total_amount`, `currency`
- `status` (`draft`, `issued`, `cancelled`)
- `is_paid`, `paid_at`
- `quote_data` (JSON completo del documento)
- `created_at`, `updated_at`

Contratos TS draft:

- `Quote`, `QuoteDraft`

## 1.6 Billing/usage/onboarding

- `billing_subscriptions`: plan, status, periodos, cambios pendientes.
- `billing_usage`: `invoices_used`, `ocr_scans_used` por `period_start`.
- `user_progress`: pasos de onboarding (`step1..step4`).
- `access_logs`: historial de acceso por usuario.

Contratos TS draft:

- `PlanUsage`, `PlanLimits`, `BillingUsageSnapshot`, `OnboardingProgress`.

## 2) Shape observable de documentos JSON (legacy)

Fuente: `assets/js/invoice-data-handler.js` y `assets/js/quote-data-handler.js`.

## 2.1 `invoice_data`

```json
{
  "issuer": {
    "name": "",
    "nif": "",
    "email": "",
    "address": "",
    "postalCode": ""
  },
  "client": {
    "name": "",
    "nif": "",
    "email": "",
    "address": "",
    "postalCode": ""
  },
  "invoice": {
    "series": "A",
    "number": "A-2026-001",
    "reference": "",
    "issueDate": "",
    "dueDate": ""
  },
  "concepts": [
    {
      "description": "",
      "quantity": 1,
      "unitPrice": 0,
      "discount": 0,
      "tax": 21,
      "re": 0,
      "total": 0
    }
  ],
  "expenses": [{ "description": "", "amount": 0 }],
  "taxSettings": {
    "taxType": "iva|igic|ipsi",
    "iva": 21,
    "withholding": 0
  },
  "paymentMethods": [{ "type": "", "iban": "", "phone": "", "label": "" }],
  "observations": "",
  "summary": {
    "subtotal": 0,
    "discount": 0,
    "taxBase": 0,
    "taxRate": 21,
    "taxAmount": 0,
    "reRate": 5.2,
    "reAmount": 0,
    "retentionRate": 0,
    "retentionAmount": 0,
    "expenses": 0,
    "total": 0,
    "paid": 0,
    "totalToPay": 0
  }
}
```

## 2.2 `quote_data`

Mismo shape funcional que `invoice_data` con bloque `quote` en lugar de `invoice`.

## 3) Inconsistencias detectadas

1. Politica de limites:
- `quotes.js` usa `planLimits.canCreateInvoice()` y `recordInvoiceUsage()`.
- Resultado: presupuestos consumen cuota de facturas.

2. Compatibilidad `client_id`:
- Migracion `20260213100000_backfill_client_id_invoices_quotes.sql` confirma historico sin `client_id`.
- Fallback por NIF y luego por nombre exacto.

3. Divergencia de campos en consultas legacy:
- Existen consultas legacy que esperan `total` o `invoice_number` en contextos de quotes.
- El storage canonico usa `total_amount` y `quote_number`.

4. Estados de cliente no unificados historicamente:
- Migraciones cambiaron `estado` de `activo/inactivo` a `recurrente/puntual`.
- Parte del legacy todavia referencia semantica antigua.

5. Contratos documentales no tipados en runtime legacy:
- `invoice_data`/`quote_data` se construyen desde DOM, no desde schema formal versionado.

## 4) Riesgos de compatibilidad legacy

- Riesgo alto de regresion si se elimina fallback por NIF/nombre antes de completar backfill real en datos vivos.
- Riesgo alto si se toca la semantica de `invoice_id` en transacciones automaticas.
- Riesgo medio-alto por dependencia de `localStorage` (`invoice_draft_data`, `quote_draft_data`) para navegacion editor/preview.
- Riesgo medio por mezcla de valores numericos como string/number en formularios y parseos.

## 5) Contratos ya materializados en esta fase

Implementados en TypeScript:

- `src/shared/types/domain.ts`
  - `Client`, `Transaction`, `Product`
  - `Invoice`, `InvoiceDraft`, `IssuedInvoice`
  - `Quote`, `QuoteDraft`
  - `DocumentLine`, `PaymentMethod`
  - `PlanUsage`, `OnboardingProgress`
- Repositorios tipados en `src/services/repositories/*`.

## 6) Decisiones para siguiente fase

1. Introducir versionado de schema para `invoice_data` y `quote_data` (v1 legacy, v2 tipado).
2. Definir politica explicita de cuota para presupuestos (se conserva o se separa de facturas).
3. Congelar shape de `Client` para soportar ambos estados (`activo/inactivo` y `recurrente/puntual`) hasta cleanup final.
4. Mover parseo/calc de documento a nucleo puro antes de migrar pantallas documentales.
