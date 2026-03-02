/**
 * issued-page.js
 * Script para la página de facturas emitidas
 */

// Sanitización XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

let allIssuedInvoices = [];
let currentCancelId = null;
let emailStatusMap = {}; // { invoiceId: { status, to_email } }

/**
 * Cargar y renderizar todas las facturas emitidas
 */
async function loadIssuedInvoices() {
  try {
    console.log('🔄 Cargando facturas emitidas...');
    
    // Esperar a que los módulos estén disponibles
    let attempts = 0;
    while (!window.getInvoices && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.getInvoices) {
      console.error('❌ Módulo de facturas no disponible');
      return;
    }
    
    // Obtener facturas emitidas (issued) y anuladas (cancelled)
    const resultIssued = await window.getInvoices({ status: 'issued' });
    const resultCancelled = await window.getInvoices({ status: 'cancelled' });
    
    if (!resultIssued.success) {
      console.error('❌ Error al cargar facturas emitidas:', resultIssued.error);
      _showIssuedToast('Error al cargar facturas', 'error');
      return;
    }
    
    // Combinar emitidas y anuladas
    allIssuedInvoices = [
      ...(resultIssued.data || []),
      ...(resultCancelled.success ? resultCancelled.data || [] : [])
    ];
    
    console.log(`✅ ${allIssuedInvoices.length} facturas cargadas`);

    // Actualizar contador (solo emitidas activas)
    const counterElement = document.getElementById('issued-count');
    if (counterElement) {
      counterElement.textContent = resultIssued.data?.length || 0;
    }

    // Cargar estado de envío por email desde document_email_log
    await loadEmailStatuses(allIssuedInvoices.map(inv => inv.id));

    // Renderizar tabla
    renderIssuedTable(allIssuedInvoices);
    
  } catch (error) {
    console.error('❌ Error en loadIssuedInvoices:', error);
    _showIssuedToast('Error al cargar facturas', 'error');
  }
}

/**
 * Cargar estados de envío por email consultando document_email_log
 * @param {Array<string>} invoiceIds - IDs de las facturas
 */
async function loadEmailStatuses(invoiceIds) {
  emailStatusMap = {};
  if (!invoiceIds.length) return;

  try {
    let attempts = 0;
    while (!window.supabaseClient && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!window.supabaseClient) return;

    const supabase = window.supabaseClient;

    const { data, error } = await supabase
      .from('document_email_log')
      .select('document_id, status, to_email')
      .eq('document_type', 'invoice')
      .in('document_id', invoiceIds);

    if (error) {
      console.error('❌ Error al consultar document_email_log:', error);
      return;
    }

    // Para cada factura, guardar el mejor estado (sent > queued > failed)
    const priority = { sent: 3, queued: 2, failed: 1 };
    (data || []).forEach(row => {
      const current = emailStatusMap[row.document_id];
      if (!current || (priority[row.status] || 0) > (priority[current.status] || 0)) {
        emailStatusMap[row.document_id] = { status: row.status, to_email: row.to_email };
      }
    });

    console.log(`✅ Estados de email cargados para ${Object.keys(emailStatusMap).length} facturas`);
  } catch (err) {
    console.error('❌ Error en loadEmailStatuses:', err);
  }
}

/**
 * Renderizar tabla de facturas emitidas
 * @param {Array} invoices - Lista de facturas
 */
