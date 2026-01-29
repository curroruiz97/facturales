/**
 * Invoice Clients Logic
 * Lógica para autocompletado y selección de clientes en la página de facturación
 */

// Estado global
let selectedClientId = null;
let searchTimeout = null;

/**
 * Manejar búsqueda de clientes con debounce
 */
function handleClientSearch(searchTerm) {
  // Limpiar timeout anterior
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Si el término tiene menos de 3 caracteres, ocultar dropdown
  if (searchTerm.trim().length < 3) {
    hideClientDropdown();
    return;
  }
  
  // Buscar después de 300ms de inactividad
  searchTimeout = setTimeout(async () => {
    await searchAndDisplayClients(searchTerm);
  }, 300);
}

/**
 * Buscar clientes y mostrar en dropdown
 */
async function searchAndDisplayClients(searchTerm) {
  try {
    const result = await searchClientsAutocomplete(searchTerm);
    
    if (result.success) {
      renderClientOptions(result.data);
      showClientDropdown();
    } else {
      console.error('Error searching clients:', result.error);
    }
  } catch (error) {
    console.error('Error in searchAndDisplayClients:', error);
  }
}

/**
 * Renderizar opciones de clientes en el dropdown
 */
function renderClientOptions(clients) {
  const optionsList = document.getElementById('client-options-list');
  
  if (!optionsList) return;
  
  // Limpiar lista
  optionsList.innerHTML = '';
  
  if (clients.length === 0) {
    optionsList.innerHTML = `
      <div class="px-4 py-3 text-sm text-bgray-500 dark:text-bgray-50">
        No se encontraron clientes
      </div>
    `;
    return;
  }
  
  // Renderizar cada cliente
  clients.forEach(client => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'client-option w-full text-left px-4 py-3 hover:bg-bgray-50 dark:hover:bg-darkblack-600 rounded-lg transition-colors';
    button.onclick = () => selectClientById(client.id);
    
    button.innerHTML = `
      <p class="font-semibold text-bgray-900 dark:text-white text-sm">${client.nombre_razon_social}</p>
      <p class="text-xs text-bgray-500">Identificador: ${client.identificador}</p>
    `;
    
    optionsList.appendChild(button);
  });
}

/**
 * Seleccionar un cliente por ID
 */
async function selectClientById(clientId) {
  try {
    const result = await getClientById(clientId);
    
    if (result.success) {
      const client = result.data;
      selectedClientId = client.id;
      
      // Auto-rellenar campos del formulario
      fillClientFields(client);
      
      // Ocultar dropdown
      hideClientDropdown();
    } else {
      showToast('Error al cargar el cliente', 'error');
    }
  } catch (error) {
    console.error('Error selecting client:', error);
    showToast('Error al seleccionar el cliente', 'error');
  }
}

/**
 * Auto-rellenar campos del cliente en el formulario
 */
function fillClientFields(client) {
  // Nombre
  const nameInput = document.getElementById('client-name');
  if (nameInput) {
    nameInput.value = client.nombre_razon_social;
  }
  
  // Identificador
  const nifInput = document.getElementById('client-nif');
  if (nifInput) {
    nifInput.value = client.identificador || '';
  }
  
  // Email
  const emailInput = document.getElementById('client-email');
  if (emailInput) {
    emailInput.value = client.email || '';
  }
  
  // Teléfono
  const phoneInput = document.getElementById('client-phone');
  if (phoneInput) {
    phoneInput.value = client.telefono || '';
  }
  
  // Dirección completa
  const addressInput = document.getElementById('client-address');
  if (addressInput) {
    // Formar dirección completa
    const addressParts = [];
    if (client.direccion) addressParts.push(client.direccion);
    if (client.codigo_postal) addressParts.push(client.codigo_postal);
    if (client.ciudad) addressParts.push(client.ciudad);
    if (client.pais) addressParts.push(client.pais);
    
    addressInput.value = addressParts.join(', ');
  }
}

/**
 * Mostrar dropdown de clientes
 */
function showClientDropdown() {
  const dropdown = document.getElementById('client-dropdown');
  if (dropdown) {
    dropdown.classList.remove('hidden');
  }
}

/**
 * Ocultar dropdown de clientes
 */
function hideClientDropdown() {
  const dropdown = document.getElementById('client-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

/**
 * Abrir modal de crear cliente desde facturas
 */
function openInvoiceCreateClientModal() {
  const modal = document.getElementById('create-client-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Cerrar modal de crear cliente
 */
function closeInvoiceCreateClientModal() {
  const modal = document.getElementById('create-client-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  
  // Limpiar formulario
  const form = modal?.querySelector('form');
  if (form) {
    form.reset();
  }
}

/**
 * Guardar nuevo cliente desde modal de facturas
 */
async function handleInvoiceSaveClient(event) {
  event.preventDefault();
  
  // Deshabilitar botón
  const saveBtn = event.target.querySelector('button[type="submit"]');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';
  
  try {
    // Recoger datos del formulario
    const clientData = {
      nombre_razon_social: document.getElementById('new-client-name').value,
      identificador: document.getElementById('new-client-nif').value,
      email: document.getElementById('new-client-email').value || null,
      telefono: document.getElementById('new-client-phone').value || null,
      direccion: document.getElementById('new-client-address').value || null,
      codigo_postal: document.getElementById('new-client-postal').value || null,
      ciudad: document.getElementById('new-client-city').value || null,
      pais: document.getElementById('new-client-country').value || null,
      dia_facturacion: document.getElementById('new-client-billing-day').value || null,
      estado: document.getElementById('new-client-status').value === 'Activo' ? 'activo' : 'inactivo'
    };
    
    const result = await createClient(clientData);
    
    if (result.success) {
      showToast('Cliente creado correctamente', 'success');
      
      // Auto-seleccionar el cliente recién creado
      selectedClientId = result.data.id;
      fillClientFields(result.data);
      
      // Cerrar modal
      closeInvoiceCreateClientModal();
    } else {
      showToast(result.error || 'Error al crear el cliente', 'error');
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
 * Cerrar dropdown al hacer clic fuera
 */
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('client-dropdown');
  const input = document.getElementById('client-name');
  
  if (dropdown && input) {
    // Si el clic no fue en el input ni en el dropdown, cerrar
    if (!input.contains(event.target) && !dropdown.contains(event.target)) {
      hideClientDropdown();
    }
  }
});

// También manejar el botón de cerrar modal existente
const closeModalBtn = document.querySelector('#create-client-modal button[onclick*="closeCreateClientModal"]');
if (closeModalBtn) {
  closeModalBtn.onclick = closeInvoiceCreateClientModal;
}

// Hacer funciones globales
window.handleClientSearch = handleClientSearch;
window.showClientDropdown = showClientDropdown;
window.hideClientDropdown = hideClientDropdown;
window.selectClientById = selectClientById;
window.openInvoiceCreateClientModal = openInvoiceCreateClientModal;
window.closeInvoiceCreateClientModal = closeInvoiceCreateClientModal;
window.handleInvoiceSaveClient = handleInvoiceSaveClient;
