/**
 * Helper de cálculo del desglose de un gasto/transacción a partir del TOTAL pagado
 * y los porcentajes de IVA e IRPF.
 *
 * Convención (ya consolidada en la app):
 * - `transaccion.importe` representa el TOTAL pagado al proveedor
 *   (con IVA sumado y, si aplica, IRPF retenido restado).
 * - El sistema fiscal típico de un autónomo en España:
 *     total = base + (base × iva%) − (base × irpf%)
 *           = base × (1 + iva% − irpf%)
 *   por lo que despejamos:
 *     base = total / (1 + iva%/100 − irpf%/100)
 *
 * Devolvemos floats sin redondear: el redondeo se hace solo en la UI con
 * `Intl.NumberFormat` para no perder céntimos al agregar muchos gastos.
 */

export interface ExpenseBreakdown {
  /** Base imponible (total sin impuestos). */
  base: number;
  /** Importe de IVA en € (lo que pagaste de IVA). */
  cuotaIva: number;
  /** Importe de IRPF retenido en €. */
  cuotaIrpf: number;
  /** Total pagado (idéntico al input). */
  total: number;
}

const EMPTY: ExpenseBreakdown = { base: 0, cuotaIva: 0, cuotaIrpf: 0, total: 0 };

export function calculateExpenseBreakdown(
  total: number,
  ivaPct: number | null,
  irpfPct: number | null,
): ExpenseBreakdown {
  if (!Number.isFinite(total) || total <= 0) return { ...EMPTY };

  const iva = ivaPct !== null && Number.isFinite(ivaPct) ? ivaPct : 0;
  const irpf = irpfPct !== null && Number.isFinite(irpfPct) ? irpfPct : 0;

  const divisor = 1 + iva / 100 - irpf / 100;

  // Entrada absurda (ej. IRPF 100% sin IVA → divisor 0 o negativo). Degradamos
  // a "no se puede calcular base" para evitar divisiones por cero o números absurdos.
  if (divisor <= 0) {
    return { base: total, cuotaIva: 0, cuotaIrpf: 0, total };
  }

  // Sin IVA ni IRPF → base = total y cuotas a 0.
  if (iva === 0 && irpf === 0) {
    return { base: total, cuotaIva: 0, cuotaIrpf: 0, total };
  }

  const base = total / divisor;
  const cuotaIva = (base * iva) / 100;
  const cuotaIrpf = (base * irpf) / 100;

  return { base, cuotaIva, cuotaIrpf, total };
}
