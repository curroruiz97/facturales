/**
 * Expenses Page Logic
 * Lógica específica para la página de gastos (expenses.html)
 */

/**
 * Abrir modal de añadir gasto
 */
function openAddExpenseModal() {
  const modal = document.getElementById('add-expense-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Establecer fecha actual por defecto
    const dateInput = document.getElementById('expense-date');
    if (dateInput && !dateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
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
  
  // Limpiar formulario
  const form = document.getElementById('expense-form');
  if (form) {
    form.reset();
  }
}

/**
 * Guardar gasto
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
    // Recoger datos del formulario
    const expenseData = {
      supplier: document.getElementById('expense-supplier').value.trim(),
      concept: document.getElementById('expense-concept').value.trim(),
      amount: parseFloat(document.getElementById('expense-amount').value),
      date: document.getElementById('expense-date').value,
      category: document.getElementById('expense-category').value,
      notes: document.getElementById('expense-notes')?.value.trim() || null
    };
    
    // Validaciones
    if (!expenseData.supplier) {
      showToast('El proveedor es obligatorio', 'error');
      return;
    }
    
    if (!expenseData.concept) {
      showToast('El concepto es obligatorio', 'error');
      return;
    }
    
    if (!expenseData.amount || expenseData.amount <= 0) {
      showToast('El importe debe ser mayor que 0', 'error');
      return;
    }
    
    if (!expenseData.date) {
      showToast('La fecha es obligatoria', 'error');
      return;
    }
    
    // TODO: Guardar en Supabase cuando se cree la tabla de gastos
    console.log('Gasto a guardar:', expenseData);
    
    // Por ahora, simular guardado exitoso
    showToast('Gasto añadido correctamente', 'success');
    
    // Cerrar modal y recargar lista
    closeExpenseModal();
    // loadExpenses(); // Descomentar cuando se implemente la carga
    
  } catch (error) {
    console.error('Error al guardar gasto:', error);
    showToast('Error al guardar el gasto', 'error');
  } finally {
    // Rehabilitar botón
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

/**
 * Cargar lista de gastos (TODO: implementar con Supabase)
 */
function loadExpenses() {
  // TODO: Implementar carga de gastos desde Supabase
  console.log('loadExpenses: pendiente de implementar');
}

// Exportar funciones globalmente
window.openAddExpenseModal = openAddExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.handleSaveExpense = handleSaveExpense;
window.loadExpenses = loadExpenses;
