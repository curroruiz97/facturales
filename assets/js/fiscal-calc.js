/**
 * Fiscal Calculation Helpers
 * Funciones puras de cálculo fiscal (sin side-effects)
 */

const QUARTER_MONTHS = {
  1: { start: '01-01', end: '03-31', label: '1er Trimestre (Ene-Mar)' , short: 'T1 (Ene-Mar)' },
  2: { start: '04-01', end: '06-30', label: '2º Trimestre (Abr-Jun)' , short: 'T2 (Abr-Jun)' },
  3: { start: '07-01', end: '09-30', label: '3er Trimestre (Jul-Sep)', short: 'T3 (Jul-Sep)' },
  4: { start: '10-01', end: '12-31', label: '4º Trimestre (Oct-Dic)' , short: 'T4 (Oct-Dic)' }
};

function getQuarterRange(year, quarter) {
  var q = QUARTER_MONTHS[quarter];
  if (!q) return null;
  return {
    start: year + '-' + q.start,
    end: year + '-' + q.end,
    label: q.label,
    short: q.short
  };
}

function getYearRange(year) {
  return { start: year + '-01-01', end: year + '-12-31' };
}

function getYTDRange(year, quarter) {
  var q = QUARTER_MONTHS[quarter];
  if (!q) return getYearRange(year);
  return { start: year + '-01-01', end: year + '-' + q.end };
}

function getCurrentQuarter() {
  var m = new Date().getMonth();
  if (m < 3) return 1;
  if (m < 6) return 2;
  if (m < 9) return 3;
  return 4;
}

// ── Cálculos sobre facturas emitidas ──

function calcTotalFacturado(invoices) {
  var total = 0;
  invoices.forEach(function (inv) {
    var sd = inv.invoice_data && inv.invoice_data.summary;
    total += sd && sd.taxBase != null ? parseFloat(sd.taxBase) : parseFloat(inv.subtotal) || 0;
  });
  return total;
}

function calcIVARepercutido(invoices) {
  var total = 0;
  invoices.forEach(function (inv) {
    var sd = inv.invoice_data && inv.invoice_data.summary;
    total += sd && sd.taxAmount != null ? parseFloat(sd.taxAmount) : parseFloat(inv.tax_amount) || 0;
  });
  return total;
}

function calcIRPFRetenido(invoices) {
  var total = 0;
  invoices.forEach(function (inv) {
    var sd = inv.invoice_data && inv.invoice_data.summary;
    total += sd && sd.retentionAmount != null ? parseFloat(sd.retentionAmount) : 0;
  });
  return total;
}

function calcResumenPagos(invoices) {
  var pagadasCount = 0, pagadasImporte = 0;
  var pendientesCount = 0, pendientesImporte = 0;
  var totalBruto = 0;

  invoices.forEach(function (inv) {
    var amount = parseFloat(inv.total_amount) || 0;
    totalBruto += amount;
    if (inv.is_paid) {
      pagadasCount++;
      pagadasImporte += amount;
    } else {
      pendientesCount++;
      pendientesImporte += amount;
    }
  });

  return {
    pagadasCount: pagadasCount,
    pagadasImporte: pagadasImporte,
    pendientesCount: pendientesCount,
    pendientesImporte: pendientesImporte,
    totalBruto: totalBruto
  };
}

// ── Cálculos sobre gastos ──

function calcIVASoportado(gastos) {
  var total = 0;
  gastos.forEach(function (g) {
    var importe = parseFloat(g.importe) || 0;
    var ivaPct = parseFloat(g.iva_porcentaje) || 0;
    if (ivaPct > 0 && importe > 0) {
      var base = importe / (1 + ivaPct / 100);
      total += importe - base;
    }
  });
  return total;
}

function calcGastosBase(gastos) {
  var total = 0;
  gastos.forEach(function (g) {
    var importe = parseFloat(g.importe) || 0;
    var ivaPct = parseFloat(g.iva_porcentaje) || 0;
    if (ivaPct > 0 && importe > 0) {
      total += importe / (1 + ivaPct / 100);
    } else {
      total += importe;
    }
  });
  return total;
}

// ── Modelo 303 - IVA ──

function calcModelo303(ivaRepercutido, ivaSoportado) {
  var resultado = ivaRepercutido - ivaSoportado;
  return {
    repercutido: ivaRepercutido,
    soportado: ivaSoportado,
    resultado: resultado,
    label: resultado >= 0 ? 'A ingresar:' : 'A compensar:'
  };
}

// ── Modelo 130 - IRPF (Autónomo) ──

function calcModelo130(ingresosBase, gastosBase, retenciones) {
  var beneficioNeto = ingresosBase - gastosBase;
  return {
    ingresos: ingresosBase,
    gastos: gastosBase,
    retenciones: retenciones,
    beneficioNeto: beneficioNeto
  };
}

// ── Impuesto de Sociedades (IS) ──

