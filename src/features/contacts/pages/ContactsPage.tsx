import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EmptyState } from "../../../app/components/states/EmptyState";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import { buildContactsCsv, processContactsImportFile } from "../domain/contacts-import";
import { ContactDeleteModal } from "../components/ContactDeleteModal";
import { ContactFormModal, type ContactFormValues } from "../components/ContactFormModal";
import { ContactsImportModal } from "../components/ContactsImportModal";
import { ContactsTable } from "../components/ContactsTable";
import { useContactsCatalog } from "../hooks/use-contacts-catalog";
import type { ClientFinancialSnapshot } from "../adapters/contacts.adapter";

const DEFAULT_FORM_VALUES: ContactFormValues = {
  nombreRazonSocial: "",
  identificador: "",
  tipoCliente: "autonomo",
  email: "",
  telefono: "",
  direccion: "",
  codigoPostal: "",
  ciudad: "",
  provincia: "",
  pais: "",
  diaFacturacion: "",
  estado: "recurrente",
};

type FormMode = "create" | "edit";
type DeleteMode = "single" | "bulk";

function formatLimit(limit: number): string {
  if (limit === Number.POSITIVE_INFINITY) return "Ilimitado";
  return String(limit);
}

function toFormValues(contact: ClientFinancialSnapshot): ContactFormValues {
  return {
    nombreRazonSocial: contact.nombreRazonSocial,
    identificador: contact.identificador,
    tipoCliente: contact.tipoCliente,
    email: contact.email ?? "",
    telefono: contact.telefono ?? "",
    direccion: contact.direccion ?? "",
    codigoPostal: contact.codigoPostal ?? "",
    ciudad: contact.ciudad ?? "",
    provincia: contact.provincia ?? "",
    pais: contact.pais ?? "",
    diaFacturacion: contact.diaFacturacion ? String(contact.diaFacturacion) : "",
    estado: contact.estado,
  };
}

