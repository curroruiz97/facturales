/**
 * new-page.js
 * Script para la página de creación/edición de facturas
 */

let currentDraftId = null;
let isEditMode = false;

/**
 * Inicializar la página
 */
async function initNewPage() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    currentDraftId = urlParams.get('draft');
    
    if (currentDraftId) {
      isEditMode = true;
      await loadDraftToForm(currentDraftId);
    }
    
  } catch (error) {
    console.error('Error al inicializar página:', error);
  }
}

/**
 * Cargar datos de un borrador en el formulario
 * @param {string} draftId - ID del borrador
 */
async function loadDraftToForm(draftId) {
  try {
    // Esperar a que el módulo esté disponible
    let attempts = 0;
    while (!window.getInvoiceById && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.getInvoiceById) {
      console.error('❌ Módulo de facturas no disponible');
      return;
    }
    
    // Obtener el borrador
    const result = await window.getInvoiceById(draftId);
    
    if (!result.success || !result.data) {
      console.error('❌ Error al cargar borrador:', result.error);
      showToastMessage('Error al cargar el borrador', 'error');
      return;
    }
    
    const draft = result.data;
    console.log('✅ Borrador cargado:', draft);
    
    // Guardar ID en campo oculto
    const draftIdInput = document.getElementById('draft-id');
    if (draftIdInput) {
      draftIdInput.value = draftId;
    }
    
    // Cargar datos en el formulario
    populateFormWithData(draft);
    
  } catch (error) {
    console.error('❌ Error en loadDraftToForm:', error);
    showToastMessage('Error al cargar el borrador', 'error');
  }
}

/**
 * Poblar el formulario con datos de una factura
 * @param {Object} invoice - Datos de la factura
 */
function populateFormWithData(invoice) {
  try {
    const data = invoice.invoice_data;
    
    // Datos básicos de la factura
    setValue('invoice-series', invoice.invoice_series);
    setValue('invoice-number', invoice.invoice_number);
    setValue('invoice-reference', data.invoice?.reference || '');
    setValue('invoice-currency', invoice.currency);
    
    // Fechas - usando setDate de flatpickr si está disponible
    setDateValue('issue-date', invoice.issue_date);
    setDateValue('due-date', invoice.due_date);
    setValue('payment-terms', data.payment?.terms || '');
    setDateValue('operation-date', data.dates?.operation || '');
    
    // Emisor (ya están autocompletados, pero por si acaso)
    if (data.issuer) {
      setValue('issuer-name', data.issuer.name);
      setValue('issuer-nif', data.issuer.nif);
      setValue('issuer-email', data.issuer.email);
      setValue('issuer-address', data.issuer.address);
      setValue('issuer-postal-code', data.issuer.postalCode);
    }
    
    // Cliente
    if (data.client) {
      setValue('client-name', data.client.name);
      setValue('client-nif', data.client.nif);
      setValue('client-email', data.client.email);
      setValue('client-address', data.client.address);
      setValue('client-postal-code', data.client.postalCode);
    }
    
    // Conceptos - Cargar líneas de factura
    if (data.concepts && data.concepts.length > 0) {
      loadInvoiceLines(data.concepts);
      
      // Actualizar totales después de cargar líneas
      setTimeout(() => {
        if (window.updateTotals && typeof window.updateTotals === 'function') {
          window.updateTotals();
        }
      }, 500);
    }
    
    // Opciones avanzadas
    if (data.options) {
      setCheckbox('recargo-equivalencia', data.options.recargoEquivalencia);
      setCheckbox('observaciones', !!data.options.observaciones);
      // gastos-suplidos y cantidad-pagada se manejan más abajo con su lógica específica
    }
    
    // Ajustes fiscales
    if (data.adjustments) {
      setValue('discount', data.adjustments.discount || '');
      setValue('withholding', data.adjustments.withholding || '');
    }
    
    // Gastos suplidos - cargar desde options.gastosSuplidos
    if (data.options?.gastosSuplidos && data.options.gastosSuplidos > 0) {
      setCheckbox('gastos-suplidos', true);
      // Mostrar los campos
      const fieldsContainer = document.getElementById('gastos-suplidos-fields');
      if (fieldsContainer) {
        fieldsContainer.classList.remove('hidden');
      }
      setValue('gastos-suplidos-amount', data.options.gastosSuplidos);
    }
    
    // Cantidad pagada
    if (data.summary?.paid && data.summary.paid > 0) {
      setCheckbox('cantidad-pagada', true);
      // Mostrar el campo
      const paidContainer = document.getElementById('cantidad-pagada-field');
      if (paidContainer) {
        paidContainer.classList.remove('hidden');
      }
      setValue('paid-amount', data.summary.paid);
    }
    
    // Métodos de pago
    if (data.paymentMethods && data.paymentMethods.length > 0) {
      loadPaymentMethods(data.paymentMethods);
    }
    
    console.log('✅ Formulario poblado con datos del borrador');
    
  } catch (error) {
    console.error('❌ Error en populateFormWithData:', error);
  }
}

