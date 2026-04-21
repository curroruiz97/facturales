import { useMemo, useState } from "react";
import type { Product } from "../../../shared/types/domain";
import { EmptyState } from "../../../app/components/states/EmptyState";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import { normalizeProductNumber } from "../domain/product-pricing";
import { buildProductsCsv, processProductsImportFile, type ProductsImportPreview } from "../domain/products-import";
import { useProductsCatalog } from "../hooks/use-products-catalog";
import { ProductDeleteModal } from "../components/ProductDeleteModal";
import { ProductFormModal, type ProductFormValues } from "../components/ProductFormModal";
import { ProductsImportModal } from "../components/ProductsImportModal";
import { ProductsTable } from "../components/ProductsTable";

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

const DEFAULT_FORM_VALUES: ProductFormValues = {
  nombre: "",
  referencia: "",
  descripcion: "",
  precioCompra: "0",
  precioVenta: "0",
  impuesto: "IVA_21",
  descuento: "0",
};

function toFormValues(product: Product): ProductFormValues {
  return {
    nombre: product.nombre,
    referencia: product.referencia ?? "",
    descripcion: product.descripcion ?? "",
    precioCompra: String(product.precioCompra ?? 0),
    precioVenta: String(product.precioVenta),
    impuesto: product.impuesto || "IVA_21",
    descuento: String(product.descuento ?? 0),
  };
}

function formatLimit(limit: number): string {
  if (limit === Number.POSITIVE_INFINITY) return "Ilimitado";
  return String(limit);
}

type FormMode = "create" | "edit";
type DeleteMode = "single" | "bulk";

