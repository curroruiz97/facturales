/**
 * Expenses Page Logic
 * Lógica específica para la página de gastos (expenses.html)
 */

// Variables globales para filtros
let currentFilters = {
  search: '',
  minAmount: null,
  maxAmount: null,
  startDate: null,
  endDate: null,
  tipo: null
};

// Variable para almacenar todas las transacciones cargadas
let allTransactions = [];

// Variables para paginación
let currentPage = 1;
let resultsPerPage = 10;

/**
 * Abrir modal de añadir gasto/transacción
 */
function openAddExpenseModal() {
  const modal = document.getElementById('add-expense-modal');
  if (modal) {
    // Resetear estado de edición
    editingTransactionId = null;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Establecer fecha actual por defecto
    const dateInput = document.getElementById('expense-date');
    if (dateInput && !dateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
    
    // Limpiar el formulario
    const form = document.getElementById('expense-form');
    if (form) {
      form.reset();
      document.getElementById('expense-contact-id').value = '';
      document.getElementById('notes-counter').textContent = '0/150';
      // Establecer "gasto" como tipo por defecto
      document.getElementById('expense-type-gasto').checked = true;
    }
    
    // Actualizar título y botón para modo crear
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
      modalTitle.textContent = 'Añadir Transacción';
    }
    
    const saveBtn = document.getElementById('expense-save-btn');
    if (saveBtn) {
      saveBtn.textContent = 'Guardar Transacción';
    }
  }
}

/**
 * Cerrar modal de añadir gasto
 */
