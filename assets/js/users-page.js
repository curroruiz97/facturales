/**
 * Users Page Logic
 * Lógica específica para la página de gestión de clientes (users.html)
 */

// Estado global
let currentClientId = null; // ID del cliente siendo editado (null = modo crear)
let clientToDelete = null; // Cliente pendiente de eliminar
let allClients = []; // Cache de todos los clientes

/**
 * Inicializar la página al cargar
 */
document.addEventListener('DOMContentLoaded', function() {
  loadClients();
  initModal();
});

/**
 * Cargar clientes desde Supabase
 */
async function loadClients(searchTerm = '') {
  try {
    const result = await getClients(searchTerm);
    
    if (result.success) {
      allClients = result.data;
      renderClientsTable(result.data);
      updateClientsCount(result.data.length);
    } else {
      showToast('Error al cargar clientes: ' + result.error, 'error');
      renderEmptyState();
    }
  } catch (error) {
    console.error('Error loading clients:', error);
    showToast('Error al cargar clientes', 'error');
    renderEmptyState();
  }
}

/**
 * Actualizar el contador de clientes
 */
function updateClientsCount(count) {
  const countElement = document.getElementById('clients-count');
  if (countElement) {
    countElement.textContent = count;
  }
}

/**
 * Renderizar la tabla de clientes
 */