var TIPOS_GRAVAMEN_IS = {
  general:              { nombre: 'General',                          tipo: 'fijo', tasa: 25 },
  nueva_creacion:       { nombre: 'Entidades de nueva creación',     tipo: 'fijo', tasa: 15 },
  micropyme:            { nombre: 'Micropymes (<1M)',                 tipo: 'tramos', tramos: [{ hasta: 50000, tasa: 17 }, { hasta: Infinity, tasa: 20 }] },
  reducida_dimension:   { nombre: 'Entidades reducida dimensión',    tipo: 'fijo', tasa: 25 },
  cooperativa:          { nombre: 'Cooperativas protegidas',         tipo: 'fijo', tasa: 20 },
  sin_fines_lucrativos: { nombre: 'Entidades sin fines lucrativos',  tipo: 'fijo', tasa: 10 },
  fondos_sicav:         { nombre: 'Fondos / SICAV',                  tipo: 'fijo', tasa: 1 },
  socimi:               { nombre: 'SOCIMI / Fondos de pensiones',    tipo: 'fijo', tasa: 0 }
};

function getTiposGravamenIS() {
  var arr = [];
  for (var key in TIPOS_GRAVAMEN_IS) {
    arr.push({ key: key, nombre: TIPOS_GRAVAMEN_IS[key].nombre });
  }
  return arr;
}

function aplicarTipoGravamen(baseImponible, tipoKey) {
  var cfg = TIPOS_GRAVAMEN_IS[tipoKey] || TIPOS_GRAVAMEN_IS.general;
  if (cfg.tipo === 'fijo') {
    return baseImponible * (cfg.tasa / 100);
  }
  // Tramos
  var cuota = 0;
  var restante = baseImponible;
  var anterior = 0;
  for (var i = 0; i < cfg.tramos.length; i++) {
    var tramo = cfg.tramos[i];
    var porcion = Math.min(restante, tramo.hasta - anterior);
    if (porcion <= 0) break;
    cuota += porcion * (tramo.tasa / 100);
    restante -= porcion;
    anterior = tramo.hasta;
  }
  return cuota;
}

function getTipoGravamenLabel(tipoKey) {
  var cfg = TIPOS_GRAVAMEN_IS[tipoKey];
  if (!cfg) return 'General (25%)';
  if (cfg.tipo === 'fijo') return cfg.nombre + ' (' + cfg.tasa + '%)';
  return cfg.nombre + ' (por tramos)';
}

function calcIS(settings) {
  var resultadoContable = parseFloat(settings.resultadoContable) || 0;
  var ajustes = parseFloat(settings.ajustes_extracontables) || 0;
  var compensacion = parseFloat(settings.compensacion_bin) || 0;
  var deducciones = parseFloat(settings.deducciones_bonificaciones) || 0;
  var retPagos = parseFloat(settings.retenciones_pagos_cuenta) || 0;
  var tipoKey = settings.tipo_gravamen || 'general';

  var baseImponiblePrevia = resultadoContable + ajustes;
  var baseImponible = Math.max(0, baseImponiblePrevia - compensacion);
  var cuotaIntegra = aplicarTipoGravamen(baseImponible, tipoKey);
  var cuotaLiquida = Math.max(0, cuotaIntegra - deducciones);
  var cuotaDiferencial = cuotaLiquida - retPagos;

  return {
    resultadoContable: resultadoContable,
    ajustes: ajustes,
    baseImponiblePrevia: baseImponiblePrevia,
    compensacion: compensacion,
    baseImponible: baseImponible,
    tipoGravamen: tipoKey,
    tipoGravamenLabel: getTipoGravamenLabel(tipoKey),
    cuotaIntegra: cuotaIntegra,
    deducciones: deducciones,
    cuotaLiquida: cuotaLiquida,
    retPagos: retPagos,
    cuotaDiferencial: cuotaDiferencial,
    label: cuotaDiferencial >= 0 ? 'A ingresar:' : 'A devolver/compensar:'
  };
}

// ── Exportar ──

window.fiscalCalc = {
  QUARTER_MONTHS: QUARTER_MONTHS,
  getQuarterRange: getQuarterRange,
  getYearRange: getYearRange,
  getYTDRange: getYTDRange,
  getCurrentQuarter: getCurrentQuarter,
  calcTotalFacturado: calcTotalFacturado,
  calcIVARepercutido: calcIVARepercutido,
  calcIRPFRetenido: calcIRPFRetenido,
  calcResumenPagos: calcResumenPagos,
  calcIVASoportado: calcIVASoportado,
  calcGastosBase: calcGastosBase,
  calcModelo303: calcModelo303,
  calcModelo130: calcModelo130,
  calcIS: calcIS,
  getTiposGravamenIS: getTiposGravamenIS,
  aplicarTipoGravamen: aplicarTipoGravamen,
  getTipoGravamenLabel: getTipoGravamenLabel
};

console.log('✅ Fiscal calc module loaded');
