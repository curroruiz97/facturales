# Declaración Responsable del Productor del Sistema Informático de Facturación

> ⚠️ **BORRADOR — NO FIRMAR TODAVÍA.**
> Este documento es una plantilla preparada para Kit Digital (§1.13 "Declaración responsable del fabricante")
> y para el art. 13 del RD 1007/2023 / art. 15 de la Orden HAC/1177/2024.
> **Solo debe firmarse y sellarse cuando todas las afirmaciones de abajo sean ciertas en producción**
> (ver "Lista de comprobación antes de firmar"). Firmar antes de cumplir sería una declaración falsa.
>
> Para la evidencia de Kit Digital: una vez firmado y sellado, exportar a PDF. Una declaración **sin firma
> ni sello** o una mera "referencia a las condiciones legales del producto" **NO es válida** (se deniega).

---

## 1. Datos del productor del sistema informático

- **Razón social:** AVENUE DIGITAL GROUP, S.L.
- **NIF:** B-70829601
- **Domicilio:** Plaza Mayor, 23, 1.º A — 47001 Valladolid (España)
- **Datos registrales:** Registro Mercantil de Valladolid, tomo 1646, folio 78, inscripción 1, hoja VA-34519
- **Representante legal:** D. Francisco Ruiz Chamorro — NIF 53501828-X
- **Correo electrónico:** info@facturales.es

## 2. Datos del sistema informático de facturación (SIF)

- **Nombre comercial:** Facturales
- **Tipo de sistema:** Solución SaaS multi-tenant de facturación accesible vía web (app.facturales.es)
- **Versión del software:** `_______________` *(indicar la versión exacta liberada y evidenciable)*
- **Modalidad de funcionamiento declarada:** VERI*FACTU (remisión de los registros de facturación a la AEAT)

## 3. Declaración

D. Francisco Ruiz Chamorro, con NIF 53501828-X, en nombre y representación de AVENUE DIGITAL GROUP, S.L.
(en adelante, "el productor"), en su condición de **productor** del sistema informático de facturación
**Facturales**, **DECLARA BAJO SU RESPONSABILIDAD** que dicho sistema cumple con lo dispuesto en:

- El **artículo 29.2.j) de la Ley 58/2003, General Tributaria**, en la redacción dada por la **Ley 11/2021**,
  de 9 de julio, de medidas de prevención y lucha contra el fraude fiscal.
- El **Real Decreto 1007/2023**, de 5 de diciembre, por el que se aprueba el Reglamento que establece los
  requisitos que deben adoptar los sistemas y programas informáticos de facturación.
- La **Orden HAC/1177/2024**, de 17 de octubre, de desarrollo de las especificaciones técnicas, funcionales
  y de contenido del citado Reglamento.
- El **Real Decreto 1619/2012**, de 30 de noviembre, por el que se aprueba el Reglamento por el que se regulan
  las obligaciones de facturación.

Y, en particular, que el sistema **Facturales** garantiza la **integridad, conservación, accesibilidad,
legibilidad, trazabilidad e inalterabilidad** de los registros de facturación, sin interpolaciones, omisiones
ni alteraciones de las que no quede la debida anotación en el propio sistema, mediante:

1. La generación de un **registro de facturación** de forma simultánea o inmediatamente anterior a la
   expedición de cada factura.
2. El **encadenamiento mediante huella (hash SHA-256)** de cada registro con el anterior del mismo obligado.
3. La incorporación, en cada factura, de un **código QR** y de la leyenda **"VERI*FACTU"** que permiten su
   cotejo en la sede electrónica de la AEAT.
4. La **remisión de los registros de facturación a la Agencia Estatal de Administración Tributaria** conforme
   a las especificaciones técnicas vigentes.

En __________________, a ____ de ________________ de 20____.

Firma del representante legal: ____________________________

**Sello de la empresa:**

*(espacio para el sello)*

---

## Lista de comprobación antes de firmar (uso interno — no forma parte del documento firmado)

Marcar solo cuando cada punto sea **cierto y evidenciable en producción**:

- [ ] **Versión del software** fijada y reflejada en la app (coincide con la memoria técnica).
- [ ] **Registro de facturación de alta** generado en cada emisión (huella SHA-256 encadenada). *Hecho.*
- [ ] **QR + leyenda VERI*FACTU** visibles en la factura (PDF y electrónica). *Hecho.*
- [ ] **Registro de anulación** generado al anular una factura. *Pendiente de despliegue.*
- [ ] **XML del registro conforme a la Orden HAC/1177/2024** (esquemas AEAT). *Pendiente.*
- [ ] **Remisión efectiva a la AEAT** probada contra preproducción y luego producción (mTLS, colaboración
      social Tipo 017 o certificado del obligado). *Pendiente: requiere certificado + alta Tipo 017.*
- [ ] **Firma electrónica de la factura Facturae (`.xsig`, XAdES)** si se declara emisión firmada. *Pendiente:
      requiere certificado.*

> Mientras queden puntos sin marcar, **no firmar**: la declaración afirma un cumplimiento que aún no es efectivo.
