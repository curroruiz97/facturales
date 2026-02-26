/**
 * Fiscal Page Logic
 * Lógica de la página Resumen Fiscal (fiscal.html)
 */

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function fmtCur(v) {
  return new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', minimumFractionDigits:2, maximumFractionDigits:2 }).format(v || 0);
}

function fmtDate(d) {
  if (!d) return '-';
  return new Intl.DateTimeFormat('es-ES', { year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(d + 'T00:00:00'));
}

// ── Estado global ──
var _fiscalYear = new Date().getFullYear();
var _fiscalQuarter = window.fiscalCalc.getCurrentQuarter();
var _businessType = null; // 'autonomo' | 'empresa'
var _isSettingsCache = {};
var _currentInvoices = [];

// ── Inicialización ──
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(initFiscalPage, 600);
});

async function initFiscalPage() {
  try {
    // Obtener business_type
    var supabase = window.supabaseClient;
    if (!supabase) { console.error('Supabase no disponible'); return; }
    var { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (window.getBusinessInfo) {
      var bi = await window.getBusinessInfo(user.id);
      if (bi && bi.business_type) _businessType = bi.business_type;
    }

    applyBusinessType();
    renderYearSelector();
    renderQuarterSelector();
    populateISGravamenSelect();
    bindISInputs();
    bindDropdowns();
    loadFiscalData();
  } catch (e) {
    console.error('Error init fiscal page:', e);
  }
}

// ── Business type UI toggle ──
function applyBusinessType() {
  var irpfCard = document.getElementById('kpi-irpf-card');
  var m130 = document.getElementById('bloque-modelo130');
  var isBlock = document.getElementById('bloque-is');

  if (_businessType === 'empresa') {
    if (irpfCard) irpfCard.classList.add('hidden');
    if (m130) m130.classList.add('hidden');
    if (isBlock) isBlock.classList.remove('hidden');
  } else {
    if (irpfCard) irpfCard.classList.remove('hidden');
    if (m130) m130.classList.remove('hidden');
    if (isBlock) isBlock.classList.add('hidden');
  }
}

// ── Selectores de año y trimestre ──
function renderYearSelector() {
  var list = document.getElementById('fiscal-year-list');
  if (!list) return;
  var html = '';
  var currentYear = new Date().getFullYear();
  for (var y = currentYear; y >= currentYear - 3; y--) {
    html += '<li onclick="window.setFiscalYear(' + y + ')" class="cursor-pointer px-4 py-2 text-sm font-medium text-bgray-900 hover:bg-bgray-100 dark:text-white dark:hover:bg-darkblack-400">' + y + '</li>';
  }
  list.innerHTML = html;
  document.getElementById('fiscal-year-label').textContent = _fiscalYear;
}

function renderQuarterSelector() {
  updateQuarterLabel();
}

function updateQuarterLabel() {
  var label = document.getElementById('fiscal-quarter-label');
  if (_fiscalQuarter === 0) {
    label.textContent = 'Año Natural';
  } else {
    var range = window.fiscalCalc.getQuarterRange(_fiscalYear, _fiscalQuarter);
    label.textContent = range ? range.short : 'T' + _fiscalQuarter;
  }
  updateSubtitle();
}

function updateSubtitle() {
  var el = document.getElementById('fiscal-subtitle');
  if (!el) return;
  if (_fiscalQuarter === 0) {
    el.textContent = 'Año Natural ' + _fiscalYear;
  } else {
    var range = window.fiscalCalc.getQuarterRange(_fiscalYear, _fiscalQuarter);
    el.textContent = (range ? range.label : 'Trimestre ' + _fiscalQuarter) + ' ' + _fiscalYear;
  }
}

window.setFiscalYear = function (y) {
  _fiscalYear = y;
  document.getElementById('fiscal-year-label').textContent = y;
  closeAllFiscalDropdowns();
  updateSubtitle();
  loadFiscalData();
};

window.setFiscalQuarter = function (q) {
  _fiscalQuarter = q;
  updateQuarterLabel();
  closeAllFiscalDropdowns();
  loadFiscalData();
};

function bindDropdowns() {
  document.getElementById('fiscal-year-btn').addEventListener('click', function () {
    document.getElementById('fiscal-year-dropdown').classList.toggle('hidden');
    document.getElementById('fiscal-quarter-dropdown').classList.add('hidden');
  });
  document.getElementById('fiscal-quarter-btn').addEventListener('click', function () {
    document.getElementById('fiscal-quarter-dropdown').classList.toggle('hidden');
    document.getElementById('fiscal-year-dropdown').classList.add('hidden');
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#fiscal-year-btn') && !e.target.closest('#fiscal-year-dropdown')) {
      document.getElementById('fiscal-year-dropdown').classList.add('hidden');
    }
    if (!e.target.closest('#fiscal-quarter-btn') && !e.target.closest('#fiscal-quarter-dropdown')) {
      document.getElementById('fiscal-quarter-dropdown').classList.add('hidden');
    }
  });
}

