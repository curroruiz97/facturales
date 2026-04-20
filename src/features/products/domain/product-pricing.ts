export interface ProductTaxOption {
  code: string;
  label: string;
  rate: number;
}

const PRODUCT_TAX_RATE_BY_CODE: Record<string, number> = {
  IVA_21: 21,
  IVA_10: 10,
  IVA_4: 4,
  IVA_0: 0,
  IGIC_20: 20,
  IGIC_13_5: 13.5,
  "IGIC_13.5": 13.5,
  IGIC_9_5: 9.5,
  "IGIC_9.5": 9.5,
  IGIC_7: 7,
  IGIC_3: 3,
  IGIC_0: 0,
  IPSI_10: 10,
  IPSI_8: 8,
  IPSI_4: 4,
  IPSI_2: 2,
  IPSI_1: 1,
  IPSI_0_5: 0.5,
  "IPSI_0.5": 0.5,
  EXENTO: 0,
};

export const PRODUCT_TAX_OPTIONS: ProductTaxOption[] = [
  { code: "IVA_21", label: "IVA 21%", rate: 21 },
  { code: "IVA_10", label: "IVA 10%", rate: 10 },
  { code: "IVA_4", label: "IVA 4%", rate: 4 },
  { code: "IVA_0", label: "IVA 0%", rate: 0 },
  { code: "IGIC_20", label: "IGIC 20%", rate: 20 },
  { code: "IGIC_13.5", label: "IGIC 13,5%", rate: 13.5 },
  { code: "IGIC_9.5", label: "IGIC 9,5%", rate: 9.5 },
  { code: "IGIC_7", label: "IGIC 7%", rate: 7 },
  { code: "IGIC_3", label: "IGIC 3%", rate: 3 },
  { code: "IGIC_0", label: "IGIC 0%", rate: 0 },
  { code: "IPSI_10", label: "IPSI 10%", rate: 10 },
  { code: "IPSI_8", label: "IPSI 8%", rate: 8 },
  { code: "IPSI_4", label: "IPSI 4%", rate: 4 },
  { code: "IPSI_2", label: "IPSI 2%", rate: 2 },
  { code: "IPSI_1", label: "IPSI 1%", rate: 1 },
  { code: "IPSI_0.5", label: "IPSI 0,5%", rate: 0.5 },
  { code: "EXENTO", label: "Exento", rate: 0 },
];

export function normalizeProductNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveProductTaxRate(taxCode: string | null | undefined): number {
  if (!taxCode) return 0;
  if (Object.prototype.hasOwnProperty.call(PRODUCT_TAX_RATE_BY_CODE, taxCode)) {
    return PRODUCT_TAX_RATE_BY_CODE[taxCode];
  }
  const numericRate = normalizeProductNumber(taxCode, 0);
  return numericRate >= 0 ? numericRate : 0;
}

export function calculateProductPvp(precioVenta: number, taxCode: string | null | undefined): number {
  const normalizedSalePrice = normalizeProductNumber(precioVenta, 0);
  const taxRate = resolveProductTaxRate(taxCode);
  return normalizedSalePrice * (1 + taxRate / 100);
}

export function calculateProductMargin(precioCompra: number | null | undefined, precioVenta: number): number | null {
  const normalizedSalePrice = normalizeProductNumber(precioVenta, 0);
  if (normalizedSalePrice <= 0) {
    return null;
  }

  const normalizedPurchasePrice = normalizeProductNumber(precioCompra, 0);
  return ((normalizedSalePrice - normalizedPurchasePrice) / normalizedSalePrice) * 100;
}

export function formatProductCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

