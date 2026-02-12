/**
 * invoice-defaults.js
 * Sistema para guardar y cargar valores por defecto de facturación.
 * Almacena en localStorage las preferencias recurrentes del usuario:
 * serie, moneda, condiciones de pago, retención IRPF, métodos de pago, etc.
 * Los métodos de pago predeterminados también se persisten en Supabase
 * (business_info.default_payment_method).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'invoice_user_defaults';

  /**
   * Obtiene los valores por defecto guardados
   * @returns {Object|null}
   */
  function getInvoiceDefaults() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Error al leer defaults de factura:', e);
      return null;
    }
  }

  /**
   * Guarda los valores por defecto actuales del formulario
   * @returns {boolean}
   */
  function saveInvoiceDefaults() {
    try {
      const paymentMethods = captureCurrentPaymentMethods();

      const defaults = {
        // Serie de factura
        invoiceSeries: document.getElementById('invoice-series')?.value || '',
        // Moneda
        invoiceCurrency: document.getElementById('invoice-currency')?.value || 'EUR (€)',
        // Condiciones de pago
        paymentTerms: document.getElementById('payment-terms')?.value || '30',
        // Retención IRPF
        withholding: document.getElementById('withholding')?.value || '0',
        // Descuento general por defecto
        discount: document.getElementById('discount')?.value || '0',
        // Recargo de equivalencia
        recargoEquivalencia: document.getElementById('recargo-equivalencia')?.checked || false,
        // Métodos de pago guardados
        paymentMethods: paymentMethods,
        // Datos del emisor que no se autocompletan desde business_info
        issuerEmail: document.getElementById('issuer-email')?.value || '',
        // Timestamp
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      console.log('✅ Valores por defecto guardados:', defaults);

      // También persistir métodos de pago en Supabase (business_info.default_payment_method)
      savePaymentMethodsToSupabase(paymentMethods);

      return true;
    } catch (e) {
      console.error('Error al guardar defaults:', e);
      return false;
    }
  }

  /**
   * Guarda los métodos de pago en business_info.default_payment_method (Supabase)
   * @param {Array} methods
   */
  async function savePaymentMethodsToSupabase(methods) {
    try {
      // Esperar a que Supabase esté disponible
      var attempts = 0;
      while (!window.supabaseClient && attempts < 50) {
        await new Promise(function(r) { setTimeout(r, 100); });
        attempts++;
      }
      if (!window.supabaseClient) return;

      var supabase = window.supabaseClient;
      var userResult = await supabase.auth.getUser();
      if (!userResult.data || !userResult.data.user) return;

      var { error } = await supabase
        .from('business_info')
        .update({ default_payment_method: methods })
        .eq('user_id', userResult.data.user.id);

      if (error) {
        console.error('Error guardando métodos de pago en Supabase:', error);
      } else {
        console.log('✅ Métodos de pago guardados en Supabase');
      }
    } catch (e) {
      console.error('Error guardando métodos de pago en Supabase:', e);
    }
  }

  /**
   * Carga los métodos de pago predeterminados desde Supabase
   * @returns {Array|null}
   */
  async function loadPaymentMethodsFromSupabase() {
    try {
      var attempts = 0;
      while (!window.supabaseClient && attempts < 50) {
        await new Promise(function(r) { setTimeout(r, 100); });
        attempts++;
      }
      if (!window.supabaseClient) return null;

      var supabase = window.supabaseClient;
      var userResult = await supabase.auth.getUser();
      if (!userResult.data || !userResult.data.user) return null;

      var { data, error } = await supabase
        .from('business_info')
        .select('default_payment_method')
        .eq('user_id', userResult.data.user.id)
        .single();

      if (error || !data) return null;

      var methods = data.default_payment_method;
      if (Array.isArray(methods) && methods.length > 0) {
        return methods;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Captura los métodos de pago actualmente añadidos en la lista
   * @returns {Array}
   */
  function captureCurrentPaymentMethods() {
    var methods = [];
    var badges = document.querySelectorAll('#payment-methods-list > div');

    badges.forEach(function (badge) {
      var type = badge.getAttribute('data-type');
      var iban = badge.getAttribute('data-iban');
      var phone = badge.getAttribute('data-phone');

      if (type) {
        var m = { type: type, label: type };
        if (iban) m.iban = iban;
        if (phone) m.phone = phone;
        methods.push(m);
      }
    });

    return methods;
  }

  /**
   * Aplica los valores por defecto al formulario (solo en modo creación, no edición)
   */
  async function applyInvoiceDefaults() {
    // No aplicar si estamos editando un borrador
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('draft')) {
      console.log('ℹ️ Modo edición: no se aplican defaults');
      return;
    }

    const defaults = getInvoiceDefaults();

    // Cargar métodos de pago desde Supabase (tiene prioridad sobre localStorage)
    var supabaseMethods = await loadPaymentMethodsFromSupabase();

    if (!defaults && !supabaseMethods) {
      console.log('ℹ️ No hay valores por defecto guardados');
      return;
    }

    console.log('🔄 Aplicando valores por defecto...');

    if (defaults) {
      // Serie (ahora es un select)
      if (defaults.invoiceSeries) {
        const seriesSelect = document.getElementById('invoice-series');
        if (seriesSelect) {
          // Verificar si la serie guardada existe como opción
          var found = false;
          for (var i = 0; i < seriesSelect.options.length; i++) {
            if (seriesSelect.options[i].value === defaults.invoiceSeries) {
              seriesSelect.selectedIndex = i;
              found = true;
              break;
            }
          }
          // Si no existe, crearla
          if (!found) {
            var opt = document.createElement('option');
            opt.value = defaults.invoiceSeries;
            opt.textContent = defaults.invoiceSeries;
            seriesSelect.appendChild(opt);
            seriesSelect.value = defaults.invoiceSeries;
          }
        }
      }

      // Moneda
      if (defaults.invoiceCurrency) {
        const currencySelect = document.getElementById('invoice-currency');
        if (currencySelect) {
          // Buscar la opción que coincida
          for (var i = 0; i < currencySelect.options.length; i++) {
            if (currencySelect.options[i].value === defaults.invoiceCurrency ||
                currencySelect.options[i].text === defaults.invoiceCurrency) {
              currencySelect.selectedIndex = i;
              break;
            }
          }
        }
      }

      // Condiciones de pago
      if (defaults.paymentTerms) {
        const termsSelect = document.getElementById('payment-terms');
        if (termsSelect) {
          termsSelect.value = defaults.paymentTerms;
        }
      }

      // Retención IRPF
      if (defaults.withholding) {
        const withholdingSelect = document.getElementById('withholding');
        if (withholdingSelect) {
          withholdingSelect.value = defaults.withholding;
        }
      }

      // Descuento general
      if (defaults.discount && parseFloat(defaults.discount) > 0) {
        const discountInput = document.getElementById('discount');
        if (discountInput) {
          discountInput.value = defaults.discount;
        }
      }

      // Recargo de equivalencia
      if (defaults.recargoEquivalencia) {
        const reCheckbox = document.getElementById('recargo-equivalencia');
        if (reCheckbox) {
          reCheckbox.checked = true;
        }
      }
    }

    // Métodos de pago: prioridad Supabase > localStorage
    var methodsToApply = supabaseMethods || (defaults && defaults.paymentMethods);
    if (methodsToApply && methodsToApply.length > 0) {
      applyDefaultPaymentMethods(methodsToApply);

      // Sincronizar localStorage con Supabase si se cargó de Supabase
      if (supabaseMethods && defaults) {
        defaults.paymentMethods = supabaseMethods;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      }
    }

    console.log('✅ Valores por defecto aplicados');

    // Actualizar resumen tras aplicar defaults
    setTimeout(function () {
      if (typeof updateAllConceptTotals === 'function') updateAllConceptTotals();
      if (typeof updateInvoiceSummary === 'function') updateInvoiceSummary();
    }, 300);
  }

  /**
   * Aplica métodos de pago por defecto
   * @param {Array} methods
   */
  function applyDefaultPaymentMethods(methods) {
    var list = document.getElementById('payment-methods-list');
    if (!list) return;

    // Solo aplicar si no hay métodos ya añadidos
    if (list.children.length > 0) return;

    methods.forEach(function (method) {
      var additionalInfo = '';
      if (method.type === 'transferencia' && method.iban) {
        additionalInfo = '<div class="text-xs text-bgray-600 dark:text-bgray-400 mt-1">' + method.iban + '</div>';
      } else if (method.type === 'bizum' && method.phone) {
        additionalInfo = '<div class="text-xs text-bgray-600 dark:text-bgray-400 mt-1">' + method.phone + '</div>';
      }

      var badge = document.createElement('div');
      badge.className = 'payment-method-badge flex items-center justify-between rounded-lg border-2 border-warning-300 bg-warning-50 px-3 py-2 text-sm dark:bg-warning-900/10';
      badge.setAttribute('data-type', method.type || '');
      badge.setAttribute('data-iban', method.iban || '');
      badge.setAttribute('data-phone', method.phone || '');
      badge.innerHTML =
        '<div class="flex-1">' +
          '<span class="font-semibold text-warning-700 dark:text-warning-300">' + (method.label || method.type) + '</span>' +
          additionalInfo +
          '<span class="ml-2 inline-flex items-center rounded-full bg-warning-100 dark:bg-warning-900/30 px-1.5 py-0.5 text-[9px] font-medium text-warning-600 dark:text-warning-300">Predeterminado</span>' +
        '</div>' +
        '<button type="button" onclick="this.parentElement.remove()" class="text-warning-700 hover:text-warning-900 dark:text-warning-300 ml-2">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">' +
            '<path d="M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>';
      list.appendChild(badge);
    });
  }

  /**
   * Elimina los valores por defecto guardados
   */
  function clearInvoiceDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Valores por defecto eliminados');
  }

  /**
   * Verifica si hay valores por defecto guardados
   * @returns {boolean}
   */
  function hasInvoiceDefaults() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  // Exportar funciones globalmente
  window.getInvoiceDefaults = getInvoiceDefaults;
  window.saveInvoiceDefaults = saveInvoiceDefaults;
  window.applyInvoiceDefaults = applyInvoiceDefaults;
  window.clearInvoiceDefaults = clearInvoiceDefaults;
  window.hasInvoiceDefaults = hasInvoiceDefaults;
  window.loadPaymentMethodsFromSupabase = loadPaymentMethodsFromSupabase;

  // Auto-aplicar defaults cuando el DOM esté listo
  function initDefaults() {
    setTimeout(applyInvoiceDefaults, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDefaults);
  } else {
    initDefaults();
  }
})();