function closeAllFiscalDropdowns() {
  document.getElementById('fiscal-year-dropdown').classList.add('hidden');
  document.getElementById('fiscal-quarter-dropdown').classList.add('hidden');
}

// ── IS: poblar select tipo gravamen ──
function populateISGravamenSelect() {
  var sel = document.getElementById('is-tipo-gravamen');
  if (!sel) return;
  var tipos = window.fiscalCalc.getTiposGravamenIS();
  sel.innerHTML = tipos.map(function (t) {
    return '<option value="' + t.key + '">' + escapeHtml(t.nombre) + '</option>';
  }).join('');
}

// ── IS: bind inputs ──
function bindISInputs() {
  var ids = ['is-ajustes', 'is-compensacion', 'is-deducciones', 'is-retenciones', 'is-tipo-gravamen'];
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', function () { recalcIS(); debounceSaveIS(); });
      el.addEventListener('input', function () { recalcIS(); });
    }
  });
}

var _saveISTimer = null;
function debounceSaveIS() {
  clearTimeout(_saveISTimer);
  _saveISTimer = setTimeout(saveISSettings, 800);
}

// ── Cargar datos ──
async function loadFiscalData() {
  try {
    var supabase = window.supabaseClient;
    if (!supabase) return;

    var dateRange;
    if (_fiscalQuarter === 0) {
      dateRange = window.fiscalCalc.getYearRange(_fiscalYear);
    } else {
      dateRange = window.fiscalCalc.getQuarterRange(_fiscalYear, _fiscalQuarter);
    }
    if (!dateRange) return;

    // Queries en paralelo
    var invoiceQuery = supabase.from('invoices')
      .select('id, invoice_number, client_name, issue_date, subtotal, tax_amount, total_amount, is_paid, invoice_data')
      .eq('status', 'issued')
      .gte('issue_date', dateRange.start)
      .lte('issue_date', dateRange.end)
      .order('issue_date', { ascending: false });

    var gastosQuery = supabase.from('transacciones')
      .select('id, importe, iva_porcentaje, irpf_porcentaje, fecha')
      .eq('tipo', 'gasto')
      .gte('fecha', dateRange.start)
      .lte('fecha', dateRange.end);

    var promises = [invoiceQuery, gastosQuery];

    // Para IS (empresa): datos anuales + settings
    var needIS = _businessType === 'empresa';
    var ytdRange = window.fiscalCalc.getYTDRange(_fiscalYear, _fiscalQuarter || 4);

    if (needIS) {
      promises.push(
        supabase.from('invoices')
          .select('id, subtotal, invoice_data')
          .eq('status', 'issued')
          .gte('issue_date', ytdRange.start)
          .lte('issue_date', ytdRange.end)
      );
      promises.push(
        supabase.from('transacciones')
          .select('id, importe, iva_porcentaje')
          .eq('tipo', 'gasto')
          .gte('fecha', ytdRange.start)
          .lte('fecha', ytdRange.end)
      );
      promises.push(
        supabase.from('fiscal_is_settings')
          .select('*')
          .eq('year', _fiscalYear)
          .maybeSingle()
      );
    }

    var results = await Promise.all(promises);

    var invoices = (results[0].data || []);
    var gastos = (results[1].data || []);
    _currentInvoices = invoices;

    var yearInvoices = needIS ? (results[2].data || []) : [];
    var yearGastos = needIS ? (results[3].data || []) : [];
    var isSettings = needIS ? (results[4].data || null) : null;

    // Cálculos del periodo seleccionado
    var totalFacturado = window.fiscalCalc.calcTotalFacturado(invoices);
    var ivaRepercutido = window.fiscalCalc.calcIVARepercutido(invoices);
    var irpfRetenido = window.fiscalCalc.calcIRPFRetenido(invoices);
    var resumenPagos = window.fiscalCalc.calcResumenPagos(invoices);
    var ivaSoportado = window.fiscalCalc.calcIVASoportado(gastos);
    var gastosBase = window.fiscalCalc.calcGastosBase(gastos);

    // KPIs
    document.getElementById('kpi-total-facturado').textContent = fmtCur(totalFacturado);
    document.getElementById('kpi-iva-repercutido').textContent = fmtCur(ivaRepercutido);
    document.getElementById('kpi-irpf-retenido').textContent = fmtCur(irpfRetenido);
    document.getElementById('kpi-facturas-emitidas').textContent = invoices.length;

    // Resumen de pagos
    document.getElementById('pagos-pagadas-count').textContent = resumenPagos.pagadasCount;
    document.getElementById('pagos-pagadas-importe').textContent = fmtCur(resumenPagos.pagadasImporte);
    document.getElementById('pagos-pendientes-count').textContent = resumenPagos.pendientesCount;
    document.getElementById('pagos-pendientes-importe').textContent = fmtCur(resumenPagos.pendientesImporte);
    document.getElementById('pagos-total-bruto').textContent = fmtCur(resumenPagos.totalBruto);

    // Modelo 303
    var m303 = window.fiscalCalc.calcModelo303(ivaRepercutido, ivaSoportado);
    document.getElementById('m303-repercutido').textContent = fmtCur(m303.repercutido);
    document.getElementById('m303-soportado').textContent = fmtCur(m303.soportado);
    document.getElementById('m303-resultado').textContent = fmtCur(Math.abs(m303.resultado));
    var m303Label = document.getElementById('m303-label');
    m303Label.textContent = m303.label;
    var m303Color = m303.resultado >= 0 ? 'text-success-300' : 'text-blue-500';
    m303Label.className = 'font-bold ' + m303Color;
    document.getElementById('m303-resultado').className = 'font-bold ' + m303Color;

    // Modelo 130 (autónomo)
    if (_businessType !== 'empresa') {
      var m130 = window.fiscalCalc.calcModelo130(totalFacturado, gastosBase, irpfRetenido);
      document.getElementById('m130-ingresos').textContent = fmtCur(m130.ingresos);
      document.getElementById('m130-gastos').textContent = fmtCur(m130.gastos);
      document.getElementById('m130-retenciones').textContent = fmtCur(m130.retenciones);
      var bColor = m130.beneficioNeto >= 0 ? 'text-success-300' : 'text-red-500';
      var m130benEl = document.getElementById('m130-beneficio');
      m130benEl.textContent = fmtCur(m130.beneficioNeto);
      m130benEl.className = 'font-bold ' + bColor;
    }

    // IS (empresa)
    if (needIS) {
      var ytdIngresosBase = window.fiscalCalc.calcTotalFacturado(yearInvoices);
      var ytdGastosBase = window.fiscalCalc.calcGastosBase(yearGastos);
      var resultadoContable = ytdIngresosBase - ytdGastosBase;

      document.getElementById('is-resultado-contable').textContent = fmtCur(resultadoContable);

      var rangeLabel = _fiscalQuarter === 0
        ? 'Año completo ' + _fiscalYear
        : 'YTD hasta fin del ' + (window.fiscalCalc.getQuarterRange(_fiscalYear, _fiscalQuarter) || {}).label;
      document.getElementById('is-rango-label').textContent = rangeLabel;

      // Restaurar settings guardados
      if (isSettings) {
        document.getElementById('is-ajustes').value = isSettings.ajustes_extracontables || 0;
        document.getElementById('is-compensacion').value = isSettings.compensacion_bin || 0;
        document.getElementById('is-deducciones').value = isSettings.deducciones_bonificaciones || 0;
        document.getElementById('is-retenciones').value = isSettings.retenciones_pagos_cuenta || 0;
        document.getElementById('is-tipo-gravamen').value = isSettings.tipo_gravamen || 'general';
        _isSettingsCache = isSettings;
      } else {
        document.getElementById('is-ajustes').value = 0;
        document.getElementById('is-compensacion').value = 0;
        document.getElementById('is-deducciones').value = 0;
        document.getElementById('is-retenciones').value = 0;
        document.getElementById('is-tipo-gravamen').value = 'general';
        _isSettingsCache = {};
      }

      window._isResultadoContable = resultadoContable;
      recalcIS();
    }

    // Tabla
    renderFiscalTable(invoices);

    // Titulo tabla
    var tituloTabla = document.getElementById('tabla-titulo');
    if (tituloTabla) {
      if (_fiscalQuarter === 0) {
        tituloTabla.textContent = 'Facturas del Año ' + _fiscalYear;
      } else {
        var qr = window.fiscalCalc.getQuarterRange(_fiscalYear, _fiscalQuarter);
        tituloTabla.textContent = 'Facturas del ' + (qr ? qr.label : 'Trimestre');
      }
    }

  } catch (err) {
    console.error('Error loading fiscal data:', err);
    if (window.showToast) window.showToast('Error al cargar datos fiscales', 'error');
  }
}