function closeExpenseModal() {
  const modal = document.getElementById('add-expense-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  
  // Resetear estado de edición
  editingTransactionId = null;
  
  // Limpiar formulario
  const form = document.getElementById('expense-form');
  if (form) {
    form.reset();
    document.getElementById('expense-contact-id').value = '';
    document.getElementById('notes-counter').textContent = '0/150';
  }
  
  // Ocultar resultados de autocompletado
  const autocompleteResults = document.getElementById('contact-autocomplete-results');
  if (autocompleteResults) {
    autocompleteResults.classList.add('hidden');
  }
}

/**
 * Manejar autocompletado de contactos
 */
async function handleContactAutocomplete(searchTerm) {
  const resultsDiv = document.getElementById('contact-autocomplete-results');
  
  if (!searchTerm || searchTerm.trim().length < 3) {
    resultsDiv.classList.add('hidden');
    resultsDiv.innerHTML = '';
    return;
  }
  
  try {
    const result = await window.searchClientsAutocomplete(searchTerm);
    
    if (result.success && result.data.length > 0) {
      resultsDiv.innerHTML = result.data.map(client => `
        <div 
          class="px-4 py-3 hover:bg-bgray-100 dark:hover:bg-darkblack-400 cursor-pointer border-b border-bgray-100 dark:border-darkblack-400 last:border-b-0"
          onclick="selectContact('${client.id}', '${client.nombre_razon_social.replace(/'/g, "\\'")}')">
          <p class="text-sm font-semibold text-bgray-900 dark:text-white">${client.nombre_razon_social}</p>
          <p class="text-xs text-bgray-500 dark:text-bgray-400">${client.identificador || 'Sin NIF'}</p>
        </div>
      `).join('');
      
      resultsDiv.classList.remove('hidden');
    } else {
      resultsDiv.innerHTML = '<div class="px-4 py-3 text-sm text-bgray-500">No se encontraron contactos</div>';
      resultsDiv.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error en autocompletado:', error);
    resultsDiv.classList.add('hidden');
  }
}

/**
 * Seleccionar un contacto del autocompletado
 */
function selectContact(clientId, clientName) {
  document.getElementById('expense-contact').value = clientName;
  document.getElementById('expense-contact-id').value = clientId;
  
  const resultsDiv = document.getElementById('contact-autocomplete-results');
  resultsDiv.classList.add('hidden');
  resultsDiv.innerHTML = '';
}

// Variable global para saber si estamos editando
let editingTransactionId = null;

/**
 * Guardar o actualizar transacción
 */
async function handleSaveExpense(event) {
  event.preventDefault();
  
  // Deshabilitar botón para evitar doble submit
  const saveBtn = document.getElementById('expense-save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Guardando...
  `;
  
  try {
    // Obtener el tipo de transacción seleccionado
    const tipoGasto = document.getElementById('expense-type-gasto').checked;
    const tipoIngreso = document.getElementById('expense-type-ingreso').checked;
    const tipo = tipoGasto ? 'gasto' : (tipoIngreso ? 'ingreso' : 'gasto');
    
    // Recoger datos del formulario
    const transactionData = {
      cliente_id: document.getElementById('expense-contact-id').value || null,
      concepto: document.getElementById('expense-concept').value.trim(),
      importe: parseFloat(document.getElementById('expense-amount').value),
      fecha: document.getElementById('expense-date').value,
      categoria: document.getElementById('expense-category').value,
      observaciones: document.getElementById('expense-notes')?.value.trim() || null,
      tipo: tipo
    };
    
    // Validaciones básicas
    if (!transactionData.concepto) {
      showToast('El concepto es obligatorio', 'error');
      return;
    }
    
    if (!transactionData.importe || transactionData.importe <= 0) {
      showToast('El importe debe ser mayor que 0', 'error');
      return;
    }
    
    if (!transactionData.fecha) {
      showToast('La fecha es obligatoria', 'error');
      return;
    }
    
    if (!transactionData.categoria) {
      showToast('La categoría es obligatoria', 'error');
      return;
    }
    
    let result;
    const tipoTexto = tipo === 'gasto' ? 'Gasto' : 'Ingreso';
    
    // Si estamos editando, actualizar. Si no, crear nuevo
    if (editingTransactionId) {
      result = await window.updateTransaction(editingTransactionId, transactionData);
      if (result.success) {
        showToast(`${tipoTexto} actualizado correctamente`, 'success');
      }
    } else {
      result = await window.createTransaction(transactionData);
      if (result.success) {
        showToast(`${tipoTexto} añadido correctamente`, 'success');
      }
    }
    
    if (result.success) {
      // Cerrar modal y recargar lista
      closeExpenseModal();
      loadTransactions();
    } else {
      showToast(result.error || 'Error al guardar la transacción', 'error');
    }
    
  } catch (error) {
    console.error('Error al guardar transacción:', error);
    showToast('Error al guardar la transacción', 'error');
  } finally {
    // Rehabilitar botón
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

/**
 * Cargar lista de transacciones
 */
async function loadTransactions() {
  try {
    console.log('Cargando transacciones con filtros:', currentFilters);
    
    const result = await window.getTransactions(currentFilters);
    
    if (result.success) {
      allTransactions = result.data;
      currentPage = 1; // Reset a la primera página al cargar nuevos datos
      renderTransactions(result.data);
    } else {
      console.error('Error al cargar transacciones:', result.error);
      showToast('Error al cargar las transacciones', 'error');
    }
  } catch (error) {
    console.error('Error al cargar transacciones:', error);
    showToast('Error al cargar las transacciones', 'error');
  }
}

/**
 * Renderizar transacciones en la tabla
 */
function renderTransactions(transactions) {
  const tableContent = document.querySelector('.table-content table');
  
  if (!tableContent) {
    console.error('No se encontró la tabla de transacciones');
    return;
  }
  
  // Limpiar filas existentes (excepto la cabecera)
  const rows = tableContent.querySelectorAll('tr');
  rows.forEach((row, index) => {
    if (index > 0) row.remove();
  });
  
  if (transactions.length === 0) {
    // Mostrar mensaje de no hay datos
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="8" class="px-6 py-10 text-center">
        <p class="text-base text-bgray-500 dark:text-bgray-400">No se encontraron transacciones</p>
      </td>
    `;
    tableContent.appendChild(emptyRow);
    updatePagination(0);
    return;
  }
  
  // Calcular paginación
  const totalPages = Math.ceil(transactions.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);
  
  // Renderizar cada transacción de la página actual
  paginatedTransactions.forEach(transaction => {
    const row = document.createElement('tr');
    row.className = 'border-b border-bgray-300 dark:border-darkblack-400';
    
    // Obtener nombre del cliente o mostrar "Sin contacto"
    const clientName = transaction.clientes?.nombre_razon_social || 'Sin contacto';
    const initials = transaction.clientes ? window.getInitials(clientName) : 'SC';
    
    // Color del importe según el tipo
    const amountColor = transaction.tipo === 'gasto' ? 'text-red-500' : 'text-green-500';
    
    // Badge de tipo
    const tipoBadgeColor = transaction.tipo === 'gasto' 
      ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
      : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    
    row.innerHTML = `
      <td class="">
        <label class="text-center">
          <input
            type="checkbox"
            class="h-5 w-5 cursor-pointer rounded-full border border-bgray-400 bg-transparent text-success-300 focus:outline-none focus:ring-0"
          />
        </label>
      </td>
      <td class="px-6 py-5 xl:px-0">
        <div class="flex w-full items-center space-x-2.5">
          <div class="h-10 w-10 flex items-center justify-center rounded-full bg-success-100 dark:bg-success-900/20">
            <span class="text-sm font-bold text-success-600 dark:text-success-400">${initials}</span>
          </div>
          <p class="text-base font-semibold text-bgray-900 dark:text-white">
            ${clientName}
          </p>
        </div>
      </td>
      <td class="px-6 py-5 xl:px-0">
        <p class="text-base font-medium text-bgray-900 dark:text-white">
          ${transaction.concepto}
        </p>
      </td>
      <td class="px-6 py-5 xl:px-0">
        <p class="text-sm font-medium text-bgray-600 dark:text-bgray-400">
          ${window.getCategoryLabel(transaction.categoria)}
        </p>
      </td>
      <td class="px-6 py-5 xl:px-0">
        <p class="text-base font-semibold ${amountColor}">
          ${window.formatCurrency(transaction.importe)}
        </p>
      </td>
      <td class="px-6 py-5 xl:px-0">
        <p class="text-sm font-medium text-bgray-600 dark:text-bgray-400">
          ${window.formatDate(transaction.fecha)}
        </p>
      </td>
      <td class="px-6 py-5 xl:px-0">
        <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tipoBadgeColor}">
          ${transaction.tipo.charAt(0).toUpperCase() + transaction.tipo.slice(1)}
        </span>
      </td>
      <td class="px-6 py-5 xl:px-0">
        <div class="flex justify-center space-x-2 relative">
          <button 
            type="button" 
            onclick="editTransaction('${transaction.id}')"
            class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="Editar transacción"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 2.5L15.5 4.5M1 17L1 13.5L11.879 2.621C12.2695 2.23053 12.9027 2.23053 13.2932 2.621L15.379 4.707C15.7695 5.09747 15.7695 5.73053 15.379 6.121L4.5 17H1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button 
            type="button" 
            onclick="handleDeleteTransaction('${transaction.id}', '${transaction.concepto.replace(/'/g, "\\'")}')"
            class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Eliminar transacción"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 5H16M7 8V13M11 8V13M3 5L4 15C4 16.1046 4.89543 17 6 17H12C13.1046 17 14 16.1046 14 15L15 5M6 5V3C6 2.44772 6.44772 2 7 2H11C11.5523 2 12 2.44772 12 3V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    `;
    
    tableContent.appendChild(row);
  });
  
  // Actualizar controles de paginación
  updatePagination(transactions.length);
}

/**
 * Actualizar controles de paginación (dinámico, mismo estilo que contactos)
 */
function updatePagination(totalTransactions) {
  const totalPages = Math.ceil(totalTransactions / resultsPerPage);
  const container = document.getElementById('expenses-page-buttons');
  if (!container) return;
  container.innerHTML = '';

  if (totalPages <= 1) return;

  // Botón anterior
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.innerHTML = '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.7217 5.03271L7.72168 10.0327L12.7217 15.0327" stroke="#A0AEC0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (currentPage <= 1) {
    prevBtn.classList.add('opacity-40', 'cursor-not-allowed');
  } else {
    prevBtn.onclick = function () { goToPage(currentPage - 1); };
  }
  container.appendChild(prevBtn);

  // Contenedor de números
  const nums = document.createElement('div');
  nums.className = 'flex items-center';

  const activeClass = 'rounded-lg bg-success-50 px-4 py-1.5 text-xs font-bold text-success-300 dark:bg-darkblack-500 dark:text-bgray-50 lg:px-6 lg:py-2.5 lg:text-sm';
  const normalClass = 'rounded-lg px-4 py-1.5 text-xs font-bold text-bgray-500 transition duration-300 ease-in-out hover:bg-success-50 hover:text-success-300 dark:hover:bg-darkblack-500 lg:px-6 lg:py-2.5 lg:text-sm';

  function addPageBtn(page) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = page;
    btn.className = page === currentPage ? activeClass : normalClass;
    if (page !== currentPage) btn.onclick = function () { goToPage(page); };
    nums.appendChild(btn);
  }

  function addEllipsis() {
    const span = document.createElement('span');
    span.className = 'text-sm text-bgray-500 px-1';
    span.textContent = '...';
    nums.appendChild(span);
  }

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) addPageBtn(i);
  } else {
    addPageBtn(1);
    if (currentPage > 3) addEllipsis();
    var start = Math.max(2, currentPage - 1);
    var end = Math.min(totalPages - 1, currentPage + 1);
    if (currentPage <= 3) { start = 2; end = 4; }
    if (currentPage >= totalPages - 2) { start = totalPages - 3; end = totalPages - 1; }
    for (let i = start; i <= end; i++) addPageBtn(i);
    if (currentPage < totalPages - 2) addEllipsis();
    addPageBtn(totalPages);
  }

  container.appendChild(nums);

  // Botón siguiente
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.innerHTML = '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.72168 5.03271L12.7217 10.0327L7.72168 15.0327" stroke="#A0AEC0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (currentPage >= totalPages) {
    nextBtn.classList.add('opacity-40', 'cursor-not-allowed');
  } else {
    nextBtn.onclick = function () { goToPage(currentPage + 1); };
  }
  container.appendChild(nextBtn);
}

