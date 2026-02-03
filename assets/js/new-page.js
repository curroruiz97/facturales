/**
 * new-page.js
 * Script para la página de creación/edición de facturas
 */

let currentDraftId = null;
let isEditMode = false;
let hasInitialized = false;

/**
 * Inicializar la página
 */
async function initNewPage() {
  try {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;
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
    if (!data) {
      console.warn('⚠️ invoice_data vacío en el borrador');
      return;
    }
    
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

    // Recargo de equivalencia
    if (data.options) {
      setCheckbox('recargo-equivalencia', data.options.recargoEquivalencia);
    }

    // Gastos suplidos
    if (Array.isArray(data.expenses)) {
      populateExpenses(data.expenses);
    }

    // Observaciones
    if (data.options && typeof data.options.observaciones === 'string') {
      populateObservations(data.options.observaciones);
    }

    // Conceptos
    if (Array.isArray(data.concepts)) {
      populateConcepts(data.concepts);
    }
    
    console.log('✅ Formulario poblado con datos del borrador');
    
  } catch (error) {
    console.error('❌ Error en populateFormWithData:', error);
  }
}

function populateConcepts(concepts = []) {
  const addLineButton = document.getElementById('add-line');
  const container = addLineButton?.closest('section')?.querySelector('.space-y-4');
  if (!container) {
    console.warn('⚠️ Contenedor de conceptos no encontrado');
    return;
  }

  let existingLines = container.querySelectorAll(':scope > div.rounded-lg');
  if (concepts.length > 0 && existingLines.length > concepts.length) {
    for (let i = existingLines.length - 1; i >= concepts.length; i -= 1) {
      existingLines[i].remove();
    }
  }

  existingLines = container.querySelectorAll(':scope > div.rounded-lg');
  const missingLines = concepts.length - existingLines.length;
  if (missingLines > 0 && typeof window.addConceptLine === 'function') {
    for (let i = 0; i < missingLines; i += 1) {
      window.addConceptLine();
    }
  }

  const lines = container.querySelectorAll(':scope > div.rounded-lg');
  lines.forEach((line, index) => {
    const concept = concepts[index];
    if (!concept) {
      return;
    }

    const inputs = line.querySelectorAll('input');
    const selects = line.querySelectorAll('select');

    if (inputs[0]) inputs[0].value = concept.description || '';
    if (inputs[1]) inputs[1].value = concept.quantity ?? 0;
    if (inputs[2]) inputs[2].value = concept.unitPrice ?? 0;
    if (inputs[3]) inputs[3].value = concept.discount ?? 0;

    if (selects[0]) {
      const taxValue = resolveTaxValue(concept.tax, selects[0]);
      if (taxValue) {
        selects[0].value = taxValue;
      }
    }

    if (typeof window.updateConceptTotal === 'function') {
      window.updateConceptTotal(line);
    }
  });
}

function resolveTaxValue(tax, selectElement) {
  if (typeof tax === 'string' && tax) {
    return tax;
  }

  const taxNumber = Number(tax);
  if (Number.isNaN(taxNumber)) {
    return selectElement.value;
  }

  const map = {
    21: 'IVA_21',
    10: 'IVA_10',
    4: 'IVA_4',
    0: 'IVA_0',
    7: 'IGIC_7',
    3: 'IGIC_3'
  };

  return map[taxNumber] || selectElement.value;
}

function populateExpenses(expenses = []) {
  if (!expenses.length) {
    return;
  }

  const checkbox = document.getElementById('gastos-suplidos');
  const container = document.getElementById('gastos-suplidos-fields');
  if (!container) {
    return;
  }

  if (checkbox) {
    checkbox.checked = true;
  }

  if (typeof window.toggleConditionalField === 'function') {
    window.toggleConditionalField('gastos-suplidos', 'gastos-suplidos-fields');
  } else {
    container.classList.remove('hidden');
  }

  const inputs = container.querySelectorAll('input');
  const firstExpense = expenses[0] || {};
  if (inputs[0]) inputs[0].value = firstExpense.description || '';
  if (inputs[1]) inputs[1].value = firstExpense.amount ?? 0;
}

