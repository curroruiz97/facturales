-- Migración: Rellenar client_id en facturas y presupuestos existentes
-- Fecha: 2026-02-13
-- Descripción: Las facturas/presupuestos se creaban sin client_id. Esta migración
--   vincula cada registro con el cliente correcto basándose en el NIF/CIF
--   almacenado en invoice_data->'client'->>'nif' = clientes.identificador.
--   El NIF/CIF es un identificador fiscal legal, inmutable y único por cliente,
--   por lo que el match es fiable incluso si el nombre del cliente ha cambiado
--   o hay dos clientes con el mismo nombre.

-- =====================================================
-- FACTURAS: desactivar trigger de validación temporalmente
-- (el trigger impide modificar client_id en facturas emitidas)
-- =====================================================

ALTER TABLE invoices DISABLE TRIGGER validate_invoice_update_trigger;

-- Match primario: por NIF/CIF (invoice_data->'client'->>'nif' = clientes.identificador)
UPDATE invoices i
SET client_id = c.id
FROM clientes c
WHERE i.client_id IS NULL
  AND i.user_id = c.user_id
  AND TRIM(UPPER(i.invoice_data->'client'->>'nif')) = TRIM(UPPER(c.identificador))
  AND c.identificador IS NOT NULL
  AND i.invoice_data->'client'->>'nif' IS NOT NULL
  AND TRIM(i.invoice_data->'client'->>'nif') <> '';

-- Match secundario (solo para facturas que aún no se vincularon):
-- por nombre exacto, como último recurso para facturas cuyo invoice_data
-- no contenga NIF (caso improbable pero posible en datos muy antiguos)
UPDATE invoices i
SET client_id = c.id
FROM clientes c
WHERE i.client_id IS NULL
  AND i.user_id = c.user_id
  AND TRIM(UPPER(i.client_name)) = TRIM(UPPER(c.nombre_razon_social));

ALTER TABLE invoices ENABLE TRIGGER validate_invoice_update_trigger;

-- =====================================================
-- PRESUPUESTOS: desactivar trigger de validación temporalmente
-- =====================================================

ALTER TABLE quotes DISABLE TRIGGER validate_quote_update_trigger;

-- Match primario: por NIF/CIF (quote_data->'client'->>'nif' = clientes.identificador)
UPDATE quotes q
SET client_id = c.id
FROM clientes c
WHERE q.client_id IS NULL
  AND q.user_id = c.user_id
  AND TRIM(UPPER(q.quote_data->'client'->>'nif')) = TRIM(UPPER(c.identificador))
  AND c.identificador IS NOT NULL
  AND q.quote_data->'client'->>'nif' IS NOT NULL
  AND TRIM(q.quote_data->'client'->>'nif') <> '';

-- Match secundario: por nombre exacto (último recurso)
UPDATE quotes q
SET client_id = c.id
FROM clientes c
WHERE q.client_id IS NULL
  AND q.user_id = c.user_id
  AND TRIM(UPPER(q.client_name)) = TRIM(UPPER(c.nombre_razon_social));

ALTER TABLE quotes ENABLE TRIGGER validate_quote_update_trigger;