// ── Recalcular IS desde inputs ──
function recalcIS() {
  var resultadoContable = window._isResultadoContable || 0;
  var settings = {
    resultadoContable: resultadoContable,
    ajustes_extracontables: parseFloat(document.getElementById('is-ajustes').value) || 0,
    compensacion_bin: parseFloat(document.getElementById('is-compensacion').value) || 0,
    deducciones_bonificaciones: parseFloat(document.getElementById('is-deducciones').value) || 0,
    retenciones_pagos_cuenta: parseFloat(document.getElementById('is-retenciones').value) || 0,
    tipo_gravamen: document.getElementById('is-tipo-gravamen').value || 'general'
  };

  var is = window.fiscalCalc.calcIS(settings);

  document.getElementById('is-base-previa').textContent = fmtCur(is.baseImponiblePrevia);
  document.getElementById('is-base-imponible').textContent = fmtCur(is.baseImponible);
  document.getElementById('is-cuota-integra').textContent = fmtCur(is.cuotaIntegra);
  document.getElementById('is-cuota-liquida').textContent = fmtCur(is.cuotaLiquida);

  var diffEl = document.getElementById('is-cuota-diferencial');
  var labelEl = document.getElementById('is-label');
  diffEl.textContent = fmtCur(Math.abs(is.cuotaDiferencial));
  labelEl.textContent = is.label;
  var color = is.cuotaDiferencial >= 0 ? 'text-success-300' : 'text-blue-500';
  diffEl.className = 'font-bold ' + color;
  labelEl.className = 'font-bold ' + color;
}