/**
 * Toggle dropdown de resultados por página
 */
function toggleExpensesPerPageDropdown() {
  const dd = document.getElementById('result-filter');
  if (dd) dd.classList.toggle('hidden');
}

/**
 * Ir a una página específica
 */
function goToPage(pageNumber) {
  currentPage = pageNumber;
  renderTransactions(allTransactions);
}

/**
 * Establecer número de resultados por página
 */
function setResultsPerPage(perPage) {
  resultsPerPage = perPage;
  currentPage = 1; // Volver a la primera página
  
  // Actualizar el display
  const display = document.getElementById('resultsPerPageDisplay');
  if (display) {
    display.textContent = perPage;
  }
  
  // Cerrar dropdown
  const dd = document.getElementById('result-filter');
  if (dd) dd.classList.add('hidden');
  
  // Re-renderizar con el nuevo límite
  renderTransactions(allTransactions);
}

/**
 * Mostrar acciones de transacción (placeholder)
 */
function showTransactionActions(transactionId) {
  console.log('Mostrar acciones para transacción:', transactionId);
  // TODO: Implementar menú de acciones (editar, eliminar)
}

/**
 * Manejar búsqueda de transacciones
 */
function handleSearchTransactions() {
  const searchInput = document.getElementById('transactionSearch');
  if (searchInput) {
    currentFilters.search = searchInput.value.trim();
    loadTransactions();
  }
}