function renderIssuedTable(invoices) {
  const tbody = document.getElementById('issued-table-body');
  
  if (!tbody) {
    console.error('❌ Elemento issued-table-body no encontrado');
    return;
  }
  
  // Limpiar tabla
  tbody.innerHTML = '';
  
  // Si no hay facturas, mostrar mensaje
  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <svg class="stroke-bgray-400 dark:stroke-bgray-500" width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="8" width="40" height="48" rx="4" stroke-width="2"/>
              <line x1="20" y1="20" x2="44" y2="20" stroke-width="2" stroke-linecap="round"/>
              <line x1="20" y1="28" x2="44" y2="28" stroke-width="2" stroke-linecap="round"/>
              <line x1="20" y1="36" x2="36" y2="36" stroke-width="2" stroke-linecap="round"/>
              <polyline points="38,32 42,36 50,28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <p class="text-lg font-semibold text-bgray-900 dark:text-white">No hay facturas emitidas aún</p>
              <p class="mt-1 text-sm text-bgray-600 dark:text-bgray-50">Emite tu primera factura para comenzar</p>
            </div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Renderizar cada factura
  invoices.forEach(invoice => {
    const row = createIssuedRow(invoice);
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

/**
 * Crear HTML de una fila de factura emitida
 * @param {Object} invoice - Datos de la factura
 * @returns {string} HTML de la fila
 */
function createIssuedRow(invoice) {
  const invoiceNumber = invoice.invoice_number || 'Sin número';
  const clientName = invoice.client_name || 'Sin cliente';
  const clientNif = invoice.invoice_data?.client?.nif || '-';
  const issueDate = window.formatDate ? window.formatDate(invoice.issue_date) : invoice.issue_date;
  const dueDate = invoice.due_date ? (window.formatDate ? window.formatDate(invoice.due_date) : invoice.due_date) : '-';
  const totalAmount = window.formatCurrency ? window.formatCurrency(invoice.total_amount, invoice.currency) : `${invoice.total_amount} ${invoice.currency}`;
  
  // Badge de estado de pago
  const isPaid = invoice.is_paid;
  const isCancelled = invoice.status === 'cancelled';
  
  let paymentBadge;
  if (isCancelled) {
    paymentBadge = `
      <span class="inline-flex items-center rounded-lg bg-bgray-100 px-3 py-1 text-xs font-semibold text-bgray-500 dark:bg-darkblack-500 dark:text-bgray-400 line-through">
        Anulada
      </span>
    `;
  } else {
    paymentBadge = `
      <button 
        onclick="togglePaymentStatus('${invoice.id}', ${!isPaid})" 
        class="inline-flex items-center rounded-lg ${isPaid ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400' : 'text-error-300 hover:opacity-80 dark:bg-darkblack-500'} px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
        ${isPaid ? '' : 'style="background-color: rgba(221,51,51,0.1);"'}
      >
        ${isPaid ? 'Pagada' : 'No pagada'}
      </button>
    `;
  }
  
  // Badge de estado de envío por email
  const emailInfo = emailStatusMap[invoice.id] || null;
  const emailStatus = emailInfo ? emailInfo.status : null;
  const emailTo = emailInfo ? emailInfo.to_email : '';
  let emailBadge;
  if (emailStatus === 'sent') {
    emailBadge = `
      <span class="inline-flex items-center rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400 cursor-default" title="Enviada a: ${escapeHtml(emailTo)}">
        Enviada
      </span>
    `;
  } else {
    emailBadge = `
      <span class="inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold text-error-300 dark:bg-darkblack-500" style="background-color: rgba(221,51,51,0.1);">
        No enviada
      </span>
    `;
  }

  // Botones de acción
  let actionButtons;
  if (isCancelled) {
    // Solo mostrar botón de ver (sin acciones)
    actionButtons = `
      <div class="inline-flex items-center gap-2">
        <button
          onclick="viewInvoice('${invoice.id}')"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400"
          type="button"
          title="Ver"
        >
          <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 12C10.6569 12 12 10.6569 12 9C12 7.34315 10.6569 6 9 6C7.34315 6 6 7.34315 6 9C6 10.6569 7.34315 12 9 12Z" stroke-width="1.5"/>
            <path d="M2.25 9C2.25 9 4.5 3.75 9 3.75C13.5 3.75 15.75 9 15.75 9C15.75 9 13.5 14.25 9 14.25C4.5 14.25 2.25 9 2.25 9Z" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    `;
  } else {
    actionButtons = `
      <div class="inline-flex items-center gap-2">
        <!-- Botón Ver -->
        <button
          onclick="viewInvoice('${invoice.id}')"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400"
          type="button"
          title="Ver"
        >
          <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 12C10.6569 12 12 10.6569 12 9C12 7.34315 10.6569 6 9 6C7.34315 6 6 7.34315 6 9C6 10.6569 7.34315 12 9 12Z" stroke-width="1.5"/>
            <path d="M2.25 9C2.25 9 4.5 3.75 9 3.75C13.5 3.75 15.75 9 15.75 9C15.75 9 13.5 14.25 9 14.25C4.5 14.25 2.25 9 2.25 9Z" stroke-width="1.5"/>
          </svg>
        </button>
        
        <!-- Botón Anular -->
        <button
          onclick="openCancelModal('${invoice.id}')"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400"
          type="button"
          title="Anular"
        >
          <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke-width="1.5"/>
            <path d="M5.25 5.25L12.75 12.75" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
  }
  
  // Aplicar estilo gris si está anulada
  const rowClass = isCancelled ? 'border-b border-bgray-200 dark:border-darkblack-400 opacity-60' : 'border-b border-bgray-200 dark:border-darkblack-400';
  
  return `
    <tr class="${rowClass}">
      <!-- Columna: Factura -->
      <td class="py-5 pr-6">
        <div class="flex flex-col">
          <p class="text-sm font-semibold text-bgray-900 dark:text-white ${isCancelled ? 'line-through' : ''}">${escapeHtml(invoiceNumber)}</p>
          <p class="text-xs text-bgray-600 dark:text-bgray-50">Serie ${escapeHtml(invoice.invoice_series)}</p>
        </div>
      </td>
      
      <!-- Columna: Cliente -->
      <td class="px-6 py-5">
        <div class="flex flex-col">
          <p class="text-sm font-medium text-bgray-900 dark:text-white">${escapeHtml(clientName)}</p>
          <p class="text-xs text-bgray-600 dark:text-bgray-50">${escapeHtml(clientNif)}</p>
        </div>
      </td>
      
      <!-- Columna: Fechas -->
      <td class="px-6 py-5">
        <div class="flex flex-col gap-1">
          <p class="text-sm text-bgray-900 dark:text-white">${issueDate}</p>
          <p class="text-xs text-bgray-600 dark:text-bgray-50">Vence: ${dueDate}</p>
        </div>
      </td>
      
      <!-- Columna: Importe -->
      <td class="px-6 py-5">
        <p class="text-sm font-semibold text-bgray-900 dark:text-white">${totalAmount}</p>
      </td>
      
      <!-- Columna: Estado -->
      <td class="px-6 py-5">
        <div class="inline-flex flex-col gap-1.5 items-start">
          ${paymentBadge}
          ${emailBadge}
        </div>
      </td>
      
      <!-- Columna: Acciones -->
      <td class="py-5 pl-6 text-right">
        ${actionButtons}
      </td>
    </tr>
  `;
}

/**
 * Ver una factura (redirigir a preview en modo lectura)
 * @param {string} invoiceId - ID de la factura
 */
function viewInvoice(invoiceId) {
  console.log('👁️ Viendo factura:', invoiceId);
  window.location.href = `preview.html?invoice=${invoiceId}`;
}

/**
 * Alternar estado de pago de una factura
 * @param {string} invoiceId - ID de la factura
 * @param {boolean} newPaidStatus - Nuevo estado de pago
 */
async function togglePaymentStatus(invoiceId, newPaidStatus) {
  try {
    console.log(`🔄 Cambiando estado de pago a: ${newPaidStatus ? 'Pagada' : 'No pagada'}`);
    
    const result = await window.togglePaidStatus(invoiceId, newPaidStatus);
    
    if (!result.success) {
      console.error('❌ Error al cambiar estado:', result.error);
      _showIssuedToast(result.error || 'Error al actualizar el estado de pago', 'error');
      return;
    }
    
    console.log('✅ Estado de pago actualizado');
    _showIssuedToast(newPaidStatus ? 'Factura marcada como pagada' : 'Factura marcada como no pagada', 'success');
    
    // Recargar lista para actualizar UI
    await loadIssuedInvoices();
    
  } catch (error) {
    console.error('❌ Error en togglePaymentStatus:', error);
    _showIssuedToast('Error al actualizar el estado de pago', 'error');
  }
}

/**
 * Abrir modal de confirmación de anulación
 * @param {string} invoiceId - ID de la factura
 * @param {string} invoiceNumber - Número de factura
 */
function openCancelModal(invoiceId) {
  currentCancelId = invoiceId;
  const inv = allIssuedInvoices.find(i => i.id === invoiceId);
  const invoiceNumber = inv ? (inv.invoice_number || 'Sin número') : 'Sin número';
  
  const modal = document.getElementById('cancel-confirm-modal');
  const nameElement = document.getElementById('cancel-invoice-name');
  
  if (modal && nameElement) {
    nameElement.textContent = `Factura: ${invoiceNumber}`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Cerrar modal de anulación
 */
function closeCancelModal() {
  const modal = document.getElementById('cancel-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  currentCancelId = null;
}

/**
 * Confirmar anulación de factura
 */
async function confirmCancelInvoice() {
  if (!currentCancelId) return;
  
  try {
    console.log('🚫 Anulando factura:', currentCancelId);
    
    const result = await window.deleteInvoice(currentCancelId);
    
    if (!result.success) {
      console.error('❌ Error al anular:', result.error);
      _showIssuedToast(result.error || 'Error al anular la factura', 'error');
      return;
    }
    
    console.log('✅ Factura anulada');
    
    // Cerrar modal primero
    closeCancelModal();
    
    _showIssuedToast('Factura anulada correctamente', 'success');
    
    // Recargar lista
    await loadIssuedInvoices();
    
  } catch (error) {
    console.error('❌ Error en confirmCancelInvoice:', error);
    _showIssuedToast('Error al anular la factura', 'error');
  }
}

/**
 * Manejar búsqueda de facturas emitidas
 * @param {string} searchTerm - Término de búsqueda
 */
function handleSearchIssued(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    renderIssuedTable(allIssuedInvoices);
    return;
  }
  
  const term = searchTerm.toLowerCase().trim();
  const filtered = allIssuedInvoices.filter(invoice => {
    return (
      invoice.invoice_number?.toLowerCase().includes(term) ||
      invoice.client_name?.toLowerCase().includes(term) ||
      invoice.invoice_data?.client?.nif?.toLowerCase().includes(term)
    );
  });
  
  renderIssuedTable(filtered);
}

/**
 * Mostrar notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success' | 'error'
 */
function _showIssuedToast(message, type) {
  // Usar la función global de toast.js (NO sobreescribir window.showToast)
  if (typeof window.showToast === 'function' && window.showToast !== _showIssuedToast) {
    window.showToast(message, type || 'success');
  } else {
    alert(message);
  }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ issued-page.js inicializado');
  loadIssuedInvoices();
});

// Exportar funciones globalmente
window.loadIssuedInvoices = loadIssuedInvoices;
window.viewInvoice = viewInvoice;
window.togglePaymentStatus = togglePaymentStatus;
window.openCancelModal = openCancelModal;
window.closeCancelModal = closeCancelModal;
window.confirmCancelInvoice = confirmCancelInvoice;
window.handleSearchIssued = handleSearchIssued;
