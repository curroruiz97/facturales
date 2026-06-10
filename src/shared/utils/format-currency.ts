const formatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let fmt = formatterCache.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(currency, fmt);
  }
  return fmt;
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  const normalized = /^[A-Z]{3}$/.test((currency || "").toUpperCase())
    ? currency.toUpperCase()
    : "EUR";
  try {
    return getCurrencyFormatter(normalized).format(amount || 0);
  } catch {
    return getCurrencyFormatter("EUR").format(amount || 0);
  }
}

const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function formatEur(value: number): string {
  return eurFormatter.format(value || 0);
}