/**
 * Manejar filtro de rango de importe
 */
function handleAmountFilter(min, max) {
  currentFilters.minAmount = min;
  currentFilters.maxAmount = max;
  loadTransactions();
}

/**
 * Manejar filtro de rango de fechas
 */
function handleDateFilter(startDate, endDate) {
  currentFilters.startDate = startDate;
  currentFilters.endDate = endDate;
  loadTransactions();
}

/**
 * Manejar filtro de tipo de transacción
 */
function handleTypeFilter(tipo) {
  currentFilters.tipo = tipo;
  loadTransactions();
}

/**
 * Aplicar todos los filtros
 */
function applyFilters() {
  loadTransactions();
}

/**
 * Limpiar todos los filtros
 */
function clearFilters() {
  currentFilters = {
    search: '',
    minAmount: null,
    maxAmount: null,
    startDate: null,
    endDate: null,
    tipo: null
  };
  
  // Limpiar inputs
  const searchInput = document.getElementById('transactionSearch');
  if (searchInput) searchInput.value = '';
  
  loadTransactions();
}

/**
 * Toggle filtro de precio (mostrar/ocultar)
 */
function togglePriceFilter() {
  const priceFilter = document.getElementById('price-filter');
  if (priceFilter) {
    priceFilter.classList.toggle('hidden');
  }
}

