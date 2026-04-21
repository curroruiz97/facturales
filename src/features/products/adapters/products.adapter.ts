import { billingLimitsService } from "../../../services/billing-limits/billing-limits.service";
import { productsRepository, type CreateProductInput, type UpdateProductInput } from "../../../services/repositories/products.repository";
import type { Product } from "../../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";
import type { ProductImportRowResult } from "../domain/products-import";

export interface ProductsUsageBadge {
  current: number;
  limit: number;
  planName: string;
}

export interface BulkDeleteSummary {
  deleted: number;
  failed: number;
  failedIds: string[];
}

export interface ProductsImportSummary {
  insertedCount: number;
  skippedDuplicates: number;
  errorRows: Array<{ row: number; nombre: string; reason: string }>;
}

export interface ProductsAdapter {
  loadProducts(searchTerm?: string): Promise<ServiceResult<Product[]>>;
  createProduct(input: CreateProductInput): Promise<ServiceResult<Product>>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ServiceResult<Product>>;
  deleteProduct(productId: string): Promise<ServiceResult<null>>;
  deleteProducts(productIds: string[]): Promise<ServiceResult<BulkDeleteSummary>>;
  loadUsageBadge(): Promise<ServiceResult<ProductsUsageBadge | null>>;
  importProducts(rows: ProductImportRowResult[]): Promise<ServiceResult<ProductsImportSummary>>;
}

function normalizeReference(reference: string | null | undefined): string {
  return (reference ?? "").trim().toUpperCase();
}

export class DefaultProductsAdapter implements ProductsAdapter {
  async loadProducts(searchTerm = ""): Promise<ServiceResult<Product[]>> {
    return productsRepository.list(searchTerm);
  }

  async loadUsageBadge(): Promise<ServiceResult<ProductsUsageBadge | null>> {
    const usageResult = await billingLimitsService.getUsage();
    if (!usageResult.success) {
      return fail(usageResult.error.message, usageResult.error.code, usageResult.error.cause);
    }

    if (!usageResult.data) {
      return ok(null);
    }

    return ok({
      current: usageResult.data.usage.products,
      limit: usageResult.data.limits.products,
      planName: usageResult.data.planName,
    });
  }

  async createProduct(input: CreateProductInput): Promise<ServiceResult<Product>> {
    const limitResult = await billingLimitsService.canCreateProduct();
    if (!limitResult.success) {
      return fail(limitResult.error.message, limitResult.error.code, limitResult.error.cause);
    }

    if (!limitResult.data.allowed) {
      return fail(limitResult.data.reason ?? "Limite de plan alcanzado", "BILLING_LIMIT_PRODUCTS_BLOCKED");
    }

    return productsRepository.create(input);
  }

  async updateProduct(productId: string, input: UpdateProductInput): Promise<ServiceResult<Product>> {
    return productsRepository.update(productId, input);
  }

  async deleteProduct(productId: string): Promise<ServiceResult<null>> {
    return productsRepository.remove(productId);
  }

  async deleteProducts(productIds: string[]): Promise<ServiceResult<BulkDeleteSummary>> {
    if (productIds.length === 0) {
      return fail("No hay productos seleccionados", "VALIDATION_PRODUCTS_BULK_EMPTY");
    }

    let deleted = 0;
    let failed = 0;
    const failedIds: string[] = [];

    for (const productId of productIds) {
      const result = await productsRepository.remove(productId);
      if (result.success) {
        deleted += 1;
      } else {
        failed += 1;
        failedIds.push(productId);
      }
    }

    return ok({
      deleted,
      failed,
      failedIds,
    });
  }

  async importProducts(rows: ProductImportRowResult[]): Promise<ServiceResult<ProductsImportSummary>> {
    if (rows.length === 0) return fail("No hay filas para importar", "VALIDATION_PRODUCTS_IMPORT_EMPTY");

    const usageResult = await this.loadUsageBadge();
    if (!usageResult.success) return fail(usageResult.error.message, usageResult.error.code, usageResult.error.cause);
    if (usageResult.data && usageResult.data.limit !== Number.POSITIVE_INFINITY) {
      const remaining = usageResult.data.limit - usageResult.data.current;
      if (remaining <= 0) {
        return fail(
          `Has alcanzado el limite de ${usageResult.data.limit} productos del plan ${usageResult.data.planName}.`,
          "BILLING_LIMIT_PRODUCTS_BLOCKED",
        );
      }
      if (rows.length > remaining) {
        return fail(
          `Solo puedes importar ${remaining} producto(s) con tu plan actual (${usageResult.data.current}/${usageResult.data.limit}).`,
          "BILLING_LIMIT_PRODUCTS_IMPORT_EXCEEDED",
        );
      }
    }

    const existingProducts = await productsRepository.list("");
    if (!existingProducts.success) {
      return fail(existingProducts.error.message, existingProducts.error.code, existingProducts.error.cause);
    }

    const knownReferences = new Set(
      existingProducts.data
        .map((product) => normalizeReference(product.referencia))
        .filter((ref) => ref.length > 0),
    );
    let insertedCount = 0;
    let skippedDuplicates = 0;
    const errorRows: Array<{ row: number; nombre: string; reason: string }> = [];

    for (const row of rows) {
      const reference = normalizeReference(row.data.referencia);
      if (reference && knownReferences.has(reference)) {
        skippedDuplicates += 1;
        continue;
      }

      const created = await productsRepository.create(row.data);
      if (created.success) {
        insertedCount += 1;
        if (reference) knownReferences.add(reference);
      } else {
        errorRows.push({
          row: row.rowIndex,
          nombre: row.data.nombre,
          reason: created.error.message,
        });
      }
    }

    return ok({ insertedCount, skippedDuplicates, errorRows });
  }
}

export const productsAdapter = new DefaultProductsAdapter();