export function ProductsPage(): import("react").JSX.Element {
  const catalog = useProductsCatalog();
  const [flash, setFlash] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<ProductFormValues>(DEFAULT_FORM_VALUES);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("single");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ProductsImportPreview | null>(null);
  const [importParseError, setImportParseError] = useState<string | null>(null);

  const usageText = useMemo(() => {
    if (catalog.usageError) return "No se pudo cargar uso de plan";
    if (!catalog.usageBadge) return "Sin uso disponible";
    return `${catalog.usageBadge.current}/${formatLimit(catalog.usageBadge.limit)} productos (${catalog.usageBadge.planName})`;
  }, [catalog.usageBadge, catalog.usageError]);

  const openCreateModal = () => {
    setFlash(null);
    setFormMode("create");
    setEditProductId(null);
    setFormInitialValues(DEFAULT_FORM_VALUES);
    setFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setFlash(null);
    setFormMode("edit");
    setEditProductId(product.id);
    setFormInitialValues(toFormValues(product));
    setFormOpen(true);
  };

  const openSingleDelete = (product: Product) => {
    setDeleteMode("single");
    setDeleteTarget(product);
    setDeleteOpen(true);
  };

  const openBulkDelete = () => {
    setDeleteMode("bulk");
    setDeleteTarget(null);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditProductId(null);
  };

  const submitForm = async (values: ProductFormValues) => {
    const payload = {
      nombre: values.nombre,
      referencia: values.referencia || null,
      descripcion: values.descripcion || null,
      precioCompra: normalizeProductNumber(values.precioCompra, 0),
      precioVenta: normalizeProductNumber(values.precioVenta, 0),
      impuesto: values.impuesto || "IVA_21",
      descuento: normalizeProductNumber(values.descuento, 0),
    };

    const success =
      formMode === "create"
        ? await catalog.createProduct(payload)
        : editProductId
          ? await catalog.updateProduct(editProductId, payload)
          : false;

    if (!success) {
      setFlash("No se pudo guardar el producto.");
      return;
    }

    setFlash(formMode === "create" ? "Producto creado correctamente." : "Producto actualizado correctamente.");
    closeForm();
  };

  const confirmDelete = async () => {
    if (deleteMode === "single" && deleteTarget) {
      const success = await catalog.deleteProduct(deleteTarget.id);
      if (success) {
        setFlash("Producto eliminado correctamente.");
      } else {
        setFlash("No se pudo eliminar el producto.");
      }
      closeDelete();
      return;
    }

    const summary = await catalog.deleteSelectedProducts();
    if (!summary) {
      setFlash("No se pudo completar el borrado masivo.");
      closeDelete();
      return;
    }

    if (summary.failed > 0) {
      setFlash(`Se eliminaron ${summary.deleted} productos y ${summary.failed} fallaron.`);
    } else {
      setFlash(`Se eliminaron ${summary.deleted} productos.`);
    }
    closeDelete();
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

  const handleImportPickFile = async (file: File) => {
    setImportFileName(file.name);
    setImportParseError(null);
    try {
      const preview = await processProductsImportFile(file);
      setImportPreview(preview);
    } catch (error) {
      setImportPreview(null);
      setImportParseError(error instanceof Error ? error.message : "No se pudo procesar el archivo.");
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    const summary = await catalog.importProducts(importPreview.validRows);
    if (!summary) {
      setFlash("No se pudo completar la importación.");
      return;
    }

    closeImportModal();
    setFlash(
      `${summary.insertedCount} importados, ${summary.skippedDuplicates} duplicados omitidos, ${summary.errorRows.length} con error.`,
    );
  };

  const exportCsv = () => {
    if (catalog.products.length === 0) {
      setFlash("No hay productos para exportar.");
      return;
    }

    const csv = buildProductsCsv(
      catalog.products.map((product) => ({
        nombre: product.nombre,
        referencia: product.referencia,
        descripcion: product.descripcion,
        precioCompra: product.precioCompra,
        precioVenta: product.precioVenta,
        impuesto: product.impuesto,
        descuento: product.descuento,
      })),
    );
    downloadCsv(`productos_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setFlash("CSV exportado correctamente.");
  };

  const pageSelectAllChecked = catalog.pageProducts.length > 0 && catalog.pageProducts.every((product) => catalog.selectedIds.has(product.id));

  return (
    <div className="pilot-grid">
      <section className="pilot-panel">
        <div className="pilot-doc-header">
          <div>
            <h2>Productos</h2>
            <p>Gestiona tu catálogo de productos y servicios.</p>
            <small className="text-sm opacity-70">{usageText}</small>
          </div>
          <div className="pilot-actions">
            <button type="button" className="pilot-btn" onClick={exportCsv}>
              Exportar productos
            </button>
            <button type="button" className="pilot-btn" onClick={openImportModal}>
              Importar productos
            </button>
            <button type="button" className="pilot-btn pilot-btn--primary" onClick={openCreateModal}>
              Nuevo producto
            </button>
          </div>
        </div>
      </section>

      <section className="pilot-panel">
        <label className="pilot-field">
          Buscar productos
          <input
            className="pilot-input"
            type="search"
            value={catalog.searchTerm}
            onChange={(event) => catalog.setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre o referencia..."
          />
        </label>
      </section>

      <section className="pilot-panel">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Lista de productos</h2>
          <span className={`pilot-status ${catalog.products.length > 0 ? "pilot-status--ok" : "pilot-status--warn"}`}>
            {catalog.products.length} registros
          </span>
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
        {catalog.loading ? <LoadingSkeleton message="Cargando productos..." /> : null}
        {!catalog.loading && !catalog.error && catalog.pageProducts.length === 0 ? (
          <EmptyState title="No hay productos en esta vista" description="Prueba con otro filtro o crea un nuevo producto." />
        ) : null}

        {!catalog.loading && !catalog.error && catalog.pageProducts.length > 0 ? (
          <>
            <ProductsTable
              products={catalog.pageProducts}
              selectedIds={catalog.selectedIds}
              onToggleSelection={catalog.toggleSelected}
              onTogglePageSelection={catalog.togglePageSelection}
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

      <ProductFormModal
        open={formOpen}
        mode={formMode}
        initialValues={formInitialValues}
        saving={catalog.saving}
        error={catalog.error}
        onClose={closeForm}
        onSubmit={submitForm}
      />

      <ProductDeleteModal
        open={deleteOpen}
        title={deleteMode === "single" ? "Eliminar producto" : "Eliminar productos seleccionados"}
        description={
          deleteMode === "single"
            ? "Esta acción no se puede deshacer."
            : "Se eliminarán los productos seleccionados. Esta acción no se puede deshacer."
        }
        confirmLabel={deleteMode === "single" ? "Eliminar" : "Eliminar seleccionados"}
        loading={catalog.deleting}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />

      <ProductsImportModal
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