/**
 * Actualizar rango de precio desde los inputs
 */
function updatePriceRange() {
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const display = document.getElementById('priceRangeDisplay');
  
  if (priceMin && priceMax && display) {
    const min = parseFloat(priceMin.value) || 0;
    const max = parseFloat(priceMax.value) || 10998;
    display.textContent = `${min}€ - ${max}€`;
  }
}

/**
 * Actualizar precio desde el slider
 */
function updatePriceFromSlider() {
  const slider = document.getElementById('priceSlider');
  const priceMax = document.getElementById('priceMax');
  
  if (slider && priceMax) {
    priceMax.value = slider.value;
    updatePriceRange();
  }
}

/**
 * Aplicar filtro de precio
 */
function applyPriceFilter() {
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  
  if (priceMin && priceMax) {
    handleAmountFilter(
      parseFloat(priceMin.value) || 0,
      parseFloat(priceMax.value) || 10998
    );
  }
  
  // Cerrar el filtro
  togglePriceFilter();
}

/**
 * Toggle filtro de fecha (mostrar/ocultar)
 */
function toggleDateFilter() {
  const dateFilter = document.getElementById('date-filter');
  if (dateFilter) {
    dateFilter.classList.toggle('hidden');
  }
}

/**
 * Aplicar filtro de fecha
 */
function applyDateFilter() {
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const display = document.getElementById('dateRangeDisplay');
  
  if (dateFrom && dateTo) {
    const from = dateFrom.value;
    const to = dateTo.value;
    
    if (from || to) {
      handleDateFilter(from, to);
      
      if (display) {
        if (from && to) {
          display.textContent = `${from} - ${to}`;
        } else if (from) {
          display.textContent = `Desde ${from}`;
        } else if (to) {
          display.textContent = `Hasta ${to}`;
        }
      }
    }
  }
  
  // Cerrar el filtro
  toggleDateFilter();
}

/**
 * Editar una transacción
 */
async function editTransaction(transactionId) {
  try {
    // Obtener datos de la transacción
    const result = await window.getTransactionById(transactionId);
    
    if (!result.success || !result.data) {
      showToast('No se pudo cargar la transacción', 'error');
      return;
    }
    
    const transaction = result.data;
    
    // Establecer el ID de edición
    editingTransactionId = transactionId;
    
    // Abrir modal
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    
    // Llenar el formulario con los datos existentes
    document.getElementById('expense-concept').value = transaction.concepto || '';
    document.getElementById('expense-amount').value = transaction.importe || '';
    document.getElementById('expense-date').value = transaction.fecha || '';
    document.getElementById('expense-category').value = transaction.categoria || '';
    document.getElementById('expense-notes').value = transaction.observaciones || '';
    
    // Actualizar contador de observaciones
    const notesLength = (transaction.observaciones || '').length;
    document.getElementById('notes-counter').textContent = `${notesLength}/150`;
    
    // Establecer contacto si existe
    if (transaction.cliente_id && transaction.clientes) {
      document.getElementById('expense-contact').value = transaction.clientes.nombre_razon_social;
      document.getElementById('expense-contact-id').value = transaction.cliente_id;
    } else {
      document.getElementById('expense-contact').value = '';
      document.getElementById('expense-contact-id').value = '';
    }
    
    // Establecer tipo de transacción
    if (transaction.tipo === 'gasto') {
      document.getElementById('expense-type-gasto').checked = true;
      document.getElementById('expense-type-ingreso').checked = false;
    } else {
      document.getElementById('expense-type-ingreso').checked = true;
      document.getElementById('expense-type-gasto').checked = false;
    }
    
    // Actualizar título del modal
    const modalTitle = document.getElementById('expense-modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Editar Transacción';
    }
    
    // Actualizar texto del botón
    const saveBtn = document.getElementById('expense-save-btn');
    if (saveBtn) {
      saveBtn.textContent = 'Actualizar Transacción';
    }
    
  } catch (error) {
    console.error('Error al cargar transacción para editar:', error);
    showToast('Error al cargar la transacción', 'error');
  }
}