/**
 * Cargar métodos de pago desde datos guardados
 * @param {Array} methods - Array de métodos de pago
 */
function loadPaymentMethods(methods) {
  try {
    if (!methods || methods.length === 0) return;
    
    const list = document.getElementById('payment-methods-list');
    if (!list) {
      console.error('❌ Contenedor de métodos de pago no encontrado');
      return;
    }
    
    // Limpiar lista existente
    list.innerHTML = '';
    
    const methodLabels = {
      'transferencia': 'Transferencia bancaria',
      'domiciliacion': 'Domiciliación',
      'efectivo': 'Efectivo',
      'contrareembolso': 'Contrareembolso',
      'bizum': 'Bizum',
      'otro': 'Otro'
    };
    
    methods.forEach(method => {
      let additionalInfo = '';
      if (method.type === 'transferencia' && method.iban) {
        additionalInfo = '<div class="text-xs text-bgray-600 dark:text-bgray-400 mt-1">' + method.iban + '</div>';
      } else if (method.type === 'bizum' && method.phone) {
        additionalInfo = '<div class="text-xs text-bgray-600 dark:text-bgray-400 mt-1">' + method.phone + '</div>';
      }
      
      const badge = document.createElement('div');
      badge.className = 'payment-method-badge flex items-center justify-between rounded-lg border-2 border-warning-300 bg-warning-50 px-3 py-2 text-sm dark:bg-warning-900/10';
      badge.setAttribute('data-type', method.type || '');
      badge.setAttribute('data-iban', method.iban || '');
      badge.setAttribute('data-phone', method.phone || '');
      badge.innerHTML =
        '<div class="flex-1">' +
          '<span class="font-semibold text-warning-700 dark:text-warning-300">' + (methodLabels[method.type] || method.type) + '</span>' +
          additionalInfo +
        '</div>' +
        '<button type="button" onclick="this.parentElement.remove()" class="text-warning-700 hover:text-warning-900 dark:text-warning-300 ml-2">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>';
      list.appendChild(badge);
    });
    
    console.log(`✅ ${methods.length} métodos de pago cargados`);
    
  } catch (error) {
    console.error('❌ Error en loadPaymentMethods:', error);
  }
}

/**
 * Establecer valor de un campo de fecha (compatible con flatpickr)
 * @param {string} id - ID del elemento
 * @param {string} value - Valor de fecha
 */
function setDateValue(id, value) {
  if (!value) return;
  
  const element = document.getElementById(id);
  if (!element) return;
  
  // Si flatpickr está disponible en el elemento, usarlo
  if (element._flatpickr) {
    element._flatpickr.setDate(value, false);
  } else {
    // Fallback: establecer directamente
    element.value = value;
  }
}

/**
 * Establecer valor de un input
 * @param {string} id - ID del elemento
 * @param {any} value - Valor a establecer
 */
function setValue(id, value) {
  const element = document.getElementById(id);
  if (element && value !== null && value !== undefined) {
    element.value = value;
  }
}

/**
 * Establecer estado de un checkbox
 * @param {string} id - ID del elemento
 * @param {boolean} checked - Estado checked
 */
function setCheckbox(id, checked) {
  const element = document.getElementById(id);
  if (element) {
    element.checked = !!checked;
  }
}

/**
 * Cargar líneas de factura desde datos guardados
 * @param {Array} concepts - Array de conceptos/líneas
 */
