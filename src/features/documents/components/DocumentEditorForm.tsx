import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineItemsEditor } from "./LineItemsEditor";
import { PaymentMethodsEditor } from "./PaymentMethodsEditor";
import { ModernDateInput } from "./ModernDateInput";
import type { UseDocumentEditorResult } from "../hooks/use-document-editor";
import type { ClientPickerOption } from "./ClientPicker";
import { clientsRepository } from "../../../services/repositories";
import { invoiceSeriesService, type InvoiceSeriesInput, type InvoiceSeriesRecord } from "../../../services/invoice-series/invoice-series.service";
import { saveDefaultPaymentMethodSync } from "../../../services/payment/default-payment-method";

interface DocumentEditorFormProps {
  kindLabel: string;
  editorController: UseDocumentEditorResult;
  readOnly?: boolean;
  onSelectClient: (client: ClientPickerOption | null) => void;
}

function parseNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtCurrency(amount: number, currency: string): string {
  const cur = /^[A-Z]{3}$/.test((currency || "").toUpperCase()) ? currency.toUpperCase() : "EUR";
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount || 0);
  }
}

function AdvancedOptions({
  editorController,
  readOnly,
}: {
  editorController: UseDocumentEditorResult;
  readOnly: boolean;
}): import("react").JSX.Element {
  const { editor } = editorController;
  const [open, setOpen] = useState(false);

  const hasExpenses = editor.expenses.length > 0;
  const hasPaidAmount = editor.paidAmount > 0;
  const hasObservations = editor.observations.trim().length > 0;

  const toggleExpenses = useCallback(() => {
    if (hasExpenses) {
      for (const exp of editor.expenses) {
        editorController.removeExpense(exp.id);
      }
    } else {
      editorController.addExpense();
    }
  }, [hasExpenses, editor.expenses, editorController]);

  const togglePaidAmount = useCallback(() => {
    if (hasPaidAmount) {
      editorController.setPaidAmount(0);
    }
  }, [hasPaidAmount, editorController]);

  const toggleObservations = useCallback(() => {
    if (hasObservations) {
      editorController.setObservations("");
    }
  }, [hasObservations, editorController]);

  const subtitle = [
    "Recargo equivalencia",
    "gastos suplidos",
    "observaciones",
  ].join(", ");

  return (
    <section className="inv-section inv-advanced">
      <button
        type="button"
        className="inv-advanced__toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h2 className="inv-section__title">Opciones avanzadas</h2>
          <p className="inv-section__sub">{subtitle}</p>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className={`inv-advanced__chevron ${open ? "inv-advanced__chevron--open" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="inv-advanced__body">
          <label className="inv-checkbox-row">
            <input
              type="checkbox"
              checked={editor.taxSettings.applyRecargoEquivalencia}
              onChange={(e) => editorController.setTaxField("applyRecargoEquivalencia", e.target.checked)}
              disabled={readOnly}
            />
            Recargo de equivalencia
          </label>

          <label className="inv-checkbox-row">
            <input
              type="checkbox"
              checked={hasExpenses}
              onChange={toggleExpenses}
              disabled={readOnly}
            />
            Añadir gastos suplidos
          </label>
          {hasExpenses ? (
            <div className="inv-advanced__sub-fields">
              {editor.expenses.map((exp) => (
                <div key={exp.id} className="inv-advanced__expense-row">
                  <input
                    className="inv-input"
                    type="text"
                    placeholder="Descripción"
                    value={exp.description}
                    onChange={(e) => editorController.updateExpense(exp.id, { description: e.target.value })}
                    disabled={readOnly}
                  />
                  <input
                    className="inv-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={exp.amount || ""}
                    onChange={(e) => editorController.updateExpense(exp.id, { amount: parseNumber(e.target.value) })}
                    disabled={readOnly}
                    style={{ width: 120, maxWidth: "100%" }}
                  />
                  <button
                    type="button"
                    className="inv-remove-btn"
                    onClick={() => editorController.removeExpense(exp.id)}
                    disabled={readOnly}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="inv-link-btn"
                onClick={() => editorController.addExpense()}
                disabled={readOnly}
              >
                + Añadir otro gasto suplido
              </button>
            </div>
          ) : null}

          <label className="inv-checkbox-row">
            <input
              type="checkbox"
              checked={hasPaidAmount}
              onChange={() => {
                if (!hasPaidAmount) {
                  editorController.setPaidAmount(0.01);
                } else {
                  togglePaidAmount();
                }
              }}
              disabled={readOnly}
            />
            Cantidad ya pagada
          </label>
          {hasPaidAmount ? (
            <div className="inv-advanced__sub-fields">
              <div>
                <label className="inv-label">Importe ya pagado</label>
                <input
                  className="inv-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editor.paidAmount || ""}
                  onChange={(e) => editorController.setPaidAmount(parseNumber(e.target.value))}
                  disabled={readOnly}
                  style={{ maxWidth: 200 }}
                />
              </div>
            </div>
          ) : null}

          <label className="inv-checkbox-row">
            <input
              type="checkbox"
              checked={hasObservations}
              onChange={() => {
                if (hasObservations) {
                  toggleObservations();
                }
              }}
              disabled={readOnly}
            />
            Incluir Observaciones para el receptor de la factura
          </label>
          {(hasObservations || !readOnly) ? (
            <div className="inv-advanced__sub-fields">
              <textarea
                className="inv-textarea"
                value={editor.observations}
                onChange={(e) => editorController.setObservations(e.target.value)}
                placeholder="Notas visibles en el documento"
                disabled={readOnly}
                rows={3}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function DocumentEditorForm({
  kindLabel,
  editorController,
  readOnly = false,
  onSelectClient,
}: DocumentEditorFormProps): import("react").JSX.Element {
  const { editor, totals } = editorController;
  const cur = editor.meta.currency || "EUR";
  const clientDropdownRef = useRef<HTMLDivElement | null>(null);
  const [clientQuery, setClientQuery] = useState(editor.client.name || "");
  const [clientLoading, setClientLoading] = useState(false);
  const [clientOptions, setClientOptions] = useState<ClientPickerOption[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [seriesItems, setSeriesItems] = useState<InvoiceSeriesRecord[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [seriesSaving, setSeriesSaving] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    nombreRazonSocial: "",
    identificador: "",
    tipoCliente: "autonomo" as "autonomo" | "empresa",
    email: "",
    telefono: "",
    direccion: "",
    codigoPostal: "",
    ciudad: "",
    pais: "España",
    diaFacturacion: "",
    estado: "puntual" as "activo" | "inactivo" | "recurrente" | "puntual",
  });
  const [newSeries, setNewSeries] = useState<InvoiceSeriesInput>({
    code: "",
    description: "",
    invoiceNumberFormat: "common",
    counterReset: "yearly",
    startNumber: 1,
    customFormat: "",
  });

  const availableSeries = useMemo(() => {
    if (seriesItems.length === 0) {
      return [{ code: editor.meta.series || "A", description: "Serie actual" }];
    }
    return seriesItems.map((item) => ({ code: item.code, description: item.description }));
  }, [editor.meta.series, seriesItems]);

  useEffect(() => {
    const loadSeries = async () => {
      setSeriesLoading(true);
      const result = await invoiceSeriesService.listMine();
      if (result.success) {
        setSeriesItems(result.data);
      }
      setSeriesLoading(false);
    };
    void loadSeries();
  }, []);

  useEffect(() => {
    setClientQuery(editor.client.name || "");
  }, [editor.client.name]);

  useEffect(() => {
    if (!showClientDropdown || readOnly) return;
    const handle = window.setTimeout(async () => {
      setClientLoading(true);
      const result = await clientsRepository.list(clientQuery);
      if (result.success) {
        setClientOptions(
          result.data.slice(0, 12).map((client) => ({
            id: client.id,
            nombreRazonSocial: client.nombreRazonSocial,
            identificador: client.identificador,
            email: client.email,
            direccion: client.direccion,
            codigoPostal: client.codigoPostal,
          })),
        );
      } else {
        setClientOptions([]);
      }
      setClientLoading(false);
    }, 200);

    return () => window.clearTimeout(handle);
  }, [clientQuery, showClientDropdown, readOnly]);

  useEffect(() => {
    if (!showClientDropdown) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!clientDropdownRef.current) return;
      if (!clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [showClientDropdown]);

  const applyClient = (client: ClientPickerOption) => {
    setClientQuery(client.nombreRazonSocial);
    setShowClientDropdown(false);
    onSelectClient(client);
  };

  const createClientInline = async () => {
    setClientError(null);
    if (!newClient.nombreRazonSocial.trim() || !newClient.identificador.trim()) {
      setClientError("Nombre e identificador son obligatorios.");
      return;
    }

    setClientSaving(true);
    const result = await clientsRepository.create({
      nombreRazonSocial: newClient.nombreRazonSocial,
      identificador: newClient.identificador,
      tipoCliente: newClient.tipoCliente,
      email: newClient.email || null,
      telefono: newClient.telefono || null,
      direccion: newClient.direccion || null,
      codigoPostal: newClient.codigoPostal || null,
      ciudad: newClient.ciudad || null,
      pais: newClient.pais || null,
      diaFacturacion: newClient.diaFacturacion ? Number.parseInt(newClient.diaFacturacion, 10) : null,
      estado: newClient.estado,
    });
    setClientSaving(false);

    if (!result.success) {
      setClientError(result.error.message);
      return;
    }

    const option: ClientPickerOption = {
      id: result.data.id,
      nombreRazonSocial: result.data.nombreRazonSocial,
      identificador: result.data.identificador,
      email: result.data.email,
      direccion: result.data.direccion,
      codigoPostal: result.data.codigoPostal,
    };
    applyClient(option);
    setClientModalOpen(false);
    setNewClient({
      nombreRazonSocial: "",
      identificador: "",
      tipoCliente: "autonomo",
      email: "",
      telefono: "",
      direccion: "",
      codigoPostal: "",
      ciudad: "",
      pais: "España",
      diaFacturacion: "",
      estado: "puntual",
    });
  };

  const createSeriesInline = async () => {
    setSeriesError(null);
    if (!newSeries.code?.trim() || !newSeries.description?.trim()) {
      setSeriesError("Código y descripción son obligatorios.");
      return;
    }
    setSeriesSaving(true);
    const result = await invoiceSeriesService.create(newSeries);
    setSeriesSaving(false);
    if (!result.success) {
      setSeriesError(result.error.message);
      return;
    }
    setSeriesItems((previous) => [...previous, result.data]);
    editorController.setMetaField("series", result.data.code);
    setSeriesModalOpen(false);
    setNewSeries({
      code: "",
      description: "",
      invoiceNumberFormat: "common",
      counterReset: "yearly",
      startNumber: 1,
      customFormat: "",
    });
  };

  return (
    <div className="inv-form">
      {/* Row 1: Emisor | Cliente | Datos */}
      <div className="inv-row-3">
        {/* Emisor */}
        <section className="inv-section">
          <div className="inv-section__head">
            <div>
              <h2 className="inv-section__title">Emisor</h2>
              <p className="inv-section__sub">Se autocompleta con tus datos fiscales.</p>
            </div>
            <span className="inv-section__badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Auto
            </span>
          </div>
          <div className="inv-fields">
            <div>
              <label className="inv-label" htmlFor="inv-issuer-name">Razón social</label>
              <input
                id="inv-issuer-name"
                className="inv-input"
                type="text"
                disabled
                value={editor.issuer.name || ""}
                placeholder="Cargando..."
              />
            </div>
            <div className="inv-fields-2">
              <div>
                <label className="inv-label" htmlFor="inv-issuer-nif">NIF</label>
                <input
                  id="inv-issuer-nif"
                  className="inv-input"
                  type="text"
                  disabled
                  value={editor.issuer.nif || ""}
                  placeholder="—"
                />
              </div>
              <div>
                <label className="inv-label" htmlFor="inv-issuer-email">Email</label>
                <input
                  id="inv-issuer-email"
                  className="inv-input"
                  type="email"
                  value={editor.issuer.email}
                  onChange={(e) => editorController.setIssuerField("email", e.target.value)}
                  placeholder="email@empresa.com"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="inv-fields-2">
              <div>
                <label className="inv-label" htmlFor="inv-issuer-addr">Dirección fiscal</label>
                <input
                  id="inv-issuer-addr"
                  className="inv-input"
                  type="text"
                  value={editor.issuer.address}
                  onChange={(e) => editorController.setIssuerField("address", e.target.value)}
                  placeholder="Dirección completa"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="inv-label" htmlFor="inv-issuer-cp">Código postal</label>
                <input
                  id="inv-issuer-cp"
                  className="inv-input"
                  type="text"
                  value={editor.issuer.postalCode}
                  onChange={(e) => editorController.setIssuerField("postalCode", e.target.value)}
                  placeholder="28001"
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Cliente */}
        <section className="inv-section">
          <div>
            <h2 className="inv-section__title">Cliente</h2>
            <p className="inv-section__sub">Busca un cliente existente o crea uno nuevo.</p>
          </div>
          <div className="inv-fields">
            <div>
              <label className="inv-label">Razón social / Nombre <span className="inv-required">*</span></label>
              <div className="inv-client-picker" ref={clientDropdownRef}>
                <input
                  className="inv-input"
                  type="text"
                  value={clientQuery}
                  placeholder="Buscar cliente..."
                  onFocus={() => setShowClientDropdown(true)}
                  onChange={(event) => {
                    const next = event.target.value;
                    setClientQuery(next);
                    editorController.setClientField("name", next);
                    editorController.setClientField("clientId", null);
                    setShowClientDropdown(true);
                  }}
                  disabled={readOnly}
                />
                {showClientDropdown && !readOnly ? (
                  <div className="inv-client-dropdown">
                    <div className="inv-client-options">
                      {clientLoading ? <div className="inv-client-empty">Buscando clientes...</div> : null}
                      {!clientLoading && clientOptions.length === 0 ? <div className="inv-client-empty">No se encontraron clientes</div> : null}
                      {!clientLoading
                        ? clientOptions.map((option) => (
                            <button key={option.id} type="button" className="inv-client-option" onClick={() => applyClient(option)}>
                              <strong>{option.nombreRazonSocial}</strong>
                              <span>{option.identificador}</span>
                            </button>
                          ))
                        : null}
                    </div>
                    <div className="inv-client-create">
                      <button type="button" className="inv-link-btn" onClick={() => setClientModalOpen(true)}>
                        + Crear cliente
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="inv-fields-2">
              <div>
                <label className="inv-label">NIF</label>
                <input className="inv-input" type="text" value={editor.client.nif} onChange={(e) => editorController.setClientField("nif", e.target.value)} disabled={readOnly} />
              </div>
              <div>
                <label className="inv-label">Email</label>
                <input className="inv-input" type="email" value={editor.client.email} onChange={(e) => editorController.setClientField("email", e.target.value)} disabled={readOnly} />
              </div>
            </div>
            <div className="inv-fields-2">
              <div>
                <label className="inv-label">Dirección fiscal</label>
                <input className="inv-input" type="text" value={editor.client.address} onChange={(e) => editorController.setClientField("address", e.target.value)} disabled={readOnly} />
              </div>
              <div>
                <label className="inv-label">Código postal</label>
                <input className="inv-input" type="text" value={editor.client.postalCode} onChange={(e) => editorController.setClientField("postalCode", e.target.value)} disabled={readOnly} />
              </div>
            </div>
          </div>
        </section>

        {/* Datos de factura/presupuesto */}
        <section className="inv-section">
          <div>
            <h2 className="inv-section__title">Datos de {kindLabel}</h2>
            <p className="inv-section__sub">Serie, numeración y moneda.</p>
          </div>
          <div className="inv-fields">
            <div>
              <label className="inv-label">Serie</label>
              <select
                className="inv-select"
                value={editor.meta.series}
                onChange={(e) => editorController.setMetaField("series", e.target.value)}
                disabled={readOnly || seriesLoading}
              >
                {availableSeries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} ({item.description})
                  </option>
                ))}
              </select>
              <button type="button" className="inv-link-btn" onClick={() => setSeriesModalOpen(true)} disabled={readOnly}>
                + Añadir nueva serie
              </button>
            </div>
            <div className="inv-fields-2">
              <div>
                <label className="inv-label">Número</label>
                <input className="inv-input" type="text" value={editor.meta.number} onChange={(e) => editorController.setMetaField("number", e.target.value)} placeholder="Autogenerado" disabled={readOnly} />
              </div>
              <div>
                <label className="inv-label">Referencia</label>
                <input className="inv-input" type="text" value={editor.meta.reference} onChange={(e) => editorController.setMetaField("reference", e.target.value)} disabled={readOnly} />
              </div>
            </div>
            <div>
              <label className="inv-label">Moneda</label>
              <select className="inv-select" value={editor.meta.currency} onChange={(e) => editorController.setMetaField("currency", e.target.value)} disabled={readOnly}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Fechas y condiciones */}
      <section className="inv-section">
        <div>
          <h2 className="inv-section__title">Fechas y condiciones</h2>
          <p className="inv-section__sub">Emisión, vencimiento y condiciones de pago.</p>
        </div>
        <div className="inv-fields">
          <div className="inv-fields-4">
            <div>
              <label className="inv-label">Fecha de emisión <span className="inv-required">*</span></label>
              <ModernDateInput
                value={editor.meta.issueDate}
                onChange={(date) => editorController.setMetaField("issueDate", date)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="inv-label">Fecha de vencimiento</label>
              <ModernDateInput
                value={editor.meta.dueDate}
                onChange={(date) => editorController.setMetaField("dueDate", date)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="inv-label">Condiciones de pago</label>
              <select
                className="inv-select"
                value={editor.meta.paymentTerms}
                onChange={(e) => editorController.setMetaField("paymentTerms", e.target.value)}
                disabled={readOnly}
              >
                <option value="">Pago inmediato</option>
                <option value="15 días">15 días</option>
                <option value="30 días">30 días</option>
                <option value="60 días">60 días</option>
                <option value="90 días">90 días</option>
              </select>
            </div>
            <div>
              <label className="inv-label">Fecha operación</label>
              <ModernDateInput
                value={editor.meta.operationDate}
                onChange={(date) => editorController.setMetaField("operationDate", date)}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Conceptos */}
      <section className="inv-section">
        <div className="inv-section__head">
          <div>
            <h2 className="inv-section__title">Conceptos</h2>
            <p className="inv-section__sub">Añade los productos o servicios facturados.</p>
          </div>
          <button type="button" className="inv-add-line-btn" onClick={editorController.addLine} disabled={readOnly}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Añadir línea
          </button>
        </div>
        <div style={{ marginTop: 20 }}>
          <LineItemsEditor
            lines={editor.lines}
            readOnly={readOnly}
            onAddLine={editorController.addLine}
            onUpdateLine={editorController.updateLine}
            onRemoveLine={editorController.removeLine}
          />
        </div>
      </section>

      {/* Opciones avanzadas */}
      <AdvancedOptions editorController={editorController} readOnly={readOnly} />

      {/* Row bottom: Métodos de pago | Ajustes fiscales | Resumen */}
      <div className="inv-row-3">
        {/* Métodos de pago */}
        <section className="inv-section">
          <h2 className="inv-section__title">Métodos de pago</h2>
          <p className="inv-section__sub">Indica cómo puede pagarte tu cliente.</p>
          <PaymentMethodsEditor
            methods={editor.paymentMethods}
            readOnly={readOnly}
            onAddMethod={editorController.addPaymentMethod}
            onUpdateMethod={editorController.updatePaymentMethod}
            onRemoveMethod={editorController.removePaymentMethod}
            onSaveDefault={saveDefaultPaymentMethodSync}
          />
        </section>

        {/* Ajustes fiscales */}
        <section className="inv-section">
          <div>
            <h2 className="inv-section__title">Ajustes fiscales</h2>
            <p className="inv-section__sub">Descuentos globales y retenciones.</p>
          </div>
          <div className="inv-fields">
            <div>
              <label className="inv-label">Descuento general</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input className="inv-input" type="number" step="0.01" min="0" style={{ flex: 1 }}
                  value={editor.taxSettings.generalDiscountRate}
                  onChange={(e) => editorController.setTaxField("generalDiscountRate", parseNumber(e.target.value))}
                  disabled={readOnly} />
                <span style={{ fontSize: 14, color: "#718096", fontWeight: 600 }}>%</span>
              </div>
            </div>
            <div>
              <label className="inv-label">Retención IRPF</label>
              <select className="inv-select"
                value={editor.taxSettings.retentionRate}
                onChange={(e) => editorController.setTaxField("retentionRate", parseNumber(e.target.value))}
                disabled={readOnly}>
                <option value="0">Sin retención</option>
                <option value="7">7% (reducido)</option>
                <option value="15">15% (general)</option>
                <option value="19">19%</option>
                <option value="24">24%</option>
              </select>
              <p style={{ marginTop: 4, fontSize: 12, color: "#A0AEC0" }}>Se aplica sobre la base imponible</p>
            </div>
          </div>
        </section>

        {/* Resumen */}
        <section className="inv-summary">
          <h3 className="inv-summary__title">Resumen</h3>
          <div className="inv-summary__row">
            <span>Subtotal</span>
            <strong>{fmtCurrency(totals.summary.subtotal, cur)}</strong>
          </div>
          {totals.summary.discount > 0 ? (
            <div className="inv-summary__row inv-summary__row--discount">
              <span>Descuento</span>
              <strong>-{fmtCurrency(totals.summary.discount, cur)}</strong>
            </div>
          ) : null}
          <div className="inv-summary__row">
            <span>Base imponible</span>
            <strong>{fmtCurrency(totals.summary.taxBase, cur)}</strong>
          </div>
          <div className="inv-summary__row">
            <span>Impuestos</span>
            <strong>{fmtCurrency(totals.summary.taxAmount, cur)}</strong>
          </div>
          {totals.summary.retentionAmount > 0 ? (
            <div className="inv-summary__row inv-summary__row--discount">
              <span>Retención ({editor.taxSettings.retentionRate}%)</span>
              <strong>-{fmtCurrency(totals.summary.retentionAmount, cur)}</strong>
            </div>
          ) : null}
          {totals.summary.expenses > 0 ? (
            <div className="inv-summary__row">
              <span>Gastos suplidos</span>
              <strong>{fmtCurrency(totals.summary.expenses, cur)}</strong>
            </div>
          ) : null}
          <hr className="inv-summary__divider" />
          <div className="inv-summary__total">
            <span>Total</span>
            <span>{fmtCurrency(totals.summary.total, cur)}</span>
          </div>
          {editor.paidAmount > 0 ? (
            <div className="inv-summary__row inv-summary__row--discount">
              <span>Cantidad pagada</span>
              <strong>-{fmtCurrency(editor.paidAmount, cur)}</strong>
            </div>
          ) : null}
          <hr className="inv-summary__divider" />
          <div className="inv-summary__topay">
            <span>Total a pagar</span>
            <span>{fmtCurrency(totals.summary.totalToPay, cur)}</span>
          </div>
          <p className="inv-summary__note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Se recalcula automáticamente
          </p>
        </section>
      </div>

      {clientModalOpen ? (
        <div className="inv-modal" role="dialog" aria-modal="true">
          <button type="button" className="inv-modal__overlay" onClick={() => setClientModalOpen(false)} />
          <div className="inv-modal__content inv-modal__content--lg">
            <header className="inv-modal__header">
              <h3>Crear cliente</h3>
              <button type="button" className="inv-modal__close" onClick={() => setClientModalOpen(false)}>×</button>
            </header>
            <div className="inv-modal__body">
              <div className="inv-fields-2">
                <div>
                  <label className="inv-label">Nombre / Razón social</label>
                  <input className="inv-input" value={newClient.nombreRazonSocial} onChange={(e) => setNewClient((p) => ({ ...p, nombreRazonSocial: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">NIF / CIF</label>
                  <input className="inv-input" value={newClient.identificador} onChange={(e) => setNewClient((p) => ({ ...p, identificador: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="inv-label">Email</label>
                  <input className="inv-input" type="email" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">Teléfono</label>
                  <input className="inv-input" value={newClient.telefono} onChange={(e) => setNewClient((p) => ({ ...p, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">Dirección</label>
                  <input className="inv-input" value={newClient.direccion} onChange={(e) => setNewClient((p) => ({ ...p, direccion: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">Código postal</label>
                  <input className="inv-input" value={newClient.codigoPostal} onChange={(e) => setNewClient((p) => ({ ...p, codigoPostal: e.target.value }))} />
                </div>
              </div>
              {clientError ? <p className="pilot-error-text">{clientError}</p> : null}
            </div>
            <footer className="inv-modal__footer">
              <button type="button" className="inv-btn" onClick={() => setClientModalOpen(false)} disabled={clientSaving}>Cancelar</button>
              <button type="button" className="inv-btn inv-btn--primary" onClick={() => void createClientInline()} disabled={clientSaving}>
                {clientSaving ? "Guardando..." : "Guardar cliente"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {seriesModalOpen ? (
        <div className="inv-modal" role="dialog" aria-modal="true">
          <button type="button" className="inv-modal__overlay" onClick={() => setSeriesModalOpen(false)} />
          <div className="inv-modal__content">
            <header className="inv-modal__header">
              <h3>Nueva serie</h3>
              <button type="button" className="inv-modal__close" onClick={() => setSeriesModalOpen(false)}>×</button>
            </header>
            <div className="inv-modal__body">
              <div className="inv-fields">
                <div>
                  <label className="inv-label">Código</label>
                  <input className="inv-input" value={newSeries.code} onChange={(e) => setNewSeries((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="R" />
                </div>
                <div>
                  <label className="inv-label">Descripción</label>
                  <input className="inv-input" value={newSeries.description} onChange={(e) => setNewSeries((p) => ({ ...p, description: e.target.value }))} placeholder="Rectificativas" />
                </div>
              </div>
              {seriesError ? <p className="pilot-error-text">{seriesError}</p> : null}
            </div>
            <footer className="inv-modal__footer">
              <button type="button" className="inv-btn" onClick={() => setSeriesModalOpen(false)} disabled={seriesSaving}>Cancelar</button>
              <button type="button" className="inv-btn inv-btn--primary" onClick={() => void createSeriesInline()} disabled={seriesSaving}>
                {seriesSaving ? "Guardando..." : "Crear serie"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