// Variable para almacenar la transacción a eliminar
let transactionToDelete = null;

/**
 * Abrir modal de confirmación de eliminación
 */
function openDeleteTransactionModal(transactionId, transactionName) {
  transactionToDelete = transactionId;
  
  // Mostrar nombre de la transacción
  const nameElement = document.getElementById('delete-transaction-name');
  if (nameElement) {
    nameElement.textContent = `Transacción: ${transactionName}`;
  }
  
  // Mostrar modal
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Cerrar modal de eliminación
 */
function closeDeleteTransactionModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  transactionToDelete = null;
}

/**
 * Confirmar eliminación de la transacción
 */
async function confirmDeleteTransaction() {
  if (!transactionToDelete) return;
  
  try {
    // Importar función deleteTransaction desde transactions.js (global)
    const result = await window.deleteTransaction(transactionToDelete);
    
    if (result.success) {
      showToast('Transacción eliminada correctamente', 'success');
      closeDeleteTransactionModal();
      loadTransactions(); // Recargar la tabla
    } else {
      showToast(result.error || 'Error al eliminar la transacción', 'error');
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    showToast('Error al eliminar la transacción', 'error');
  }
}

/**
 * Función para llamar desde el botón de eliminar en la tabla
 */
function handleDeleteTransaction(transactionId, transactionName) {
  openDeleteTransactionModal(transactionId, transactionName);
}

// Exportar funciones globalmente
window.openAddExpenseModal = openAddExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.handleSaveExpense = handleSaveExpense;
window.loadTransactions = loadTransactions;
window.handleSearchTransactions = handleSearchTransactions;
window.handleAmountFilter = handleAmountFilter;
window.handleDateFilter = handleDateFilter;
window.handleTypeFilter = handleTypeFilter;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.handleContactAutocomplete = handleContactAutocomplete;
window.selectContact = selectContact;
window.editTransaction = editTransaction;
window.handleDeleteTransaction = handleDeleteTransaction;
window.openDeleteTransactionModal = openDeleteTransactionModal;
window.closeDeleteTransactionModal = closeDeleteTransactionModal;
window.confirmDeleteTransaction = confirmDeleteTransaction;
window.togglePriceFilter = togglePriceFilter;
window.updatePriceRange = updatePriceRange;
window.updatePriceFromSlider = updatePriceFromSlider;
window.applyPriceFilter = applyPriceFilter;
window.toggleDateFilter = toggleDateFilter;
window.applyDateFilter = applyDateFilter;
window.goToPage = goToPage;
window.setResultsPerPage = setResultsPerPage;
window.updatePagination = updatePagination;
window.toggleExpensesPerPageDropdown = toggleExpensesPerPageDropdown;

// Cargar transacciones al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Expenses page loaded');
  
  // Cargar transacciones iniciales
  setTimeout(() => {
    loadTransactions();
  }, 500);
  
  // Ocultar autocompletado al hacer click fuera
  document.addEventListener('click', (e) => {
    const contactInput = document.getElementById('expense-contact');
    const resultsDiv = document.getElementById('contact-autocomplete-results');
    
    if (contactInput && resultsDiv && !contactInput.contains(e.target) && !resultsDiv.contains(e.target)) {
      resultsDiv.classList.add('hidden');
    }
  });
});
