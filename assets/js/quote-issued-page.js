/**
 * quote-issued-page.js
 * Script para la página de presupuestos emitidos
 */

// Sanitización XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

let allIssuedQuotes = [];
let currentCancelId = null;

/**
 * Cargar y renderizar todos los presupuestos emitidos
 */
async function loadIssuedQuotes() {
  try {
    console.log('🔄 Cargando presupuestos emitidos...');
    
    // Esperar a que los módulos estén disponibles
    let attempts = 0;
    while (!window.getQuotes && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.getQuotes) {
      console.error('❌ Módulo de presupuestos no disponible');
      return;
    }
    
    // Obtener presupuestos emitidos (issued) y anulados (cancelled)
    const resultIssued = await window.getQuotes({ status: 'issued' });
    const resultCancelled = await window.getQuotes({ status: 'cancelled' });
    
    if (!resultIssued.success) {
      console.error('❌ Error al cargar presupuestos emitidos:', resultIssued.error);
      showQuoteToast('Error al cargar presupuestos', 'error');
      return;
    }
    
    // Combinar emitidos y anulados
    allIssuedQuotes = [
      ...(resultIssued.data || []),
      ...(resultCancelled.success ? resultCancelled.data || [] : [])
    ];
    
    console.log(`✅ ${allIssuedQuotes.length} presupuestos cargados`);
    
    // Actualizar contador (solo emitidos activos)
    const counterElement = document.getElementById('issued-count');
    if (counterElement) {
      counterElement.textContent = resultIssued.data?.length || 0;
    }
    
    // Renderizar tabla
    renderIssuedTable(allIssuedQuotes);
    
  } catch (error) {
    console.error('❌ Error en loadIssuedQuotes:', error);
    showQuoteToast('Error al cargar presupuestos', 'error');
  }
}

/**
 * Renderizar tabla de presupuestos emitidos
 * @param {Array} quotes - Lista de presupuestos
 */
