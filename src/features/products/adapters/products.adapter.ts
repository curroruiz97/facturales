import { billingLimitsService } from "../../../services/billing-limits/billing-limits.service";
import { productsRepository, type CreateProductInput, type UpdateProductInput } from "../../../services/repositories/products.repository";
import type { Product } from "../../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../../shared/types/service-result";

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

export interface ProductsAdapter {
  loadProducts(searchTerm?: string): Promise<ServiceResult<Product[]>>;
  createProduct(input: CreateProductInput): Promise<ServiceResult<Product>>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ServiceResult<Product>>;
  deleteProduct(productId: string): Promise<ServiceResult<null>>;
  deleteProducts(productIds: string[]): Promise<ServiceResult<BulkDeleteSummary>>;
  loadUsageBadge(): Promise<ServiceResult<ProductsUsageBadge | null>>;
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
}

export const productsAdapter = new DefaultProductsAdapter();