function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ContactsPage(): import("react").JSX.Element {
  const catalog = useContactsCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<ContactFormValues>(DEFAULT_FORM_VALUES);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("single");
  const [deleteTarget, setDeleteTarget] = useState<ClientFinancialSnapshot | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Awaited<ReturnType<typeof processContactsImportFile>> | null>(null);
  const [importParseError, setImportParseError] = useState<string | null>(null);

  const usageText = useMemo(() => {
    if (catalog.usageError) return "No se pudo cargar uso de plan";
    if (!catalog.usageBadge) return "Sin uso disponible";
    return `${catalog.usageBadge.current}/${formatLimit(catalog.usageBadge.limit)} contactos (${catalog.usageBadge.planName})`;
  }, [catalog.usageBadge, catalog.usageError]);

  const openCreateModal = () => {
    setFlash(null);
    setFormMode("create");
    setEditContactId(null);
    setFormInitialValues(DEFAULT_FORM_VALUES);
    setFormOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") !== "create") return;

    openCreateModal();
    params.delete("action");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const openEditModal = (contact: ClientFinancialSnapshot) => {
    setFlash(null);
    setFormMode("edit");
    setEditContactId(contact.id);
    setFormInitialValues(toFormValues(contact));
    setFormOpen(true);
  };

  const openSingleDelete = (contact: ClientFinancialSnapshot) => {
    setDeleteMode("single");
    setDeleteTarget(contact);
    setDeleteOpen(true);
  };

  const openBulkDelete = () => {
    setDeleteMode("bulk");
    setDeleteTarget(null);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteOpen(false);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditContactId(null);
  };

  const submitForm = async (values: ContactFormValues) => {
    const payload = {
      nombreRazonSocial: values.nombreRazonSocial.trim(),
      identificador: values.identificador.trim().toUpperCase(),
      tipoCliente: values.tipoCliente,
      email: values.email.trim() || null,
      telefono: values.telefono.trim() || null,
      direccion: values.direccion.trim() || null,
      codigoPostal: values.codigoPostal.trim() || null,
      ciudad: values.ciudad.trim() || null,
      provincia: values.provincia.trim() || null,
      pais: values.pais.trim() || null,
      diaFacturacion: values.diaFacturacion.trim() ? Number.parseInt(values.diaFacturacion.trim(), 10) : null,
      estado: values.estado,
    };

    const success =
      formMode === "create"
        ? await catalog.createContact(payload)
        : editContactId
          ? await catalog.updateContact(editContactId, payload)
          : false;

    if (!success) {
      setFlash("No se pudo guardar el contacto.");
      return;
    }

    setFlash(formMode === "create" ? "Contacto creado correctamente." : "Contacto actualizado correctamente.");
    closeForm();
  };

  const confirmDelete = async () => {
    if (deleteMode === "single" && deleteTarget) {
      const success = await catalog.deleteContact(deleteTarget.id);
      setFlash(success ? "Contacto eliminado correctamente." : "No se pudo eliminar el contacto.");
      closeDelete();
      return;
    }

    const summary = await catalog.deleteSelectedContacts();
    if (!summary) {
      setFlash("No se pudo completar el borrado masivo.");
      closeDelete();
      return;
    }

    if (summary.failed > 0) setFlash(`Se eliminaron ${summary.deleted} contactos y ${summary.failed} fallaron.`);
    else setFlash(`Se eliminaron ${summary.deleted} contactos.`);
    closeDelete();
  };

  const handleImportPickFile = async (file: File) => {
    setImportFileName(file.name);
    setImportParseError(null);
    try {
      const preview = await processContactsImportFile(file);
      setImportPreview(preview);
    } catch (error) {
      setImportPreview(null);
      setImportParseError(error instanceof Error ? error.message : "No se pudo procesar el archivo.");
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    const summary = await catalog.importContacts(importPreview.validRows);
    if (!summary) {
      setFlash("No se pudo completar la importación.");
      return;
    }

    setImportOpen(false);
    setImportFileName(null);
    setImportPreview(null);
    setImportParseError(null);
    setFlash(`${summary.insertedCount} importados, ${summary.skippedDuplicates} duplicados omitidos, ${summary.errorRows.length} con error.`);
  };

  const openImportModal = () => {
    setImportFileName(null);
    setImportPreview(null);
    setImportParseError(null);
    setImportOpen(true);
  };

  const closeImportModal = () => {
    setImportOpen(false);
    setImportFileName(null);
    setImportPreview(null);
    setImportParseError(null);
  };

  const exportCsv = () => {
    if (catalog.contacts.length === 0) {
      setFlash("No hay contactos para exportar.");
      return;
    }

    const csv = buildContactsCsv(
      catalog.contacts.map((contact) => ({
        nombreRazonSocial: contact.nombreRazonSocial,
        identificador: contact.identificador,
        tipoCliente: contact.tipoCliente === "empresa" ? "Empresa" : "Autonomo",
        email: contact.email,
        telefono: contact.telefono,
        direccion: contact.direccion,
        ciudad: contact.ciudad,
        provincia: contact.provincia ?? null,
        codigoPostal: contact.codigoPostal,
        pais: contact.pais,
        diaFacturacion: contact.diaFacturacion,
        estado: contact.estado,
        totalFacturado: contact.totalFacturado,
      })),
    );
    downloadCsv(`contactos_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setFlash("CSV exportado correctamente.");
  };

  const pageSelectAllChecked = catalog.pageContacts.length > 0 && catalog.pageContacts.every((contact) => catalog.selectedIds.has(contact.id));

  return (
    <div className="pilot-grid">
      <section className="pilot-panel">
        <div className="pilot-doc-header">
          <div>
            <h2>Contactos</h2>
            <p>Gestiona tus clientes recurrentes.</p>
            <small className="text-sm opacity-70">{usageText}</small>
          </div>
          <div className="pilot-actions">
            <button type="button" className="pilot-btn" onClick={exportCsv}>
              Exportar contactos
            </button>
            <button type="button" className="pilot-btn" onClick={openImportModal}>
              Importar contactos
            </button>
            <button type="button" className="pilot-btn pilot-btn--primary" onClick={openCreateModal}>
              Nuevo cliente
            </button>
          </div>
        </div>
      </section>

      <section className="pilot-panel">
        <div className="pilot-grid pilot-grid--two">
          <label className="pilot-field">
            Buscar clientes
            <input
              className="pilot-input"
              type="search"
              value={catalog.searchTerm}
              onChange={(event) => catalog.setSearchTerm(event.target.value)}
              placeholder="Buscar clientes..."
            />
          </label>
          <div className="pilot-grid pilot-grid--two">
            <label className="pilot-field">
              Estado
              <select className="pilot-input" value={catalog.statusFilter} onChange={(event) => catalog.setStatusFilter(event.target.value as typeof catalog.statusFilter)}>
                <option value="all">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="recurrente">Recurrente</option>
                <option value="puntual">Puntual</option>
              </select>
            </label>
            <label className="pilot-field">
              Tipo
              <select className="pilot-input" value={catalog.typeFilter} onChange={(event) => catalog.setTypeFilter(event.target.value as typeof catalog.typeFilter)}>
                <option value="all">Todos</option>
                <option value="autonomo">Autónomo</option>
                <option value="empresa">Empresa</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="pilot-panel">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Lista de contactos</h2>
          <span className={`pilot-status ${catalog.contacts.length > 0 ? "pilot-status--ok" : "pilot-status--warn"}`}>{catalog.contacts.length} registros</span>
        </div>

        {flash ? <p className="pilot-info-text">{flash}</p> : null}

        {catalog.selectedCount > 0 ? (
          <div className="pilot-bulk-bar">
            <span>{catalog.selectedCount} seleccionados</span>
            <div className="pilot-inline-actions">
              <button type="button" className="pilot-btn" onClick={catalog.clearSelection}>
                Limpiar selección
              </button>
              <button type="button" className="pilot-btn pilot-btn--danger" onClick={openBulkDelete} disabled={catalog.deleting}>
                Eliminar seleccionados
              </button>
            </div>
          </div>
        ) : null}

        {catalog.error ? <ErrorState title="No se pudo completar la operación" description={catalog.error} onRetry={() => void catalog.refresh()} /> : null}
        {catalog.loading ? <LoadingSkeleton message="Cargando contactos..." /> : null}
        {!catalog.loading && !catalog.error && catalog.pageContacts.length === 0 ? (
          <EmptyState title="No hay contactos en esta vista" description="Crea un nuevo contacto o cambia los filtros." />
        ) : null}

        {!catalog.loading && !catalog.error && catalog.pageContacts.length > 0 ? (
          <>
            <ContactsTable
              contacts={catalog.pageContacts}
              selectedIds={catalog.selectedIds}
              onToggleSelection={catalog.toggleSelected}
              onTogglePageSelection={catalog.togglePageSelection}
              onToggleRecurring={(contactId, currentStatus) => void catalog.toggleContactRecurring(contactId, currentStatus)}
              onEdit={openEditModal}
              onDelete={openSingleDelete}
            />
            <div className="pilot-pagination">
              <button type="button" className="pilot-btn" disabled={catalog.page <= 1} onClick={() => catalog.setPage(catalog.page - 1)}>
                Anterior
              </button>
              <span className="text-sm">
                Página {catalog.page} de {catalog.totalPages}
              </span>
              <button type="button" className="pilot-btn" disabled={catalog.page >= catalog.totalPages} onClick={() => catalog.setPage(catalog.page + 1)}>
                Siguiente
              </button>
              <label className="pilot-inline-actions">
                <input type="checkbox" checked={pageSelectAllChecked} onChange={(event) => catalog.togglePageSelection(event.target.checked)} />
                <span className="text-sm">Seleccionar página</span>
              </label>
            </div>
          </>
        ) : null}
      </section>

      <ContactFormModal
        open={formOpen}
        mode={formMode}
        initialValues={formInitialValues}
        saving={catalog.saving}
        error={catalog.error}
        onClose={closeForm}
        onSubmit={submitForm}
      />

      <ContactDeleteModal
        open={deleteOpen}
        title={deleteMode === "single" ? "Eliminar contacto" : "Eliminar contactos seleccionados"}
        description={deleteMode === "single" ? "Esta acción no se puede deshacer." : "Se eliminarán los contactos seleccionados. Esta acción no se puede deshacer."}
        confirmLabel={deleteMode === "single" ? "Eliminar" : "Eliminar seleccionados"}
        loading={catalog.deleting}
        onCancel={closeDelete}
        onConfirm={() => void confirmDelete()}
      />

      <ContactsImportModal
        open={importOpen}
        fileName={importFileName}
        preview={importPreview}
        parseError={importParseError}
        importing={catalog.importing}
        onClose={closeImportModal}
        onPickFile={handleImportPickFile}
        onConfirmImport={confirmImport}
      />
    </div>
  );
}
