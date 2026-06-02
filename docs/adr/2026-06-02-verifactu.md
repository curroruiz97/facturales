# ADR — Soporte Verifactu (sistema de facturación verificable AEAT)

- **Fecha:** 2026-06-02
- **Estado:** En progreso (huella implementada y verificada; modo de operación PENDIENTE de decisión de negocio)
- **Ámbito:** facturación legal española (RD 1007/2023 + Orden HAC/1177/2024 + Ley 11/2021)

## Contexto

La auditoría Fase 0 detectó que la app **no cumple Verifactu** (no hay huella encadenada, ni QR, ni
marca VERI\*FACTU, ni registro de alta/anulación ante AEAT) **y, además, la UI y los Términos de Servicio
afirman cumplir** AEAT / Ley 11/2021 / TicketBAI y prometen un botón "Rectificar" inexistente — lo que
constituye un riesgo legal por afirmaciones de cumplimiento no respaldadas por el código.

### Hallazgo de fechas (investigación 2026-06-02, fuentes oficiales)

El **RD-ley 15/2025 (2 dic 2025)** prorrogó la obligatoriedad:

| Obligado | Fecha de uso obligatorio |
|----------|--------------------------|
| Contribuyentes de Impuesto de Sociedades (art. 3.1.a) | **1 enero 2027** |
| Resto (autónomos/IRPF, etc.) | **1 julio 2027** |

A día de hoy **no es exigible a los usuarios**, pero el plazo de adaptación de los **fabricantes de
software** (≈29 jul 2025, no prorrogado) ya venció. Conclusión: hay margen para implementarlo **con
calidad**, sin emergencia, pero es necesario para ser un producto legítimamente "compliant" y vendible.

### Dos modos (afecta a la arquitectura)

- **VERI\*FACTU (con remisión):** envía cada registro a la AEAT de forma continuada. **No exige firma
  electrónica** de cada registro (basta encadenamiento por huella + envío). Exime de conservación. Requiere
  **certificado electrónico** para el envío (sello/representante).
- **No verificable (sin remisión):** **exige firma electrónica** de cada registro + conservación,
  inalterabilidad, registro de eventos (`EventosSIF`) y disposición a inspección. No envía en tiempo real.

## Decisión

Implementar Verifactu completo (decisión del propietario). Arquitectura propuesta:

1. **Huella encadenada** como dominio puro y testeado → `src/domain/rules/fiscal/verifactu-huella.ts`.
   **HECHO y verificado** contra los vectores oficiales de la AEAT (SHA-256, formato `Campo=valor&…`,
   hex mayúsculas). Tests: `__tests__/verifactu-huella.test.ts` (8/8 verdes).
2. **Tabla append-only `verifactu_registros`** (registro de facturación de alta/anulación) con la huella,
   el encadenamiento al registro anterior, e **inmutabilidad forzada en BD** (sin UPDATE/DELETE de
   registros emitidos; esto cierra también el hallazgo P1-2 de numeración editable). *(Pendiente de aplicar
   como migración — acción sensible, requiere OK.)*
3. **Generación de huella + registro en el servidor** (Edge Function en la emisión de la factura), nunca en
   el cliente (forjable). Numeración correlativa asignada atómicamente al **emitir**, no al crear borrador.
4. **Código QR** según especificación AEAT (URL de cotejo + `nif`, `numserie`, `fecha`, `importe`;
   30–40 mm; corrección de errores M; texto "VERI\*FACTU"). Función pura + render en el PDF.
5. **Capa de envío/firma según el modo elegido** (ver Decisiones abiertas).
6. **Declaración responsable** del fabricante (art. 15 Orden HAC/1177/2024) en docs + UI.

## Decisiones abiertas (requieren input del propietario)

- **Modo de operación:** VERI\*FACTU (envío a AEAT + certificado) vs. no verificable (firma electrónica de
  cada registro + conservación). Recomendación preliminar: **VERI\*FACTU** (más simple para el SIF: sin
  firma por registro; la AEAT asume conservación).
- **Certificado electrónico:** ¿se dispone (o se obtendrá) de certificado de sello/representante para envío
  desatendido?
- **Identificación del SistemaInformatico** (`IdSistemaInformatico`, `Version`, `NumeroInstalacion`, NIF del
  productor) para los registros.

## Consecuencias

- Una vez operativo, las afirmaciones de cumplimiento de UI/ToS pasan a ser ciertas. **Hasta entonces**, se
  recomienda matizarlas (riesgo de publicidad de cumplimiento no real). Decisión del propietario: implementar
  antes que matizar.
- La inmutabilidad en BD (paso 2) puede requerir migrar datos existentes (236 facturas) con cuidado.
- No se afirmará cumplimiento "verificado" hasta validar contra el **entorno de pruebas de la AEAT**.

## Estado de verificación

- ✅ Huella: verificada contra vectores oficiales AEAT (`3C464DAF…`, `177547C0…`). `tsc` limpio.
- ⏳ Tabla registro, QR, envío/firma, validación en preproducción AEAT: pendientes.

## Referencias oficiales

- RD 1007/2023 (consolidado): https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- Orden HAC/1177/2024 (consolidada): https://www.boe.es/buscar/pdf/2024/BOE-A-2024-22138-consolidado.pdf
- Esp. huella/hash v0.1.2: https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf
- Esp. QR v0.5.0: https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf
- FAQ desarrolladores (4 dic 2025, con prórroga 2027): https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/FAQs-Desarrolladores.pdf
- Esquemas XSD / WSDL: https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Esquemas_de_los_servicios_web/Esquemas_de_los_servicios_web.html
