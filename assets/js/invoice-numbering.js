/**
 * invoice-numbering.js
 * Sistema profesional de numeración de facturas.
 * Consulta Supabase para obtener el siguiente número disponible por serie.
 */

(function () {
  'use strict';

  /**
   * Obtener el siguiente número de factura para una serie dada.
   * Consulta la BD para encontrar el máximo actual y devuelve el siguiente.
   * @param {string} series - Serie de factura (ej: 'A', 'B', 'R')
   * @returns {Promise<string>} Siguiente número (ej: 'A-2026-00003')
   */
  async function getNextInvoiceNumber(series) {
    try {
      if (!window.supabaseClient) {
        return (series || 'A') + '-' + new Date().getFullYear() + '-XXXXX';
      }

      const supabase = window.supabaseClient;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return series + '-' + new Date().getFullYear() + '-XXXXX';

      const currentYear = String(new Date().getFullYear());
      const prefix = (series || 'A') + '-' + currentYear + '-';

      // Buscar la factura con el número más alto para esta serie/año/usuario
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', user.id)
        .eq('invoice_series', series || 'A')
        .like('invoice_number', prefix + '%')
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error consultando números:', error);
        return prefix + '00001';
      }

      if (!data || data.length === 0) {
        return prefix + '00001';
      }

      // Extraer el número de la última factura
      var lastNumber = data[0].invoice_number;
      var parts = lastNumber.split('-');
      var lastNum = parseInt(parts[parts.length - 1], 10) || 0;
      var nextNum = String(lastNum + 1).padStart(5, '0');

      return (series || 'A') + '-' + currentYear + '-' + nextNum;
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

      // Obtener todas las facturas del usuario agrupadas por serie
      var { data, error } = await supabase
        .from('invoices')
        .select('invoice_series, invoice_number, status')
        .eq('user_id', userId)
        .order('invoice_number', { ascending: false });

      if (error || !data) return [];

      // Agrupar por serie
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
    if (!input || !input.disabled) return; // Solo si está en modo automático

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
})();
