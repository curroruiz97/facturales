/**
 * invoice-numbering.js
 * Sistema profesional de numeración de facturas.
 * Consulta Supabase para obtener el siguiente número disponible por serie.
 * Soporta: start_number, counter_reset (yearly/monthly/never),
 *          formatos (common, monthly, simple, slash, compact, custom)
 */

(function () {
  'use strict';

  /**
   * Obtener la configuración de una serie desde invoice_series
   */
  async function getSeriesConfig(seriesCode) {
    try {
      if (!window.supabaseClient) return null;
      var supabase = window.supabaseClient;
      var userResult = await supabase.auth.getUser();
      if (!userResult.data || !userResult.data.user) return null;

      var result = await supabase
        .from('invoice_series')
        .select('invoice_number_format, counter_reset, start_number, custom_format, current_number, current_number_period')
        .eq('user_id', userResult.data.user.id)
        .eq('code', seriesCode)
        .limit(1)
        .single();

      if (result.error || !result.data) return null;
      return result.data;
    } catch (e) {
      console.warn('Error obteniendo config de serie:', e);
      return null;
    }
  }

  /**
   * Formatear un número de factura según la configuración de la serie
   */
  function formatInvoiceNumber(seriesCode, format, counterReset, seq, customFormat) {
    var now = new Date();
    var year = String(now.getFullYear());
    var shortYear = year.slice(2);
    var month = String(now.getMonth() + 1).padStart(2, '0');

    switch (format) {
      case 'common':
        if (counterReset === 'monthly') {
          return seriesCode + '-' + year + '-' + month + '-' + String(seq).padStart(4, '0');
        }
        return seriesCode + '-' + year + '-' + String(seq).padStart(4, '0');

      case 'monthly':
        return year + '-' + month + '-' + String(seq).padStart(3, '0');

      case 'simple':
        if (counterReset === 'monthly') {
          return year + month + String(seq).padStart(4, '0');
        }
        return year + String(seq).padStart(4, '0');

      case 'slash':
        if (counterReset === 'monthly') {
          return seriesCode + '/' + year + '/' + month + '/' + String(seq).padStart(4, '0');
        }
        return seriesCode + '/' + year + '/' + String(seq).padStart(4, '0');

      case 'compact':
        if (counterReset === 'monthly') {
          return seriesCode + '-' + shortYear + '-' + month + '-' + String(seq).padStart(3, '0');
        }
        return seriesCode + '-' + shortYear + '-' + String(seq).padStart(3, '0');

      case 'custom':
        var result = customFormat || '{SERIE}-{YYYY}-{NNNN}';
        result = result.replace('{SERIE}', seriesCode);
        result = result.replace('{YYYY}', year);
        result = result.replace('{YY}', shortYear);
        result = result.replace('{MM}', month);
        result = result.replace('{NNNNN}', String(seq).padStart(5, '0'));
        result = result.replace('{NNNN}', String(seq).padStart(4, '0'));
        result = result.replace('{NNN}', String(seq).padStart(3, '0'));
        return result;

      default:
        return seriesCode + '-' + year + '-' + String(seq).padStart(4, '0');
    }
  }

  /**
   * Obtener el siguiente número de factura para una serie dada.
   * Consulta la BD para encontrar el máximo actual y devuelve el siguiente.
   * @param {string} series - Serie de factura (ej: 'A', 'B', 'R')
   * @returns {Promise<string>} Siguiente número (ej: 'A-2026-0003')
   */
  async function getNextInvoiceNumber(series) {
    try {
      var seriesCode = series || 'A';

      if (!window.supabaseClient) {
        return seriesCode + '-' + new Date().getFullYear() + '-XXXXX';
      }

      var supabase = window.supabaseClient;
      var userResult = await supabase.auth.getUser();
      if (!userResult.data || !userResult.data.user) {
        return seriesCode + '-' + new Date().getFullYear() + '-XXXXX';
      }

      // Obtener configuración de la serie
      var config = await getSeriesConfig(seriesCode);
      var format = (config && config.invoice_number_format) || 'common';
      var counterReset = (config && config.counter_reset) || 'yearly';
      var startNumber = (config && config.start_number) || 1;
      var customFormat = (config && config.custom_format) || null;
      var currentNumber = (config && config.current_number) || 0;
      var currentPeriod = (config && config.current_number_period) || '';

      // Determinar periodo actual
      var now = new Date();
      var year = String(now.getFullYear());
      var month = String(now.getMonth() + 1).padStart(2, '0');
      var period;
      switch (counterReset) {
        case 'monthly': period = year + '-' + month; break;
        case 'never': period = 'all'; break;
        default: period = year; break;
      }

      // Calcular siguiente número
      var nextSeq;
      if (currentPeriod !== period) {
        // Periodo nuevo: empezar desde start_number
        nextSeq = startNumber;
      } else {
        // Mismo periodo: incrementar
        nextSeq = Math.max(currentNumber + 1, startNumber);
      }

      return formatInvoiceNumber(seriesCode, format, counterReset, nextSeq, customFormat);
    } catch (e) {
      console.error('Error en getNextInvoiceNumber:', e);
      return (series || 'A') + '-' + new Date().getFullYear() + '-XXXXX';
    }
  }

  /**
   * Obtener estadísticas de numeración por serie
   * @returns {Promise<Array>} Array de objetos { series, count, lastNumber }
   */
  async function getInvoiceSeriesStats() {
    try {
      if (!window.supabaseClient) return [];

      var supabase = window.supabaseClient;
      var userResult = await supabase.auth.getUser();
      if (!userResult.data?.user) return [];

      var userId = userResult.data.user.id;

      var { data, error } = await supabase
        .from('invoices')
        .select('invoice_series, invoice_number, status')
        .eq('user_id', userId)
        .order('invoice_number', { ascending: false });

      if (error || !data) return [];

      var seriesMap = {};
      data.forEach(function (inv) {
        var s = inv.invoice_series || 'A';
        if (!seriesMap[s]) {
          seriesMap[s] = { series: s, total: 0, issued: 0, drafts: 0, lastNumber: '' };
        }
        seriesMap[s].total++;
        if (inv.status === 'issued') seriesMap[s].issued++;
        if (inv.status === 'draft') seriesMap[s].drafts++;
        if (!seriesMap[s].lastNumber && inv.invoice_number) {
          seriesMap[s].lastNumber = inv.invoice_number;
        }
      });

      return Object.values(seriesMap);
    } catch (e) {
      console.error('Error en getInvoiceSeriesStats:', e);
      return [];
    }
  }

  /**
   * Actualiza el campo de número de factura en el formulario con el siguiente número previsto
   * @param {string} series - Serie seleccionada
   */
  async function updateInvoiceNumberPreview(series) {
    var input = document.getElementById('invoice-number');
    if (!input || !input.disabled) return;

    input.value = '';
    input.placeholder = 'Calculando...';

    var nextNumber = await getNextInvoiceNumber(series);
    input.placeholder = nextNumber;
    input.value = '';
  }

  // Exportar
  window.getNextInvoiceNumber = getNextInvoiceNumber;
  window.getInvoiceSeriesStats = getInvoiceSeriesStats;
  window.updateInvoiceNumberPreview = updateInvoiceNumberPreview;
  window.formatInvoiceNumber = formatInvoiceNumber;
})();
