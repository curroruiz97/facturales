import { useEffect, useMemo, useState } from "react";
import type { Product } from "../../../shared/types/domain";
import type { CreateProductInput, UpdateProductInput } from "../../../services/repositories/products.repository";
import {
  productsAdapter,
  type BulkDeleteSummary,
  type ProductsImportSummary,
  type ProductsUsageBadge,
} from "../adapters/products.adapter";
import type { ProductImportRowResult } from "../domain/products-import";

const SEARCH_DEBOUNCE_MS = 280;
export const PRODUCT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type ProductPageSize = typeof PRODUCT_PAGE_SIZE_OPTIONS[number];
const DEFAULT_PAGE_SIZE: ProductPageSize = 10;

export interface UseProductsCatalogResult {
  products: Product[];
  pageProducts: Product[];
  recentProducts: Product[];
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  importing: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  usageBadge: ProductsUsageBadge | null;
  usageError: string | null;
  error: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: ProductPageSize;
  setPageSize: (value: ProductPageSize) => void;
  setPage: (value: number) => void;
  selectedIds: Set<string>;
  selectedCount: number;
  isSelected: (productId: string) => boolean;
  toggleSelected: (productId: string, checked: boolean) => void;
  togglePageSelection: (checked: boolean, productIds?: string[]) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
  createProduct: (input: CreateProductInput) => Promise<boolean>;
  updateProduct: (productId: string, input: UpdateProductInput) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  deleteSelectedProducts: () => Promise<BulkDeleteSummary | null>;
  importProducts: (rows: ProductImportRowResult[]) => Promise<ProductsImportSummary | null>;
}

export function useProductsCatalog(initialPageSize: ProductPageSize = DEFAULT_PAGE_SIZE): UseProductsCatalogResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [usageBadge, setUsageBadge] = useState<ProductsUsageBadge | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ProductPageSize>(initialPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalPages = useMemo(() => {
    const pages = Math.ceil(products.length / pageSize);
    return pages <= 0 ? 1 : pages;
  }, [pageSize, products.length]);

  const pageProducts = useMemo(() => {
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [page, pageSize, products, totalPages]);

  const recentProducts = useMemo(() => products.slice(0, 8), [products]);
  const selectedCount = selectedIds.size;

  const loadUsage = async () => {
    const usageResult = await productsAdapter.loadUsageBadge();
    if (!usageResult.success) {
      setUsageBadge(null);
      setUsageError(usageResult.error.message);
      return;
    }
    setUsageBadge(usageResult.data);
    setUsageError(null);
  };

  const loadProducts = async (query = "") => {
    setLoading(true);
    const result = await productsAdapter.loadProducts(query);
    if (!result.success) {
      setProducts([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setProducts(result.data);
    setError(null);
    setLoading(false);
  };

  const refresh = async () => {
    await Promise.all([loadProducts(searchTerm), loadUsage()]);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSelectedIds(new Set());
      void loadProducts(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);

  // Resetear página y selección al cambiar tamaño de página.
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [pageSize]);

  const createProduct = async (input: CreateProductInput): Promise<boolean> => {
    setSaving(true);
    const result = await productsAdapter.createProduct(input);
    setSaving(false);

    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    await refresh();
    return true;
  };

  const updateProduct = async (productId: string, input: UpdateProductInput): Promise<boolean> => {
    setSaving(true);
    const result = await productsAdapter.updateProduct(productId, input);
    setSaving(false);

    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    await refresh();
    return true;
  };

  const deleteProduct = async (productId: string): Promise<boolean> => {
    setDeleting(true);
    const result = await productsAdapter.deleteProduct(productId);
    setDeleting(false);

    if (!result.success) {
      setError(result.error.message);
      return false;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    await refresh();
    return true;
  };

  const deleteSelectedProducts = async (): Promise<BulkDeleteSummary | null> => {
    const ids = Array.from(selectedIds);
    setDeleting(true);
    const result = await productsAdapter.deleteProducts(ids);
    setDeleting(false);

    if (!result.success) {
      setError(result.error.message);
      return null;
    }

    setSelectedIds(new Set());
    await refresh();
    return result.data;
  };

  const importProducts = async (rows: ProductImportRowResult[]): Promise<ProductsImportSummary | null> => {
    setImporting(true);
    const result = await productsAdapter.importProducts(rows);
    setImporting(false);

    if (!result.success) {
      setError(result.error.message);
      return null;
    }

    await refresh();
    return result.data;
  };

  const isSelected = (productId: string) => selectedIds.has(productId);

  const toggleSelected = (productId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const togglePageSelection = (checked: boolean, productIds?: string[]) => {
    // Aceptamos los IDs explícitamente del componente para evitar capturar un
    // `pageProducts` stale (mismo bug que en Contactos).
    const ids = productIds ?? pageProducts.map((product) => product.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return {
    products,
    pageProducts,
    recentProducts,
    loading,
    saving,
    deleting,
    importing,
    searchTerm,
    setSearchTerm,
    usageBadge,
    usageError,
    error,
    page,
    totalPages,
    totalItems: products.length,
    pageSize,
    setPageSize,
    setPage,
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelected,
    togglePageSelection,
    clearSelection,
    refresh,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteSelectedProducts,
    importProducts,
  };
}