function loadInvoiceLines(concepts) {
  try {
    if (!concepts || concepts.length === 0) {
      console.log('ℹ️ No hay conceptos guardados, se mantienen las líneas del HTML');
      return;
    }
    
    const container = document.getElementById('invoice-lines');
    if (!container) {
      console.error('❌ Contenedor de líneas no encontrado');
      return;
    }
    
    // Limpiar líneas existentes SOLO si hay conceptos guardados
    container.innerHTML = '';
    
    // Crear cada línea
    concepts.forEach((concept, index) => {
      const line = createInvoiceLine(concept, index === 0);
      container.appendChild(line);
    });
    
    console.log(`✅ ${concepts.length} líneas cargadas`);
    
  } catch (error) {
    console.error('❌ Error en loadInvoiceLines:', error);
  }
}

/**
 * Crear elemento HTML de línea de factura
 * @param {Object} concept - Datos del concepto
 * @param {boolean} isFirst - Si es la primera línea
 * @returns {HTMLElement} Elemento de línea
 */
function createInvoiceLine(concept, isFirst) {
  const line = document.createElement('div');
  line.className = 'rounded-lg border border-bgray-200 bg-white p-4 dark:border-darkblack-500 dark:bg-darkblack-500';
  
  // Determinar el valor del select según el tax
  let selectedTaxOption = 'IVA_21';
  if (concept.tax === 0) selectedTaxOption = 'IVA_0';
  else if (concept.tax === 4) selectedTaxOption = 'IVA_4';
  else if (concept.tax === 10) selectedTaxOption = 'IVA_10';
  else if (concept.tax === 21) selectedTaxOption = 'IVA_21';
  
  line.innerHTML = `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <!-- Descripción -->
      <div class="sm:col-span-2 lg:col-span-2 xl:col-span-3">
        <label class="mb-2 block text-xs font-semibold text-bgray-500 dark:text-bgray-400">
          Descripción
        </label>
        <input
          type="text"
          class="h-11 w-full rounded-lg border border-bgray-200 bg-white px-3 text-sm text-bgray-900 focus:border-success-300 focus:outline-none dark:border-darkblack-400 dark:bg-darkblack-600 dark:text-white"
          value="${concept.description || ''}"
          placeholder="Descripción del servicio"
        />
      </div>
      
      <!-- Cantidad -->
      <div>
        <label class="mb-2 block text-xs font-semibold text-bgray-500 dark:text-bgray-400">
          Cant.
        </label>
        <input
          type="number"
          class="h-11 w-full rounded-lg border border-bgray-200 bg-white px-3 text-sm text-bgray-900 focus:border-success-300 focus:outline-none dark:border-darkblack-400 dark:bg-darkblack-600 dark:text-white"
          value="${concept.quantity || 1}"
          min="0"
          step="0.01"
        />
      </div>
      
      <!-- Precio -->
      <div>
        <label class="mb-2 block text-xs font-semibold text-bgray-500 dark:text-bgray-400">
          Precio
        </label>
        <input
          type="number"
          class="h-11 w-full rounded-lg border border-bgray-200 bg-white px-3 text-sm text-bgray-900 focus:border-success-300 focus:outline-none dark:border-darkblack-400 dark:bg-darkblack-600 dark:text-white"
          value="${concept.unitPrice || 0}"
          min="0"
          step="0.01"
          placeholder="0.00"
        />
      </div>
      
      <!-- Impuestos -->
      <div>
        <label class="mb-2 block text-xs font-semibold text-bgray-500 dark:text-bgray-400">
          Impuestos
        </label>
        <select
          class="h-11 w-full rounded-lg border border-bgray-200 bg-white px-3 text-sm text-bgray-900 focus:border-success-300 focus:outline-none dark:border-darkblack-400 dark:bg-darkblack-600 dark:text-white"
        >
          <optgroup label="IVA — Península/Baleares">
            <option value="IVA_21" ${selectedTaxOption === 'IVA_21' ? 'selected' : ''}>IVA 21%</option>
            <option value="IVA_10" ${selectedTaxOption === 'IVA_10' ? 'selected' : ''}>IVA 10%</option>
            <option value="IVA_4" ${selectedTaxOption === 'IVA_4' ? 'selected' : ''}>IVA 4%</option>
            <option value="IVA_0" ${selectedTaxOption === 'IVA_0' ? 'selected' : ''}>IVA 0%</option>
          </optgroup>
          <optgroup label="IGIC — Canarias">
            <option value="IGIC_7">IGIC 7%</option>
            <option value="IGIC_3">IGIC 3%</option>
            <option value="IGIC_0">IGIC 0%</option>
          </optgroup>
          <optgroup label="Exenciones">
            <option value="EXENTO">Exento</option>
          </optgroup>
        </select>
        <div class="re-info mt-1 text-xs text-bgray-500 dark:text-bgray-400">R.E 5,2% incluido</div>
      </div>
      
      <!-- Descuento -->
      <div>
        <label class="mb-2 block text-xs font-semibold text-bgray-500 dark:text-bgray-400">
          Dto. %
        </label>
        <input
          type="number"
          class="h-11 w-full rounded-lg border border-bgray-200 bg-white px-3 text-sm text-bgray-900 focus:border-success-300 focus:outline-none dark:border-darkblack-400 dark:bg-darkblack-600 dark:text-white"
          value="${concept.discount || 0}"
          min="0"
          max="100"
          step="0.01"
          placeholder="0"
        />
      </div>
      
      <!-- Importe y botón eliminar -->
      <div class="sm:col-span-2 lg:col-span-1 flex items-end gap-2">
        <div class="flex-1">
          <label class="mb-2 block text-xs font-semibold text-bgray-500 dark:text-bgray-400">
            Importe
          </label>
          <div class="concept-total flex h-11 items-center rounded-lg border border-bgray-200 bg-bgray-50 px-3 text-sm font-semibold text-bgray-900 dark:border-darkblack-400 dark:bg-darkblack-700 dark:text-white">
            ${((concept.quantity || 1) * (concept.unitPrice || 0)).toFixed(2).replace('.', ',')} €
          </div>
        </div>
        <button
          type="button"
          class="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-bgray-200 text-bgray-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-darkblack-400 dark:hover:bg-red-900/20"
          title="Eliminar línea"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 7L18.133 19.142C18.046 20.168 17.194 21 16.166 21H7.834C6.806 21 5.954 20.168 5.867 19.142L5 7M10 11V17M14 11V17M15 7V4C15 3.448 14.552 3 14 3H10C9.448 3 9 3.448 9 4V7M4 7H20" 
                  stroke="currentColor" 
                  stroke-width="2" 
                  stroke-linecap="round"
                  stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  // Agregar event listeners a los inputs/selects
  const inputs = line.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('input', function() {
      updateConceptTotal(line);
      updateInvoiceSummary();
    });
    input.addEventListener('change', function() {
      updateConceptTotal(line);
      updateInvoiceSummary();
    });
  });
  
  // Listener para botón de eliminar
  const removeBtn = line.querySelector('button[title="Eliminar línea"]');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const allLines = document.querySelectorAll('#invoice-lines > div.rounded-lg');
      if (allLines.length > 1) {
        line.remove();
        updateInvoiceSummary();
      } else {
        alert('Debe haber al menos un concepto en la factura');
      }
    });
  }
  
  return line;
}

/**
 * Recopilar datos del formulario
 * @returns {Object} Datos de la factura
 */
function collectFormData() {
  try {
    // Usar InvoiceDataHandler si está disponible para captura completa
    let rawData = null;
    if (window.invoiceDataHandler && typeof window.invoiceDataHandler.captureFormData === 'function') {
      rawData = window.invoiceDataHandler.captureFormData();
    }
    
    // Obtener datos básicos
    const clientName = document.getElementById('client-name')?.value || '';
    const issueDate = document.getElementById('issue-date')?.value || '';
    let invoiceNumber = document.getElementById('invoice-number')?.value || '';
    
    // Si el número está vacío o es placeholder, dejarlo para que se genere automáticamente
    if (!invoiceNumber || invoiceNumber.trim() === '' || invoiceNumber.toLowerCase() === 'automático') {
      invoiceNumber = '';
    }
    
    // Validar datos obligatorios con feedback visual
    const errors = [];
    
    if (!clientName || !clientName.trim()) {
      errors.push('El nombre del cliente es obligatorio');
      highlightField('client-name', true);
    } else {
      highlightField('client-name', false);
    }
    
    if (!issueDate) {
      errors.push('La fecha de emisión es obligatoria');
      highlightField('issue-date', true);
    } else {
      highlightField('issue-date', false);
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join('. '));
    }
    
    // Calcular totales desde el resumen
    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;
    
    if (rawData && rawData.summary) {
      subtotal = parseFloat(rawData.summary.subtotal) || 0;
      taxAmount = parseFloat(rawData.summary.tax) || 0;
      totalAmount = parseFloat(rawData.summary.total) || 0;
    } else {
      // Fallback: obtener desde los elementos del DOM
      const subtotalElement = document.querySelector('[data-summary="subtotal"]');
      const taxElement = document.querySelector('[data-summary="tax"]');
      const totalElement = document.querySelector('[data-summary="total"]');
      
      subtotal = parseFloat(subtotalElement?.textContent?.replace(/[^0-9,.-]/g, '')?.replace(',', '.')) || 0;
      taxAmount = parseFloat(taxElement?.textContent?.replace(/[^0-9,.-]/g, '')?.replace(',', '.')) || 0;
      totalAmount = parseFloat(totalElement?.textContent?.replace(/[^0-9,.-]/g, '')?.replace(',', '.')) || 0;
    }
    
    // Preparar objeto de factura en formato Supabase
    const formData = {
      invoice_series: document.getElementById('invoice-series')?.value || 'A',
      invoice_number: invoiceNumber,
      client_name: clientName.trim(),
      issue_date: issueDate,
      due_date: document.getElementById('due-date')?.value || null,
      currency: document.getElementById('invoice-currency')?.value || 'EUR',
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      
      invoice_data: {
        issuer: {
          name: document.getElementById('issuer-name')?.value || '',
          nif: document.getElementById('issuer-nif')?.value || '',
          email: document.getElementById('issuer-email')?.value || '',
          address: document.getElementById('issuer-address')?.value || '',
          postalCode: document.getElementById('issuer-postal-code')?.value || ''
        },
        client: {
          name: clientName.trim(),
          nif: document.getElementById('client-nif')?.value || '',
          email: document.getElementById('client-email')?.value || '',
          address: document.getElementById('client-address')?.value || '',
          postalCode: document.getElementById('client-postal-code')?.value || ''
        },
        invoice: {
          number: invoiceNumber,
          reference: document.getElementById('invoice-reference')?.value || '',
          series: document.getElementById('invoice-series')?.value || 'A'
        },
        payment: {
          terms: document.getElementById('payment-terms')?.value || '',
          termsLabel: (function() {
            var sel = document.getElementById('payment-terms');
            return sel ? sel.options[sel.selectedIndex]?.text || '' : '';
          })()
        },
        dates: {
          issue: issueDate,
          due: document.getElementById('due-date')?.value || null,
          operation: document.getElementById('operation-date')?.value || ''
        },
        concepts: rawData?.concepts || [],
        expenses: rawData?.expenses || [],
        taxSettings: rawData?.taxSettings || {},
        paymentMethods: rawData?.paymentMethods || [],
        options: {
          recargoEquivalencia: document.getElementById('recargo-equivalencia')?.checked || false,
          gastosSuplidos: parseFloat(document.getElementById('gastos-suplidos-amount')?.value) || 0,
          observaciones: (function() {
            var cb = document.getElementById('observaciones');
            if (!cb || !cb.checked) return null;
            var field = document.getElementById('observaciones-field');
            if (!field || field.classList.contains('hidden')) return null;
            var ta = field.querySelector('textarea');
            return ta && ta.value.trim() ? ta.value.trim() : null;
          })()
        },
        adjustments: {
          discount: parseFloat(document.getElementById('discount')?.value) || 0,
          withholding: parseFloat(document.getElementById('withholding')?.value) || 0
        },
        summary: {
          subtotal: subtotal,
          tax: taxAmount,
          total: totalAmount,
          paid: rawData?.summary?.paid || 0,
          totalToPay: rawData?.summary?.totalToPay || totalAmount
        }
      }
    };
    
    return formData;
    
  } catch (error) {
    console.error('❌ Error al recopilar datos del formulario:', error);
    throw error;
  }
}

/**
 * Guardar borrador
 */
async function saveDraft() {
  try {
    if (!window.createInvoice || !window.updateInvoice) {
      showToastMessage('El módulo de facturas no está cargado. Recarga la página.', 'error');
      return;
    }
    
    if (!window.supabaseClient) {
      showToastMessage('No hay conexión con la base de datos. Recarga la página.', 'error');
      return;
    }
    
    let formData;
    try {
      formData = collectFormData();
    } catch (error) {
      showToastMessage(error.message || 'Error al recopilar los datos del formulario', 'error');
      return;
    }
    
    let result;
    if (isEditMode && currentDraftId) {
      result = await window.updateInvoice(currentDraftId, formData);
    } else {
      result = await window.createInvoice(formData, 'draft');
    }
    
    if (!result.success) {
      showToastMessage(result.error || 'Error al guardar el borrador', 'error');
      return;
    }
    
    showToastMessage('Borrador guardado correctamente', 'success');
    
    setTimeout(() => {
      window.location.href = 'drafts.html';
    }, 1500);
    
  } catch (error) {
    console.error('Error en saveDraft:', error);
    showToastMessage(error.message || 'Error al guardar el borrador', 'error');
  }
}

/**
 * Ir a vista previa
 */
async function goToPreview() {
  try {
    if (!window.createInvoice || !window.updateInvoice) {
      showToastMessage('El sistema aún está cargando. Espera unos segundos.', 'error');
      return;
    }
    
    let draftId = currentDraftId;
    
    if (!draftId) {
      try {
        const formData = collectFormData();
        const result = await window.createInvoice(formData, 'draft');
        
        if (!result.success) {
          showToastMessage(result.error || 'Error al guardar el borrador', 'error');
          return;
        }
        
        draftId = result.data.id;
        currentDraftId = draftId;
        showToastMessage('Borrador guardado correctamente', 'success');
      } catch (error) {
        showToastMessage(error.message || 'Error al guardar el borrador', 'error');
        return;
      }
    } else if (isEditMode) {
      try {
        const formData = collectFormData();
        const result = await window.updateInvoice(draftId, formData);
        
        if (!result.success) {
          showToastMessage(result.error || 'Error al guardar cambios', 'error');
          return;
        }
      } catch (error) {
        showToastMessage(error.message || 'Error al actualizar', 'error');
        return;
      }
    }
    
    window.location.href = `preview.html?draft=${draftId}`;
    
  } catch (error) {
    console.error('Error en goToPreview:', error);
    showToastMessage(error.message || 'Error al ir a vista previa', 'error');
  }
}

/**
 * Mostrar notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success' | 'error' | 'warning'
 */
function showToastMessage(message, type = 'success') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Usar la función global showToast si está disponible
  if (window.showToast && typeof window.showToast === 'function') {
    try {
      window.showToast(message, type);
    } catch (e) {
      console.error('Error al mostrar toast:', e);
      alert(message);
    }
  } else {
    // Fallback a alert
    alert(message);
  }
}

/**
 * Resaltar campo con error o quitar el resaltado
 * @param {string} fieldId - ID del campo
 * @param {boolean} hasError - Si tiene error
 */
function highlightField(fieldId, hasError) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  // Si el campo tiene altInput de flatpickr, usar ese
  const target = field._flatpickr ? field._flatpickr.altInput || field : field;
  
  if (hasError) {
    target.classList.add('border-red-400', 'ring-2', 'ring-red-100');
    target.classList.remove('border-bgray-200');
    // Scroll al primer campo con error
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Quitar el resaltado cuando el usuario escriba
    const removeHighlight = function() {
      highlightField(fieldId, false);
      target.removeEventListener('input', removeHighlight);
      target.removeEventListener('change', removeHighlight);
    };
    target.addEventListener('input', removeHighlight);
    target.addEventListener('change', removeHighlight);
  } else {
    target.classList.remove('border-red-400', 'ring-2', 'ring-red-100');
    target.classList.add('border-bgray-200');
  }
}

// Exportar funciones globalmente
window.initNewPage = initNewPage;
window.saveDraft = saveDraft;
window.goToPreview = goToPreview;
window.collectFormData = collectFormData;
window.loadInvoiceLines = loadInvoiceLines;
window.highlightField = highlightField;

console.log('✅ new-page.js cargado');