function populateObservations(observaciones) {
  const checkbox = document.getElementById('observaciones');
  const container = document.getElementById('observaciones-field');
  if (checkbox) {
    checkbox.checked = Boolean(observaciones);
  }

  if (container) {
    if (typeof window.toggleConditionalField === 'function') {
      window.toggleConditionalField('observaciones', 'observaciones-field');
    } else {
      container.classList.remove('hidden');
    }

    const textarea = container.querySelector('textarea');
    if (textarea) {
      textarea.value = observaciones || '';
    }
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
  try {
    console.log('📋 Recopilando datos del formulario...');
    
    // Usar InvoiceDataHandler si está disponible para captura completa
    let rawData = null;
    if (window.invoiceDataHandler && typeof window.invoiceDataHandler.captureFormData === 'function') {
      rawData = window.invoiceDataHandler.captureFormData();
      console.log('✅ Datos capturados con InvoiceDataHandler:', rawData);
    }
    
    // Obtener datos básicos
    const clientName = document.getElementById('client-name')?.value || '';
    const issueDate = document.getElementById('issue-date')?.value || '';
    let invoiceNumber = document.getElementById('invoice-number')?.value || '';
    
    // Si el número está vacío o es placeholder, dejarlo para que se genere automáticamente
    if (!invoiceNumber || invoiceNumber.trim() === '' || invoiceNumber.toLowerCase() === 'automático') {
      invoiceNumber = null;
    }
    
    // Validar datos obligatorios
    if (!clientName || !clientName.trim()) {
      throw new Error('El nombre del cliente es obligatorio');
    }
    
    if (!issueDate) {
      throw new Error('La fecha de emisión es obligatoria');
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
          number: invoiceNumber || '',
          reference: document.getElementById('invoice-reference')?.value || '',
          series: document.getElementById('invoice-series')?.value || 'A'
        },
        payment: {
          terms: document.getElementById('payment-terms')?.value || ''
        },
        dates: {
          issue: issueDate,
          due: document.getElementById('due-date')?.value || null,
          operation: document.getElementById('operation-date')?.value || ''
        },
        concepts: rawData?.concepts || [],
        expenses: rawData?.expenses || [],
        taxSettings: rawData?.taxSettings || {},
        options: {
          recargoEquivalencia: document.getElementById('recargo-equivalencia')?.checked || false,
          gastosSuplidos: 0,
          observaciones: document.querySelector('#observaciones-field textarea')?.value || null
        },
        adjustments: {
          discount: parseFloat(document.getElementById('discount')?.value) || 0,
          withholding: parseFloat(document.getElementById('withholding')?.value) || 0
        },
        summary: {
          subtotal: subtotal,
          tax: taxAmount,
          total: totalAmount
        }
      }
    };
    
    console.log('✅ Datos del formulario recopilados:', formData);
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
    console.log('💾 Guardando borrador...');
    console.log('📊 Estado de módulos:', {
      createInvoice: typeof window.createInvoice,
      updateInvoice: typeof window.updateInvoice,
      supabaseClient: typeof window.supabaseClient
    });
    
    // Verificar que las funciones estén disponibles INMEDIATAMENTE
    if (!window.createInvoice) {
      const availableFunctions = Object.keys(window).filter(k => k.toLowerCase().includes('invoice'));
      console.error('❌ window.createInvoice no está definido');
      console.error('Funciones disponibles con "invoice":', availableFunctions);
      showToastMessage('Error: El módulo de facturas no está cargado. Por favor, recarga la página.', 'error');
      return;
    }
    
    if (!window.updateInvoice) {
      console.error('❌ window.updateInvoice no está definido');
      showToastMessage('Error: El módulo de facturas no está cargado. Por favor, recarga la página.', 'error');
      return;
    }
    
    // Verificar Supabase
    if (!window.supabaseClient) {
      console.error('❌ Supabase no está inicializado');
      showToastMessage('Error: No hay conexión con la base de datos. Por favor, recarga la página.', 'error');
      return;
    }
    
    // Recopilar datos del formulario
    console.log('📋 Recopilando datos del formulario...');
    let formData;
    try {
      formData = collectFormData();
      console.log('✅ Datos recopilados:', {
        cliente: formData.client_name,
        fecha: formData.issue_date,
        total: formData.total_amount,
        conceptos: formData.invoice_data?.concepts?.length || 0
      });
    } catch (error) {
      console.error('❌ Error al recopilar datos:', error);
      showToastMessage(error.message || 'Error al recopilar los datos del formulario', 'error');
      return;
    }
    
    // Guardar o actualizar
    let result;
    if (isEditMode && currentDraftId) {
      // Actualizar borrador existente
      console.log('📝 Actualizando borrador existente:', currentDraftId);
      result = await window.updateInvoice(currentDraftId, formData);
    } else {
      // Crear nuevo borrador
      console.log('➕ Creando nuevo borrador...');
      result = await window.createInvoice(formData, 'draft');
    }
    
    console.log('📤 Resultado de guardado:', result);
    
    if (!result.success) {
      console.error('❌ Error al guardar:', result.error);
      showToastMessage(result.error || 'Error al guardar el borrador', 'error');
      return;
    }
    
    console.log('✅ Borrador guardado exitosamente:', result.data);
    showToastMessage('Borrador guardado correctamente', 'success');
    
    // Redirigir a borradores después de un breve delay
    setTimeout(() => {
      console.log('🔄 Redirigiendo a borradores...');
      window.location.href = 'drafts.html';
    }, 1500);
    
  } catch (error) {
    console.error('❌ Error en saveDraft:', error);
    console.error('Stack trace:', error.stack);
    showToastMessage(error.message || 'Error al guardar el borrador', 'error');
  }
}