function renderClientsTable(clients) {
  const tbody = document.getElementById('clients-table-body');
  
  if (!tbody) {
    console.error('Table body not found');
    return;
  }
  
  // Limpiar tabla
  tbody.innerHTML = '';
  
  // Si no hay clientes, mostrar estado vacío
  if (clients.length === 0) {
    renderEmptyState();
    return;
  }
  
  // Renderizar cada cliente
  clients.forEach(client => {
    const row = document.createElement('tr');
    row.className = 'border-b border-bgray-200 dark:border-darkblack-400';
    
    // Columna: Cliente
    const initials = getInitials(client.nombre_razon_social);
    const estadoBadge = client.estado === 'activo' 
      ? '<span class="inline-flex items-center rounded-lg bg-success-50 px-3 py-1 text-xs font-semibold text-success-300 dark:bg-darkblack-500">Activo</span>'
      : '<span class="inline-flex items-center rounded-lg bg-bgray-100 px-3 py-1 text-xs font-semibold text-bgray-700 dark:bg-darkblack-500 dark:text-bgray-50">Inactivo</span>';
    
    row.innerHTML = `
      <td class="py-5 pr-6">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bgray-100 text-sm font-bold text-bgray-700 dark:bg-darkblack-500 dark:text-white">
            ${initials}
          </div>
          <div>
            <p class="text-sm font-semibold text-bgray-900 dark:text-white">${client.nombre_razon_social}</p>
            <p class="text-xs font-medium text-bgray-600 dark:text-bgray-50">${client.identificador}</p>
          </div>
        </div>
      </td>
      <td class="px-6 py-5">
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-bgray-900 dark:text-white">${client.email || '-'}</p>
          <p class="text-xs font-medium text-bgray-600 dark:text-bgray-50">${client.telefono || '-'}</p>
          <p class="text-xs font-medium text-bgray-600 dark:text-bgray-50">${formatFullAddress(client)}</p>
        </div>
      </td>
      <td class="px-6 py-5">
        <p class="text-sm font-medium text-bgray-900 dark:text-white">${client.dia_facturacion ? 'Día ' + client.dia_facturacion : '-'}</p>
        <p class="text-xs font-medium text-bgray-600 dark:text-bgray-50">${client.dia_facturacion ? 'de cada mes' : ''}</p>
      </td>
      <td class="px-6 py-5">
        ${estadoBadge}
      </td>
      <td class="py-5 pl-6 text-right">
        <div class="inline-flex items-center gap-2">
          <button onclick="openEditClientModal('${client.id}')" class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400" type="button" title="Editar">
            <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 3.75H4.5C3.67157 3.75 3 4.42157 3 5.25V13.5C3 14.3284 3.67157 15 4.5 15H12.75C13.5784 15 14.25 14.3284 14.25 13.5V7.5" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M13.125 2.62501C13.7213 2.02872 14.6887 2.02872 15.285 2.62501C15.8813 3.2213 15.8813 4.18872 15.285 4.78501L9 11.07L6 12L6.93 9L13.125 2.62501Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button onclick="openDeleteModal('${client.id}', '${client.nombre_razon_social.replace(/'/g, "\\'")}' )" class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400" type="button" title="Eliminar">
            <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.75 5.25H14.25" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M7.5 5.25V4.5C7.5 3.67157 8.17157 3 9 3C9.82843 3 10.5 3.67157 10.5 4.5V5.25" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5.25 5.25L5.7825 14.0325C5.81232 14.5223 6.21944 14.9 6.71 14.9H11.29C11.7806 14.9 12.1877 14.5223 12.2175 14.0325L12.75 5.25" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Renderizar estado vacío cuando no hay clientes
 */
function renderEmptyState() {
  const tbody = document.getElementById('clients-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-12 text-center">
        <div class="flex flex-col items-center gap-4">
          <svg class="stroke-bgray-300 dark:stroke-darkblack-400" width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12L17 8V19C17 20.1046 16.1046 21 17 21Z" stroke-width="2"/>
            <path d="M12 3V8H17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div>
            <p class="text-lg font-semibold text-bgray-900 dark:text-white">No hay clientes aún</p>
            <p class="mt-1 text-sm text-bgray-600 dark:text-bgray-50">Crea tu primer cliente para comenzar</p>
          </div>
          <button onclick="openCreateClientModal()" class="inline-flex items-center gap-2 rounded-lg bg-success-300 px-4 py-2 text-sm font-semibold text-white transition hover:bg-success-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3V13M3 8H13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Nuevo Cliente
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Buscar clientes en tiempo real
 */
function handleSearchClients(searchTerm) {
  loadClients(searchTerm);
}

/**
 * Inicializar modal
 */
function initModal() {
  const modal = document.getElementById('multi-step-modal');
  const form = document.getElementById('client-form');
  
  // Botones para abrir el modal
  const openButtons = document.querySelectorAll('.modal-open');
  openButtons.forEach(btn => {
    btn.addEventListener('click', () => openCreateClientModal());
  });
  
  // Botones para cerrar el modal
  const closeButtons = document.querySelectorAll('#step-1-cancel, #step-1-cancel-2');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => closeClientModal());
  });
  
  // Overlay para cerrar
  const overlay = modal?.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => closeClientModal());
  }
  
  // Form submit
  if (form) {
    form.addEventListener('submit', handleSubmitClient);
  }
}

/**
 * Abrir modal en modo crear
 */
function openCreateClientModal() {
  currentClientId = null;
  
  // Cambiar título
  const title = document.querySelector('#multi-step-modal h2, #multi-step-modal h3');
  if (title) title.textContent = 'Nuevo Cliente';
  
  // Limpiar formulario
  document.getElementById('client-form').reset();
  document.getElementById('client-id').value = '';
  
  // Cambiar texto del botón
  const saveBtn = document.getElementById('client-save-btn');
  if (saveBtn) saveBtn.textContent = 'Guardar';
  
  // Mostrar modal
  const modal = document.getElementById('multi-step-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Abrir modal en modo editar
 */
async function openEditClientModal(clientId) {
  currentClientId = clientId;
  
  // Cambiar título
  const title = document.querySelector('#multi-step-modal h2, #multi-step-modal h3');
  if (title) title.textContent = 'Editar Cliente';
  
  // Cambiar texto del botón
  const saveBtn = document.getElementById('client-save-btn');
  if (saveBtn) saveBtn.textContent = 'Actualizar';
  
  // Cargar datos del cliente
  const result = await getClientById(clientId);
  
  if (result.success) {
    const client = result.data;
    
    // Rellenar formulario
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.nombre_razon_social || '';
    document.getElementById('client-taxid').value = client.identificador || '';
    document.getElementById('client-email').value = client.email || '';
    document.getElementById('client-phone').value = client.telefono || '';
    document.getElementById('client-address').value = client.direccion || '';
    document.getElementById('client-postal-code').value = client.codigo_postal || '';
    document.getElementById('client-city').value = client.ciudad || '';
    document.getElementById('client-country').value = client.pais || '';
    document.getElementById('client-billing-day').value = client.dia_facturacion || '30';
    document.getElementById('client-status').value = client.estado === 'activo' ? 'active' : 'inactive';
    
    // Mostrar modal
    const modal = document.getElementById('multi-step-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  } else {
    showToast('Error al cargar el cliente', 'error');
  }
}

/**
 * Cerrar modal
 */
function closeClientModal() {
  const modal = document.getElementById('multi-step-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  
  // Limpiar estado
  currentClientId = null;
}

/**
 * Manejar envío del formulario (crear o actualizar)
 */
async function handleSubmitClient(event) {
  event.preventDefault();
  
  // Deshabilitar botón para evitar doble submit
  const saveBtn = document.getElementById('client-save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';
  
  try {
    // Recoger datos del formulario
    const clientData = {
      nombre_razon_social: document.getElementById('client-name').value,
      identificador: document.getElementById('client-taxid').value,
      email: document.getElementById('client-email').value || null,
      telefono: document.getElementById('client-phone').value || null,
      direccion: document.getElementById('client-address').value || null,
      codigo_postal: document.getElementById('client-postal-code').value || null,
      ciudad: document.getElementById('client-city').value || null,
      pais: document.getElementById('client-country').value || null,
      dia_facturacion: document.getElementById('client-billing-day').value || null,
      estado: document.getElementById('client-status').value === 'active' ? 'activo' : 'inactivo'
    };
    
    let result;
    
    // Crear o actualizar según el modo
    if (currentClientId) {
      result = await updateClient(currentClientId, clientData);
      if (result.success) {
        showToast('Cliente actualizado correctamente', 'success');
      }
    } else {
      result = await createClient(clientData);
      if (result.success) {
        showToast('Cliente creado correctamente', 'success');
      }
    }
    
    if (result.success) {
      closeClientModal();
      loadClients(); // Recargar la tabla
    } else {
      showToast(result.error || 'Error al guardar el cliente', 'error');
    }
  } catch (error) {
    console.error('Error saving client:', error);
    showToast('Error al guardar el cliente', 'error');
  } finally {
    // Rehabilitar botón
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

/**
 * Abrir modal de confirmación de eliminación
 */
function openDeleteModal(clientId, clientName) {
  clientToDelete = clientId;
  
  // Mostrar nombre del cliente
  const nameElement = document.getElementById('delete-client-name');
  if (nameElement) {
    nameElement.textContent = `Cliente: ${clientName}`;
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
function closeDeleteModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  clientToDelete = null;
}

/**
 * Confirmar eliminación del cliente
 */
async function confirmDeleteClient() {
  if (!clientToDelete) return;
  
  try {
    const result = await deleteClient(clientToDelete);
    
    if (result.success) {
      showToast('Cliente eliminado correctamente', 'success');
      closeDeleteModal();
      loadClients(); // Recargar la tabla
    } else {
      showToast(result.error || 'Error al eliminar el cliente', 'error');
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    showToast('Error al eliminar el cliente', 'error');
  }
}

// Hacer funciones globales para que puedan ser llamadas desde HTML
window.handleSearchClients = handleSearchClients;
window.openCreateClientModal = openCreateClientModal;
window.openEditClientModal = openEditClientModal;
window.closeClientModal = closeClientModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteClient = confirmDeleteClient;