function renderIssuedTable(quotes) {
  const tbody = document.getElementById('issued-table-body');
  
  if (!tbody) {
    console.error('❌ Elemento issued-table-body no encontrado');
    return;
  }
  
  // Limpiar tabla
  tbody.innerHTML = '';
  
  // Si no hay presupuestos, mostrar mensaje
  if (quotes.length === 0) {
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
              <p class="text-lg font-semibold text-bgray-900 dark:text-white">No hay presupuestos emitidos aún</p>
              <p class="mt-1 text-sm text-bgray-600 dark:text-bgray-50">Emite tu primer presupuesto para comenzar</p>
            </div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Renderizar cada presupuesto
  quotes.forEach(quote => {
    const row = createIssuedRow(quote);
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

/**
 * Crear HTML de una fila de presupuesto emitido
 * @param {Object} quote - Datos del presupuesto
 * @returns {string} HTML de la fila
 */
function createIssuedRow(quote) {
  const quoteNumber = quote.quote_number || 'Sin número';
  const clientName = quote.client_name || 'Sin cliente';
  const clientNif = quote.quote_data?.client?.nif || '-';
  const issueDate = window.formatQuoteDate ? window.formatQuoteDate(quote.issue_date) : quote.issue_date;
  const dueDate = quote.due_date ? (window.formatQuoteDate ? window.formatQuoteDate(quote.due_date) : quote.due_date) : '-';
  const totalAmount = window.formatQuoteCurrency ? window.formatQuoteCurrency(quote.total_amount, quote.currency) : `${quote.total_amount} ${quote.currency}`;
  
  // Badge de estado de pago
  const isPaid = quote.is_paid;
  const isCancelled = quote.status === 'cancelled';
  
  let paymentBadge;
  if (isCancelled) {
    paymentBadge = `
      <span class="inline-flex items-center rounded-lg bg-bgray-100 px-3 py-1 text-xs font-semibold text-bgray-500 dark:bg-darkblack-500 dark:text-bgray-400 line-through">
        Anulado
      </span>
    `;
  } else {
    paymentBadge = `
      <button 
        onclick="togglePaymentStatus('${quote.id}', ${!isPaid})" 
        class="inline-flex items-center rounded-lg ${isPaid ? 'bg-success-50 text-success-300 hover:bg-success-100' : 'text-error-300 hover:opacity-80'} px-3 py-1 text-xs font-semibold dark:bg-darkblack-500 transition-colors cursor-pointer"
        ${isPaid ? '' : 'style="background-color: rgba(221,51,51,0.1);"'}
      >
        ${isPaid ? 'Pagado' : 'No pagado'}
      </button>
    `;
  }
  
  // Botones de acción
  let actionButtons;
  if (isCancelled) {
    // Solo mostrar botón de ver (sin acciones)
    actionButtons = `
      <div class="inline-flex items-center gap-2">
        <button
          onclick="viewQuote('${quote.id}')"
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
          onclick="viewQuote('${quote.id}')"
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
          onclick="openCancelModal('${quote.id}')"
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
  
  // Aplicar estilo gris si está anulado
  const rowClass = isCancelled ? 'border-b border-bgray-200 dark:border-darkblack-400 opacity-60' : 'border-b border-bgray-200 dark:border-darkblack-400';
  
  return `
    <tr class="${rowClass}">
      <!-- Columna: Presupuesto -->
      <td class="py-5 pr-6">
        <div class="flex flex-col">
          <p class="text-sm font-semibold text-bgray-900 dark:text-white ${isCancelled ? 'line-through' : ''}">${escapeHtml(quoteNumber)}</p>
          <p class="text-xs text-bgray-600 dark:text-bgray-50">Serie ${escapeHtml(quote.quote_series)}</p>
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
      
      <!-- Columna: Estado Pago -->
      <td class="px-6 py-5">
        ${paymentBadge}
      </td>
      
      <!-- Columna: Acciones -->
      <td class="py-5 pl-6 text-right">
        ${actionButtons}
      </td>
    </tr>
  `;
}

/**
 * Ver un presupuesto (redirigir a preview en modo lectura)
 * @param {string} quoteId - ID del presupuesto
 */
function viewQuote(quoteId) {
  console.log('👁️ Viendo presupuesto:', quoteId);
  window.location.href = `quote-preview.html?quote=${quoteId}`;
}

/**
 * Alternar estado de pago de un presupuesto
 * @param {string} quoteId - ID del presupuesto
 * @param {boolean} newPaidStatus - Nuevo estado de pago
 */
async function togglePaymentStatus(quoteId, newPaidStatus) {
  try {
    console.log(`🔄 Cambiando estado de pago a: ${newPaidStatus ? 'Pagado' : 'No pagado'}`);
    
    const result = await window.toggleQuotePaidStatus(quoteId, newPaidStatus);
    
    if (!result.success) {
      console.error('❌ Error al cambiar estado:', result.error);
      showQuoteToast(result.error || 'Error al actualizar el estado de pago', 'error');
      return;
    }
    
    console.log('✅ Estado de pago actualizado');
    showQuoteToast(newPaidStatus ? 'Presupuesto marcado como pagado' : 'Presupuesto marcado como no pagado', 'success');
    
    // Recargar lista para actualizar UI
    await loadIssuedQuotes();
    
  } catch (error) {
    console.error('❌ Error en togglePaymentStatus:', error);
    showQuoteToast('Error al actualizar el estado de pago', 'error');
  }
}

/**
 * Abrir modal de confirmación de anulación
 * @param {string} quoteId - ID del presupuesto
 * @param {string} quoteNumber - Número de presupuesto
 */
function openCancelModal(quoteId) {
  currentCancelId = quoteId;
  const q = allIssuedQuotes.find(i => i.id === quoteId);
  const quoteNumber = q ? (q.quote_number || 'Sin número') : 'Sin número';
  
  const modal = document.getElementById('cancel-confirm-modal');
  const nameElement = document.getElementById('cancel-invoice-name');
  
  if (modal && nameElement) {
    nameElement.textContent = `Presupuesto: ${quoteNumber}`;
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
 * Confirmar anulación de presupuesto
 */
async function confirmCancelQuote() {
  if (!currentCancelId) return;
  
  try {
    console.log('🚫 Anulando presupuesto:', currentCancelId);
    
    const result = await window.deleteQuote(currentCancelId);
    
    if (!result.success) {
      console.error('❌ Error al anular:', result.error);
      showQuoteToast(result.error || 'Error al anular el presupuesto', 'error');
      return;
    }
    
    console.log('✅ Presupuesto anulado');
    showQuoteToast('Presupuesto anulado correctamente', 'success');
    
    // Cerrar modal
    closeCancelModal();
    
    // Recargar lista
    await loadIssuedQuotes();
    
  } catch (error) {
    console.error('❌ Error en confirmCancelQuote:', error);
    showQuoteToast('Error al anular el presupuesto', 'error');
  }
}

/**
 * Manejar búsqueda de presupuestos emitidos
 * @param {string} searchTerm - Término de búsqueda
 */
function handleSearchIssued(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    renderIssuedTable(allIssuedQuotes);
    return;
  }
  
  const term = searchTerm.toLowerCase().trim();
  const filtered = allIssuedQuotes.filter(quote => {
    return (
      quote.quote_number?.toLowerCase().includes(term) ||
      quote.client_name?.toLowerCase().includes(term) ||
      quote.quote_data?.client?.nif?.toLowerCase().includes(term)
    );
  });
  
  renderIssuedTable(filtered);
}

/**
 * Mostrar notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success' | 'error'
 */
function showQuoteToast(message, type) {
  if (window.showToast && typeof window.showToast === 'function') {
    try { window.showToast(message, type || 'success'); } catch (e) { alert(message); }
  } else {
    alert(message);
  }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ quote-issued-page.js inicializado');
  loadIssuedQuotes();
});

// Exportar funciones globalmente
window.loadIssuedQuotes = loadIssuedQuotes;
window.viewQuote = viewQuote;
window.togglePaymentStatus = togglePaymentStatus;
window.openCancelModal = openCancelModal;
window.closeCancelModal = closeCancelModal;
window.confirmCancelQuote = confirmCancelQuote;
window.handleSearchIssued = handleSearchIssued;
