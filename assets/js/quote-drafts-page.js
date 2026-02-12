/**
 * quote-drafts-page.js
 * Script para la página de borradores de presupuestos
 */

let allDrafts = [];
let currentDeleteId = null;

/**
 * Cargar y renderizar todos los borradores
 */
async function loadDrafts() {
  try {
    console.log('🔄 Cargando borradores...');
    
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
    
    // Obtener borradores
    const result = await window.getQuotes({ status: 'draft' });
    
    if (!result.success) {
      console.error('❌ Error al cargar borradores:', result.error);
      showToast('Error al cargar borradores', 'error');
      return;
    }
    
    allDrafts = result.data;
    console.log(`✅ ${allDrafts.length} borradores cargados`);
    
    // Actualizar contador
    const counterElement = document.getElementById('drafts-count');
    if (counterElement) {
      counterElement.textContent = allDrafts.length;
    }
    
    // Renderizar tabla
    renderDraftsTable(allDrafts);
    
  } catch (error) {
    console.error('❌ Error en loadDrafts:', error);
    showToast('Error al cargar borradores', 'error');
  }
}

/**
 * Renderizar tabla de borradores
 * @param {Array} drafts - Lista de borradores
 */
function renderDraftsTable(drafts) {
  const tbody = document.getElementById('drafts-table-body');
  
  if (!tbody) {
    console.error('❌ Elemento drafts-table-body no encontrado');
    return;
  }
  
  // Limpiar tabla
  tbody.innerHTML = '';
  
  // Si no hay borradores, mostrar mensaje
  if (drafts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <svg class="stroke-bgray-400 dark:stroke-bgray-500" width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="8" width="40" height="48" rx="4" stroke-width="2"/>
              <line x1="20" y1="20" x2="44" y2="20" stroke-width="2" stroke-linecap="round"/>
              <line x1="20" y1="28" x2="44" y2="28" stroke-width="2" stroke-linecap="round"/>
              <line x1="20" y1="36" x2="36" y2="36" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <div>
              <p class="text-lg font-semibold text-bgray-900 dark:text-white">No hay borradores aún</p>
              <p class="mt-1 text-sm text-bgray-600 dark:text-bgray-50">Guarda un presupuesto como borrador para verlo aquí</p>
            </div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Renderizar cada borrador
  drafts.forEach(draft => {
    const row = createDraftRow(draft);
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

/**
 * Crear HTML de una fila de borrador
 * @param {Object} draft - Datos del borrador
 * @returns {string} HTML de la fila
 */
function createDraftRow(draft) {
  const quoteNumber = draft.quote_number || 'Sin número';
  const clientName = draft.client_name || 'Sin cliente';
  const clientNif = draft.quote_data?.client?.nif || '-';
  const issueDate = window.formatQuoteDate ? window.formatQuoteDate(draft.issue_date) : draft.issue_date;
  const dueDate = draft.due_date ? (window.formatQuoteDate ? window.formatQuoteDate(draft.due_date) : draft.due_date) : '-';
  const totalAmount = window.formatQuoteCurrency ? window.formatQuoteCurrency(draft.total_amount, draft.currency) : `${draft.total_amount} ${draft.currency}`;
  
  return `
    <tr class="border-b border-bgray-200 dark:border-darkblack-400">
      <!-- Columna: Presupuesto -->
      <td class="py-5 pr-6">
        <div class="flex flex-col">
          <p class="text-sm font-semibold text-bgray-900 dark:text-white">${quoteNumber}</p>
          <p class="text-xs text-bgray-600 dark:text-bgray-50">Serie ${draft.quote_series}</p>
        </div>
      </td>
      
      <!-- Columna: Cliente -->
      <td class="px-6 py-5">
        <div class="flex flex-col">
          <p class="text-sm font-medium text-bgray-900 dark:text-white">${clientName}</p>
          <p class="text-xs text-bgray-600 dark:text-bgray-50">${clientNif}</p>
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
      
      <!-- Columna: Acciones -->
      <td class="py-5 pl-6 text-right">
        <div class="inline-flex items-center gap-2">
          <!-- Botón Editar -->
          <button
            onclick="editDraft('${draft.id}')"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400"
            type="button"
            title="Editar"
          >
            <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M12.75 2.25L15.75 5.25M14.25 11.25V15.75H2.25V3.75H6.75M14.25 11.25L6.75 3.75M14.25 11.25L11.25 14.25M6.75 3.75L9.75 0.75L16.5 7.5L13.5 10.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          
          <!-- Botón Eliminar -->
          <button
            onclick="openDeleteModal('${draft.id}', '${quoteNumber}')"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400"
            type="button"
            title="Eliminar"
          >
            <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.75 4.5H14.25M7.5 8.25V12.75M10.5 8.25V12.75M2.25 4.5L3 15.75C3 16.5784 3.67157 17.25 4.5 17.25H13.5C14.3284 17.25 15 16.5784 15 15.75L15.75 4.5M6 4.5V2.25C6 1.83579 6.33579 1.5 6.75 1.5H11.25C11.6642 1.5 12 1.83579 12 2.25V4.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Editar un borrador
 * @param {string} draftId - ID del borrador
 */
function editDraft(draftId) {
  console.log('✏️ Editando borrador:', draftId);
  window.location.href = `quote.html?draft=${draftId}`;
}

/**
 * Abrir modal de confirmación de eliminación
 * @param {string} draftId - ID del borrador
 * @param {string} quoteNumber - Número de presupuesto
 */
function openDeleteModal(draftId, quoteNumber) {
  currentDeleteId = draftId;
  
  const modal = document.getElementById('delete-confirm-modal');
  const nameElement = document.getElementById('delete-draft-name');
  
  if (modal && nameElement) {
    nameElement.textContent = `Presupuesto: ${quoteNumber}`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Cerrar modal de eliminación
 */
function closeDeleteModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  currentDeleteId = null;
}

/**
 * Confirmar eliminación del borrador
 */
async function confirmDeleteDraft() {
  if (!currentDeleteId) return;
  
  // Guardar ID localmente ANTES de limpiar o cerrar modal
  const idToDelete = currentDeleteId;
  currentDeleteId = null; // Limpiar para evitar duplicados
  
  // Cerrar modal DESPUÉS de guardar el ID
  closeDeleteModal();
  
  try {
    console.log('🗑️ Eliminando borrador:', idToDelete);
    
    // Verificar que la función esté disponible
    let attempts = 0;
    while (!window.permanentlyDeleteQuote && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.permanentlyDeleteQuote) {
      console.error('❌ Función permanentlyDeleteQuote no disponible');
      if (window.showToast) {
        window.showToast('Error: El sistema aún está cargando. Intenta de nuevo.', 'error');
      }
      return;
    }
    
    const result = await window.permanentlyDeleteQuote(idToDelete);
    
    if (!result.success) {
      console.error('❌ Error al eliminar:', result.error);
      if (window.showToast) {
        window.showToast(result.error || 'Error al eliminar el borrador', 'error');
      }
      return;
    }
    
    console.log('✅ Borrador eliminado');
    
    // Mostrar toast de éxito
    if (window.showToast) {
      window.showToast('Borrador eliminado correctamente', 'success');
    }
    
    // Recargar lista de borradores
    if (window.loadDrafts) {
      await window.loadDrafts();
    } else {
      // Fallback: recargar página completa
      window.location.reload();
    }
    
  } catch (error) {
    console.error('❌ Error en confirmDeleteDraft:', error);
    if (window.showToast) {
      window.showToast('Error al eliminar el borrador', 'error');
    }
  }
}

/**
 * Manejar búsqueda de borradores
 * @param {string} searchTerm - Término de búsqueda
 */
function handleSearchDrafts(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    renderDraftsTable(allDrafts);
    return;
  }
  
  const term = searchTerm.toLowerCase().trim();
  const filtered = allDrafts.filter(draft => {
    return (
      draft.quote_number?.toLowerCase().includes(term) ||
      draft.client_name?.toLowerCase().includes(term) ||
      draft.quote_data?.client?.nif?.toLowerCase().includes(term)
    );
  });
  
  renderDraftsTable(filtered);
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ quote-drafts-page.js inicializado');
  loadDrafts();
});

// Exportar funciones globalmente
window.loadDrafts = loadDrafts;
window.editDraft = editDraft;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteDraft = confirmDeleteDraft;
window.handleSearchDrafts = handleSearchDrafts;