// ── Guardar settings IS ──
async function saveISSettings() {
  try {
    var supabase = window.supabaseClient;
    if (!supabase) return;
    var { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    var payload = {
      user_id: user.id,
      year: _fiscalYear,
      ajustes_extracontables: parseFloat(document.getElementById('is-ajustes').value) || 0,
      compensacion_bin: parseFloat(document.getElementById('is-compensacion').value) || 0,
      deducciones_bonificaciones: parseFloat(document.getElementById('is-deducciones').value) || 0,
      retenciones_pagos_cuenta: parseFloat(document.getElementById('is-retenciones').value) || 0,
      tipo_gravamen: document.getElementById('is-tipo-gravamen').value || 'general'
    };

    if (_isSettingsCache && _isSettingsCache.id) {
      await supabase.from('fiscal_is_settings').update(payload).eq('id', _isSettingsCache.id);
    } else {
      var { data } = await supabase.from('fiscal_is_settings').upsert(payload, { onConflict: 'user_id,year' }).select().single();
      if (data) _isSettingsCache = data;
    }
  } catch (e) {
    console.error('Error saving IS settings:', e);
  }
}

// ── Tabla de facturas ──
function renderFiscalTable(invoices) {
  var tbody = document.getElementById('fiscal-table-body');
  if (!tbody) return;

  // Determinar si ocultar columna IRPF
  var hasIRPF = false;
  if (_businessType !== 'empresa') {
    invoices.forEach(function (inv) {
      var sd = inv.invoice_data && inv.invoice_data.summary;
      if (sd && sd.retentionAmount && parseFloat(sd.retentionAmount) > 0) hasIRPF = true;
    });
  }
  var irpfHeader = document.getElementById('col-irpf-header');
  if (irpfHeader) {
    irpfHeader.style.display = (_businessType === 'empresa' && !hasIRPF) ? 'none' : '';
  }
  var showIRPF = _businessType !== 'empresa' || hasIRPF;

  if (invoices.length === 0) {
    var cols = showIRPF ? 7 : 6;
    tbody.innerHTML = '<tr><td colspan="' + cols + '" class="py-10 text-center text-sm text-bgray-500 dark:text-bgray-400">No hay facturas emitidas en este periodo</td></tr>';
    return;
  }

  var html = '';
  invoices.forEach(function (inv) {
    var sd = inv.invoice_data && inv.invoice_data.summary;
    var base = sd && sd.taxBase != null ? parseFloat(sd.taxBase) : parseFloat(inv.subtotal) || 0;
    var iva = sd && sd.taxAmount != null ? parseFloat(sd.taxAmount) : parseFloat(inv.tax_amount) || 0;
    var irpf = sd && sd.retentionAmount != null ? parseFloat(sd.retentionAmount) : 0;
    var total = parseFloat(inv.total_amount) || 0;

    html += '<tr class="border-b border-bgray-200 dark:border-darkblack-400">';
    html += '<td class="px-4 py-3"><p class="text-sm font-semibold text-bgray-900 dark:text-white">' + escapeHtml(inv.invoice_number) + '</p></td>';
    html += '<td class="px-4 py-3"><p class="text-sm text-bgray-900 dark:text-white">' + escapeHtml(inv.client_name) + '</p></td>';
    html += '<td class="px-4 py-3"><p class="text-sm text-bgray-600 dark:text-bgray-400">' + fmtDate(inv.issue_date) + '</p></td>';
    html += '<td class="px-4 py-3 text-right"><p class="text-sm font-medium text-bgray-900 dark:text-white">' + fmtCur(base) + '</p></td>';
    html += '<td class="px-4 py-3 text-right"><p class="text-sm font-medium text-bgray-900 dark:text-white">' + fmtCur(iva) + '</p></td>';
    if (showIRPF) {
      html += '<td class="px-4 py-3 text-right"><p class="text-sm font-medium text-red-500">' + (irpf > 0 ? '-' + fmtCur(irpf) : fmtCur(0)) + '</p></td>';
    }
    html += '<td class="px-4 py-3 text-right"><p class="text-sm font-bold text-bgray-900 dark:text-white">' + fmtCur(total) + '</p></td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;
}

// ── Helpers para construir invoiceData compatible con InvoicePDFGenerator ──
function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  try {
    var d = new Date(isoDate);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  } catch (e) { return isoDate; }
}

function buildPdfData(inv) {
  var d = inv.invoice_data || {};
  var paymentTermsMap = { 'immediate': 'Pago inmediato', '15': '15 días', '30': '30 días', '60': '60 días', '90': '90 días' };
  var termsValue = d.payment ? d.payment.terms : '';
  var termsLabel = (d.payment && d.payment.termsLabel) || paymentTermsMap[termsValue] || termsValue || '';

  return {
    issuer: d.issuer || {},
    client: d.client || {},
    invoice: {
      series: (d.invoice && d.invoice.series) || inv.invoice_series || '',
      number: inv.invoice_number || (d.invoice && d.invoice.number) || '',
      reference: (d.invoice && d.invoice.reference) || '',
      issueDate: inv.issue_date ? formatDateDisplay(inv.issue_date) : '',
      dueDate: inv.due_date ? formatDateDisplay(inv.due_date) : '',
      paymentTerms: termsLabel
    },
    concepts: d.concepts || [],
    expenses: d.expenses || [],
    taxSettings: d.taxSettings || {},
    paymentMethods: d.paymentMethods || [],
    observations: (d.options && d.options.observaciones && d.options.observaciones !== 'on') ? d.options.observaciones : '',
    summary: {
      subtotal: (d.summary && d.summary.subtotal) || inv.subtotal || 0,
      discount: (d.summary && d.summary.discount) || 0,
      taxBase: (d.summary && d.summary.taxBase) || inv.subtotal || 0,
      taxRate: (d.summary && d.summary.taxRate) || 21,
      taxAmount: (d.summary && d.summary.taxAmount) || (d.summary && d.summary.tax) || inv.tax_amount || 0,
      reRate: (d.summary && d.summary.reRate) || 0,
      reAmount: (d.summary && d.summary.reAmount) || 0,
      retentionRate: (d.summary && d.summary.retentionRate) || (d.adjustments && d.adjustments.withholding) || 0,
      retentionAmount: (d.summary && d.summary.retentionAmount) || 0,
      expenses: (d.summary && d.summary.expenses) || 0,
      total: (d.summary && d.summary.total) || inv.total_amount || 0,
      paid: (d.summary && d.summary.paid) || 0,
      totalToPay: (d.summary && d.summary.totalToPay) || (d.summary && d.summary.total) || inv.total_amount || 0
    }
  };
}

// ── Exportar ZIP con PDFs ──
window.exportFiscalZIP = async function () {
  if (!_currentInvoices || _currentInvoices.length === 0) {
    if (window.showToast) window.showToast('No hay facturas para exportar', 'error');
    return;
  }

  if (typeof JSZip === 'undefined') {
    if (window.showToast) window.showToast('Error: librería JSZip no disponible', 'error');
    return;
  }

  if (typeof window.InvoicePDFGenerator === 'undefined') {
    if (window.showToast) window.showToast('Error: generador de PDF no disponible', 'error');
    return;
  }

  var btn = document.getElementById('fiscal-export-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg> Generando...';
  }

  try {
    var zip = new JSZip();
    var folder = zip.folder('facturas');

    for (var i = 0; i < _currentInvoices.length; i++) {
      var inv = _currentInvoices[i];
      var pdfData = buildPdfData(inv);
      var generator = new window.InvoicePDFGenerator();
      generator.generatePDF(pdfData);
      var blob = generator.getPDFBlob();

      if (blob) {
        var safeName = (inv.invoice_number || 'factura_' + (i + 1)).replace(/[^a-zA-Z0-9_\-]/g, '_');
        folder.file(safeName + '.pdf', blob);
      }
    }

    var zipBlob = await zip.generateAsync({ type: 'blob' });
    var prefix = _fiscalQuarter === 0 ? 'anual' : 'T' + _fiscalQuarter;
    var url = URL.createObjectURL(zipBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'facturas_' + prefix + '_' + _fiscalYear + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.showToast) window.showToast('ZIP con ' + _currentInvoices.length + ' facturas descargado', 'success');
  } catch (err) {
    console.error('Error generando ZIP:', err);
    if (window.showToast) window.showToast('Error al generar el ZIP de facturas', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg> Exportar';
    }
  }
};

console.log('✅ Fiscal page module loaded');