/**
 * Ir a vista previa
 */
async function goToPreview() {
  try {
    console.log('👁️ Preparando vista previa...');
    
    // Verificar que los módulos estén disponibles
    if (!window.createInvoice || !window.updateInvoice) {
      console.error('❌ Módulos de facturas no disponibles');
      showToastMessage('Error: El sistema aún está cargando. Espera unos segundos.', 'error');
      return;
    }
    
    let draftId = currentDraftId;
    
    // Si NO tenemos un ID de borrador, crear uno nuevo primero
    if (!draftId) {
      console.log('📝 Creando borrador antes de vista previa...');
      
      try {
        const formData = collectFormData();
        const result = await window.createInvoice(formData, 'draft');
        
        if (!result.success) {
          console.error('❌ Error al crear borrador:', result.error);
          showToastMessage(result.error || 'Error al guardar el borrador', 'error');
          return;
        }
        
        draftId = result.data.id;
        currentDraftId = draftId;
        console.log('✅ Borrador creado:', draftId);
        showToastMessage('Borrador guardado correctamente', 'success');
      } catch (error) {
        console.error('❌ Error al crear borrador:', error);
        showToastMessage(error.message || 'Error al guardar el borrador', 'error');
        return;
      }
    }
    // Si estamos editando un borrador existente, actualizarlo primero
    else if (isEditMode) {
      console.log('📝 Actualizando borrador antes de vista previa...');
      
      try {
        const formData = collectFormData();
        const result = await window.updateInvoice(draftId, formData);
        
        if (!result.success) {
          console.error('❌ Error al actualizar:', result.error);
          showToastMessage(result.error || 'Error al guardar cambios', 'error');
          return;
        }
        
        console.log('✅ Borrador actualizado');
      } catch (error) {
        console.error('❌ Error al actualizar borrador:', error);
        showToastMessage(error.message || 'Error al actualizar', 'error');
        return;
      }
    }
    
    // Redirigir a preview con el ID del borrador
    console.log('🔄 Redirigiendo a preview con ID:', draftId);
    window.location.href = `preview.html?draft=${draftId}`;
    
  } catch (error) {
    console.error('❌ Error en goToPreview:', error);
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

// Exportar funciones globalmente
window.initNewPage = initNewPage;
window.saveDraft = saveDraft;
window.goToPreview = goToPreview;
window.collectFormData = collectFormData;

console.log('✅ new-page.js cargado');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNewPage);
} else {
  initNewPage();
}
