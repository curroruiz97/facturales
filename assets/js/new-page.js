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
    console.log('🔄 Inicializando página de factura...');
    
    // Verificar si estamos editando un borrador
    const urlParams = new URLSearchParams(window.location.search);
    currentDraftId = urlParams.get('draft');
    
    if (currentDraftId) {
      isEditMode = true;
      console.log('✏️ Modo edición - Cargando borrador:', currentDraftId);
      await loadDraftToForm(currentDraftId);
    } else {
      console.log('➕ Modo creación - Formulario vacío');
    }
    
  } catch (error) {
    console.error('❌ Error al inicializar página:', error);
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
    
    // Fechas
    setValue('issue-date', invoice.issue_date);
    setValue('due-date', invoice.due_date);
    setValue('payment-terms', data.payment?.terms || '');
    setValue('operation-date', data.dates?.operation || '');
    
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
    
    // Conceptos (esto es complejo, necesitaría acceso a la función de agregar líneas)
    // Por ahora, se dejará para implementación manual
    
    // Opciones avanzadas
    if (data.options) {
      setCheckbox('recargo-equivalencia', data.options.recargoEquivalencia);
      setCheckbox('gastos-suplidos', data.options.gastosSuplidos > 0);
      setCheckbox('observaciones', !!data.options.observaciones);
    }
    
    // Ajustes fiscales
    if (data.adjustments) {
      setValue('discount', data.adjustments.discount || '');
      setValue('withholding', data.adjustments.withholding || '');
    }
    
    console.log('✅ Formulario poblado con datos del borrador');
    
  } catch (error) {
    console.error('❌ Error en populateFormWithData:', error);
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
 * Recopilar datos del formulario
 * @returns {Object} Datos de la factura
 */
function collectFormData() {
  // Nota: Esta función debe ser implementada según la estructura exacta del formulario
  // Aquí está el esqueleto básico
  
  const formData = {
    invoice_series: document.getElementById('invoice-series')?.value || 'A',
    client_name: document.getElementById('client-name')?.value || '',
    issue_date: document.getElementById('issue-date')?.value || '',
    due_date: document.getElementById('due-date')?.value || null,
    currency: document.getElementById('invoice-currency')?.value || 'EUR',
    
    // Estos valores deben ser calculados desde los conceptos
    subtotal: 0, // TODO: Calcular desde conceptos
    tax_amount: 0, // TODO: Calcular desde conceptos
    total_amount: 0, // TODO: Calcular desde conceptos
    
    invoice_data: {
      issuer: {
        name: document.getElementById('issuer-name')?.value || '',
        nif: document.getElementById('issuer-nif')?.value || '',
        email: document.getElementById('issuer-email')?.value || '',
        address: document.getElementById('issuer-address')?.value || '',
        postalCode: document.getElementById('issuer-postal-code')?.value || ''
      },
      client: {
        name: document.getElementById('client-name')?.value || '',
        nif: document.getElementById('client-nif')?.value || '',
        email: document.getElementById('client-email')?.value || '',
        address: document.getElementById('client-address')?.value || '',
        postalCode: document.getElementById('client-postal-code')?.value || ''
      },
      invoice: {
        reference: document.getElementById('invoice-reference')?.value || ''
      },
      payment: {
        terms: document.getElementById('payment-terms')?.value || ''
      },
      dates: {
        operation: document.getElementById('operation-date')?.value || ''
      },
      concepts: [], // TODO: Recopilar conceptos dinámicos
      options: {
        recargoEquivalencia: document.getElementById('recargo-equivalencia')?.checked || false,
        gastosSuplidos: 0, // TODO: Obtener valor si está habilitado
        observaciones: document.getElementById('observaciones')?.checked ? '' : null // TODO: Obtener texto
      },
      adjustments: {
        discount: parseFloat(document.getElementById('discount')?.value) || 0,
        withholding: parseFloat(document.getElementById('withholding')?.value) || 0
      }
    }
  };
  
  return formData;
}

/**
 * Guardar borrador
 */
async function saveDraft() {
  try {
    console.log('💾 Guardando borrador...');
    
    // Esperar módulos
    let attempts = 0;
    while ((!window.createInvoice || !window.updateInvoice) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Verificar que las funciones estén disponibles
    if (!window.createInvoice) {
      console.error('❌ window.createInvoice no está definido después de esperar');
      console.log('Funciones disponibles:', Object.keys(window).filter(k => k.includes('Invoice')));
      showToastMessage('Error: El módulo de facturas no está cargado correctamente', 'error');
      return;
    }
    
    if (!window.updateInvoice) {
      console.error('❌ window.updateInvoice no está definido después de esperar');
      showToastMessage('Error: El módulo de facturas no está cargado correctamente', 'error');
      return;
    }
    
    const formData = collectFormData();
    
    let result;
    if (isEditMode && currentDraftId) {
      // Actualizar borrador existente
      console.log('📝 Actualizando borrador existente...');
      result = await window.updateInvoice(currentDraftId, formData);
    } else {
      // Crear nuevo borrador
      console.log('➕ Creando nuevo borrador...');
      result = await window.createInvoice(formData, 'draft');
    }
    
    if (!result.success) {
      console.error('❌ Error al guardar:', result.error);
      showToastMessage(result.error || 'Error al guardar el borrador', 'error');
      return;
    }
    
    console.log('✅ Borrador guardado');
    showToastMessage('Borrador guardado correctamente', 'success');
    
    // Redirigir a borradores
    setTimeout(() => {
      window.location.href = 'drafts.html';
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error en saveDraft:', error);
    showToastMessage('Error al guardar el borrador', 'error');
  }
}

/**
 * Ir a vista previa
 */
async function goToPreview() {
  try {
    console.log('👁️ Preparando vista previa...');
    
    // Si estamos editando, actualizar el borrador primero
    if (isEditMode && currentDraftId) {
      console.log('📝 Actualizando borrador antes de vista previa...');
      
      let attempts = 0;
      while (!window.updateInvoice && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      const formData = collectFormData();
      const result = await window.updateInvoice(currentDraftId, formData);
      
      if (!result.success) {
        console.error('❌ Error al actualizar:', result.error);
        showToastMessage(result.error || 'Error al guardar cambios', 'error');
        return;
      }
      
      console.log('✅ Borrador actualizado');
    }
    
    // Redirigir a preview
    if (currentDraftId) {
      window.location.href = `preview.html?draft=${currentDraftId}`;
    } else {
      // Si es nuevo, ir a preview con datos del formulario (implementación futura)
      console.warn('⚠️ Vista previa de factura nueva sin guardar aún no implementada');
      showToastMessage('Guarda el borrador primero para ver la vista previa', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Error en goToPreview:', error);
    showToastMessage('Error al ir a vista previa', 'error');
  }
}

/**
 * Mostrar notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success' | 'error' | 'warning'
 */
function showToastMessage(message, type = 'success') {
  // Buscar función global de toast
  const toastFn = window.toast || window.showGlobalToast || window.displayToast;
  
  if (toastFn && typeof toastFn === 'function') {
    try {
      toastFn(message, type);
    } catch (e) {
      console.log(message);
    }
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Exportar funciones globalmente
window.initNewPage = initNewPage;
window.saveDraft = saveDraft;
window.goToPreview = goToPreview;
window.collectFormData = collectFormData;

console.log('✅ new-page.js cargado');
