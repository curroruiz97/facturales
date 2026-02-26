/**
 * Users Page Logic
 * Lógica específica para la página de gestión de clientes (users.html)
 */

// Sanitización XSS
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Estado global
let currentClientId = null;
let clientToDelete = null;
let allClients = [];
let _usersInvoiceTotals = {}; // { client_id: totalAmount }
let _usersExpenseTotals = {}; // { client_id: totalGastos }
let _usersCurrentPage = 1;
let _usersPerPage = 10;

/**
 * Inicializar la página al cargar
 */
document.addEventListener('DOMContentLoaded', function() {
  loadClients();
  initModal();
});

/**
 * Cargar totales facturados por cliente desde invoices (status = 'issued' AND is_paid = true)
 * Solo cuenta facturas emitidas Y pagadas. Si una factura se marca como no pagada,
 * deja de contabilizarse en el total.
 * 1) Suma por client_id para facturas vinculadas correctamente.
 * 2) Para facturas antiguas sin client_id, extrae el NIF/CIF del campo
 *    invoice_data->client->nif y lo resuelve contra clientes.identificador
 *    después de cargar la lista de clientes (match fiable e inmutable).
 */
var _pendingUnlinkedInvoices = []; // facturas sin client_id, pendientes de resolver por NIF
async function loadInvoiceTotals() {
  try {
    if (!window.supabaseClient) return;
    const supabase = window.supabaseClient;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    _usersInvoiceTotals = {};
    _usersExpenseTotals = {};
    _pendingUnlinkedInvoices = [];

    // Query 1: facturas CON client_id, emitidas y pagadas
    const { data: linked, error: err1 } = await supabase
      .from('invoices')
      .select('client_id, total_amount')
      .eq('user_id', user.id)
      .eq('status', 'issued')
      .eq('is_paid', true)
      .not('client_id', 'is', null);

    if (!err1 && linked) {
      linked.forEach(function(inv) {
        _usersInvoiceTotals[inv.client_id] = (_usersInvoiceTotals[inv.client_id] || 0) + (parseFloat(inv.total_amount) || 0);
      });
    }

    // Query 2: facturas SIN client_id (datos antiguos), emitidas y pagadas
    const { data: unlinked, error: err2 } = await supabase
      .from('invoices')
      .select('total_amount, invoice_data')
      .eq('user_id', user.id)
      .eq('status', 'issued')
      .eq('is_paid', true)
      .is('client_id', null);

    if (!err2 && unlinked) {
      _pendingUnlinkedInvoices = unlinked;
    }

    // Query 3: gastos (transacciones de tipo gasto) por cliente
    const { data: gastos, error: err3 } = await supabase
      .from('transacciones')
      .select('cliente_id, importe')
      .eq('user_id', user.id)
      .eq('tipo', 'gasto')
      .not('cliente_id', 'is', null);

    if (!err3 && gastos) {
      gastos.forEach(function(g) {
        _usersExpenseTotals[g.cliente_id] = (_usersExpenseTotals[g.cliente_id] || 0) + (parseFloat(g.importe) || 0);
      });
    }
  } catch (e) {
    console.error('Error loading invoice totals:', e);
  }
}

/**
 * Resolver facturas sin client_id usando el NIF almacenado en invoice_data.
 * Se llama DESPUÉS de cargar la lista de clientes.
 * @param {Array} clients - Lista de clientes cargados
 */
function resolveUnlinkedInvoiceTotals(clients) {
  if (!_pendingUnlinkedInvoices || _pendingUnlinkedInvoices.length === 0) return;
  if (!clients || clients.length === 0) return;

  // Crear mapa de identificador (NIF/CIF) → client.id
  var nifToClientId = {};
  clients.forEach(function(c) {
    if (c.identificador) {
      nifToClientId[c.identificador.trim().toUpperCase()] = c.id;
    }
  });

  _pendingUnlinkedInvoices.forEach(function(inv) {
    var nif = inv.invoice_data && inv.invoice_data.client && inv.invoice_data.client.nif;
    if (nif) {
      var clientId = nifToClientId[nif.trim().toUpperCase()];
      if (clientId) {
        _usersInvoiceTotals[clientId] = (_usersInvoiceTotals[clientId] || 0) + (parseFloat(inv.total_amount) || 0);
      }
    }
  });

  // Limpiar para no resolver dos veces
  _pendingUnlinkedInvoices = [];
}

/**
 * Cargar clientes desde Supabase
 */
async function loadClients(searchTerm = '') {
  try {
    // Cargar totales de facturas primero
    await loadInvoiceTotals();

    const result = await getClients(searchTerm);
    
    if (result.success) {
      // Resolver facturas antiguas sin client_id usando NIF/CIF
      resolveUnlinkedInvoiceTotals(result.data);
      
      // Añadir totales a cada cliente
      result.data.forEach(function(c) {
        c._totalFacturado = _usersInvoiceTotals[c.id] || 0;
        c._totalGastos = _usersExpenseTotals[c.id] || 0;
      });
      allClients = result.data;
      _usersCurrentPage = 1;
      renderPage();
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
  updateClientsUsageBadge(count);
}

async function updateClientsUsageBadge(currentCount) {
  var badge = document.getElementById('clients-usage-badge');
  if (!badge) return;
  if (!window.planLimits) { badge.classList.add('hidden'); return; }

  try {
    var check = await window.planLimits.canCreateClient();
    var limitEl = document.getElementById('clients-usage-limit');
    var currentEl = document.getElementById('clients-usage-current');
    if (!limitEl || !currentEl) return;

    var count = typeof currentCount === 'number' ? currentCount : check.current;
    currentEl.textContent = count;
    limitEl.textContent = window.planLimits.formatLimit(check.limit);

    if (check.limit !== Infinity && count >= check.limit) {
      currentEl.classList.add('text-error-300');
      currentEl.classList.remove('text-bgray-900', 'dark:text-white');
    } else {
      currentEl.classList.remove('text-error-300');
      currentEl.classList.add('text-bgray-900', 'dark:text-white');
    }
    badge.classList.remove('hidden');
  } catch (_) {}
}

/**
 * Formatear moneda EUR
 */
function formatEUR(amount) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' €';
}

/**
 * Renderizar la página actual
 */
function renderPage() {
  var total = allClients.length;
  var totalPages = Math.max(1, Math.ceil(total / _usersPerPage));
  if (_usersCurrentPage > totalPages) _usersCurrentPage = totalPages;
  var start = (_usersCurrentPage - 1) * _usersPerPage;
  var end = start + _usersPerPage;
  var pageClients = allClients.slice(start, end);

  renderClientsTable(pageClients);
  renderPagination(totalPages);
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
  
  tbody.innerHTML = '';
  
  if (clients.length === 0 && allClients.length === 0) {
    renderEmptyState();
    return;
  }

  if (clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-12 text-center"><p class="text-sm text-bgray-600 dark:text-bgray-50">No hay contactos en esta página</p></td></tr>';
    return;
  }
  
  clients.forEach(client => {
    const row = document.createElement('tr');
    row.className = 'border-b border-bgray-200 dark:border-darkblack-400';
    
    const initials = getInitials(client.nombre_razon_social);
    const chevronDown = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="ml-1 opacity-60"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const tipoBadge = client.estado === 'recurrente' 
      ? `<button onclick="toggleClientStatus('${client.id}', '${client.estado}')" class="inline-flex items-center rounded-lg bg-success-50 px-3 py-1 text-xs font-semibold text-success-300 dark:bg-darkblack-500 hover:bg-success-100 transition-colors cursor-pointer">Recurrente${chevronDown}</button>${client.dia_facturacion ? '<p class="text-[11px] font-medium text-bgray-500 dark:text-bgray-400 mt-1">Día ' + escapeHtml(client.dia_facturacion) + ' de cada mes</p>' : ''}`
      : `<button onclick="toggleClientStatus('${client.id}', '${client.estado}')" class="inline-flex items-center rounded-lg bg-bgray-100 px-3 py-1 text-xs font-semibold text-bgray-700 dark:bg-darkblack-500 dark:text-bgray-50 hover:bg-bgray-200 transition-colors cursor-pointer">Puntual${chevronDown}</button>`;
    
    const totalFacturado = client._totalFacturado || 0;
    const totalGastos = client._totalGastos || 0;
    
    row.innerHTML = `
      <td class="py-5 pr-6">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bgray-100 text-sm font-bold text-bgray-700 dark:bg-darkblack-500 dark:text-white">
            ${escapeHtml(initials)}
          </div>
          <div>
            <p class="text-sm font-semibold text-bgray-900 dark:text-white">${escapeHtml(client.nombre_razon_social)}</p>
            <p class="text-xs font-medium text-bgray-600 dark:text-bgray-50">${escapeHtml(client.identificador)}</p>
            ${client.tipo_cliente === 'empresa'
              ? '<span class="inline-block mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">Empresa</span>'
              : '<span class="inline-block mt-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">Aut\u00f3nomo</span>'
            }
          </div>
        </div>
      </td>
      <td class="px-6 py-5">
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-bgray-900 dark:text-white">${escapeHtml(client.email || '-')}</p>
          <p class="text-xs font-medium text-bgray-600 dark:text-bgray-50">${escapeHtml(client.telefono || '-')}</p>
          <p class="text-xs font-medium text-bgray-600 dark:text-bgray-50">${escapeHtml(formatFullAddress(client))}</p>
        </div>
      </td>
      <td class="px-6 py-5">
        ${tipoBadge}
      </td>
      <td class="px-6 py-5">
        <p class="text-sm font-semibold text-green-600 dark:text-green-400">${formatEUR(totalFacturado)}</p>
        <p class="text-sm font-semibold text-red-500 dark:text-red-400">${formatEUR(totalGastos)}</p>
      </td>
      <td class="py-5 pl-6 text-right">
        <div class="inline-flex items-center gap-2">
          <button onclick="openEditClientModal('${client.id}')" class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400" type="button" title="Editar">
            <svg class="stroke-bgray-900 dark:stroke-bgray-50" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 3.75H4.5C3.67157 3.75 3 4.42157 3 5.25V13.5C3 14.3284 3.67157 15 4.5 15H12.75C13.5784 15 14.25 14.3284 14.25 13.5V7.5" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M13.125 2.62501C13.7213 2.02872 14.6887 2.02872 15.285 2.62501C15.8813 3.2213 15.8813 4.18872 15.285 4.78501L9 11.07L6 12L6.93 9L13.125 2.62501Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button onclick="openDeleteModal('${client.id}')" class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bgray-100 transition hover:bg-bgray-200 dark:bg-darkblack-500 hover:dark:bg-darkblack-400" type="button" title="Eliminar">
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
 * Renderizar paginación
 */
function renderPagination(totalPages) {
  var container = document.getElementById('users-page-buttons');
  if (!container) return;
  container.innerHTML = '';

  // Botón anterior
  var prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.innerHTML = '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.7217 5.03271L7.72168 10.0327L12.7217 15.0327" stroke="#A0AEC0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  prevBtn.disabled = _usersCurrentPage <= 1;
  prevBtn.style.opacity = _usersCurrentPage <= 1 ? '0.3' : '1';
  prevBtn.onclick = function() { if (_usersCurrentPage > 1) { _usersCurrentPage--; renderPage(); } };
  container.appendChild(prevBtn);

  // Botones de página
  var pagesDiv = document.createElement('div');
  pagesDiv.className = 'flex items-center';

  for (var i = 1; i <= totalPages; i++) {
    (function(page) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = page;
      if (page === _usersCurrentPage) {
        btn.className = 'rounded-lg bg-success-50 px-4 py-1.5 text-xs font-bold text-success-300 dark:bg-darkblack-500 dark:text-bgray-50 lg:px-6 lg:py-2.5 lg:text-sm';
      } else {
        btn.className = 'rounded-lg px-4 py-1.5 text-xs font-bold text-bgray-500 transition duration-300 ease-in-out hover:bg-success-50 hover:text-success-300 dark:hover:bg-darkblack-500 lg:px-6 lg:py-2.5 lg:text-sm';
      }
      btn.onclick = function() { _usersCurrentPage = page; renderPage(); };
      pagesDiv.appendChild(btn);
    })(i);

    // Si hay muchas páginas, mostrar "..."
    if (totalPages > 5 && i === 2 && _usersCurrentPage > 3) {
      var dots = document.createElement('span');
      dots.className = 'text-sm text-bgray-500';
      dots.textContent = '. . . .';
      pagesDiv.appendChild(dots);
      i = Math.max(i, Math.min(_usersCurrentPage - 1, totalPages - 2));
    }
    if (totalPages > 5 && i === _usersCurrentPage + 1 && i < totalPages - 1) {
      var dots2 = document.createElement('span');
      dots2.className = 'text-sm text-bgray-500';
      dots2.textContent = '. . . .';
      pagesDiv.appendChild(dots2);
      i = totalPages - 1;
    }
  }
  container.appendChild(pagesDiv);

  // Botón siguiente
  var nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.innerHTML = '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.72168 5.03271L12.7217 10.0327L7.72168 15.0327" stroke="#A0AEC0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  nextBtn.disabled = _usersCurrentPage >= totalPages;
  nextBtn.style.opacity = _usersCurrentPage >= totalPages ? '0.3' : '1';
  nextBtn.onclick = function() { if (_usersCurrentPage < totalPages) { _usersCurrentPage++; renderPage(); } };
  container.appendChild(nextBtn);
}

/**
 * Paginación: cambiar items por página
 */
function setUsersPerPage(n) {
  _usersPerPage = n;
  _usersCurrentPage = 1;
  var display = document.getElementById('users-per-page-display');
  if (display) display.textContent = n;
  var dd = document.getElementById('users-per-page-filter');
  if (dd) dd.classList.add('hidden');
  renderPage();
}
window.setUsersPerPage = setUsersPerPage;

function toggleUsersPerPageDropdown() {
  var dd = document.getElementById('users-per-page-filter');
  if (dd) dd.classList.toggle('hidden');
}
window.toggleUsersPerPageDropdown = toggleUsersPerPageDropdown;

/**
 * Renderizar estado vacío cuando no hay clientes
 */
function renderEmptyState() {
  const tbody = document.getElementById('clients-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-12 text-center">
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
            Nuevo Contacto
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
  
  const openButtons = document.querySelectorAll('.modal-open');
  openButtons.forEach(btn => {
    btn.addEventListener('click', () => openCreateClientModal());
  });
  
  const closeButtons = document.querySelectorAll('#step-1-cancel, #step-1-cancel-2');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => closeClientModal());
  });
  
  const overlay = modal?.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => closeClientModal());
  }
  
  if (form) {
    form.addEventListener('submit', handleSubmitClient);
  }
}

function openCreateClientModal() {
  currentClientId = null;
  const title = document.querySelector('#multi-step-modal h2, #multi-step-modal h3');
  if (title) title.textContent = 'Nuevo Contacto';
  document.getElementById('client-form').reset();
  document.getElementById('client-id').value = '';
  const saveBtn = document.getElementById('client-save-btn');
  if (saveBtn) saveBtn.textContent = 'Guardar';
  const modal = document.getElementById('multi-step-modal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

async function openEditClientModal(clientId) {
  currentClientId = clientId;
  const title = document.querySelector('#multi-step-modal h2, #multi-step-modal h3');
  if (title) title.textContent = 'Editar Contacto';
  const saveBtn = document.getElementById('client-save-btn');
  if (saveBtn) saveBtn.textContent = 'Actualizar';
  const result = await getClientById(clientId);
  if (result.success) {
    const client = result.data;
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.nombre_razon_social || '';
    document.getElementById('client-taxid').value = client.identificador || '';
    document.getElementById('client-tipo').value = client.tipo_cliente || 'autonomo';
    document.getElementById('client-email').value = client.email || '';
    document.getElementById('client-phone').value = client.telefono || '';
    document.getElementById('client-address').value = client.direccion || '';
    document.getElementById('client-postal-code').value = client.codigo_postal || '';
    document.getElementById('client-city').value = client.ciudad || '';
    document.getElementById('client-country').value = client.pais || '';
    document.getElementById('client-billing-day').value = client.dia_facturacion || '30';
    document.getElementById('client-status').value = client.estado === 'recurrente' ? 'recurrente' : 'puntual';
    const modal = document.getElementById('multi-step-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  } else {
    showToast('Error al cargar el cliente', 'error');
  }
}

function closeClientModal() {
  const modal = document.getElementById('multi-step-modal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  currentClientId = null;
}

async function handleSubmitClient(event) {
  event.preventDefault();
  const saveBtn = document.getElementById('client-save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';
  try {
    const clientData = {
      nombre_razon_social: document.getElementById('client-name').value,
      identificador: document.getElementById('client-taxid').value,
      tipo_cliente: document.getElementById('client-tipo').value,
      email: document.getElementById('client-email').value || null,
      telefono: document.getElementById('client-phone').value || null,
      direccion: document.getElementById('client-address').value || null,
      codigo_postal: document.getElementById('client-postal-code').value || null,
      ciudad: document.getElementById('client-city').value || null,
      pais: document.getElementById('client-country').value || null,
      dia_facturacion: document.getElementById('client-billing-day').value || null,
      estado: document.getElementById('client-status').value === 'recurrente' ? 'recurrente' : 'puntual'
    };
    let result;
    if (currentClientId) {
      result = await updateClient(currentClientId, clientData);
      if (result.success) showToast('Cliente actualizado correctamente', 'success');
    } else {
      result = await createClient(clientData);
      if (result.success) showToast('Cliente creado correctamente', 'success');
    }
    if (result.success) { closeClientModal(); loadClients(); }
    else showToast(result.error || 'Error al guardar el cliente', 'error');
  } catch (error) {
    console.error('Error saving client:', error);
    showToast('Error al guardar el cliente', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

function openDeleteModal(clientId) {
  clientToDelete = clientId;
  const client = allClients.find(c => c.id === clientId);
  const clientName = client ? client.nombre_razon_social : 'Sin nombre';
  const nameElement = document.getElementById('delete-client-name');
  if (nameElement) nameElement.textContent = `Cliente: ${clientName}`;
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  clientToDelete = null;
}

async function confirmDeleteClient() {
  if (!clientToDelete) return;
  try {
    const result = await deleteClient(clientToDelete);
    if (result.success) { showToast('Cliente eliminado correctamente', 'success'); closeDeleteModal(); loadClients(); }
    else showToast(result.error || 'Error al eliminar el cliente', 'error');
  } catch (error) {
    console.error('Error deleting client:', error);
    showToast('Error al eliminar el cliente', 'error');
  }
}

async function toggleClientStatus(clientId, currentStatus) {
  try {
    const newStatus = currentStatus === 'recurrente' ? 'puntual' : 'recurrente';
    const result = await updateClient(clientId, { estado: newStatus });
    if (result.success) {
      showToast(`Cliente marcado como ${newStatus}`, 'success');
      loadClients();
    } else {
      showToast(result.error || 'Error al cambiar el estado', 'error');
    }
  } catch (error) {
    console.error('Error toggling status:', error);
    showToast('Error al cambiar el estado', 'error');
  }
}

// ============================================================
// Importación masiva de contactos (CSV/XLSX)
// ============================================================

var _importValidRows = [];
var _importInvalidRows = [];

function openImportModal() {
  var modal = document.getElementById('import-modal');
  if (!modal) return;

  // Resetear a estado inicial
  _importValidRows = [];
  _importInvalidRows = [];
  document.getElementById('import-file-input').value = '';

  showImportStep('select');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeImportModal() {
  var modal = document.getElementById('import-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  _importValidRows = [];
  _importInvalidRows = [];
}

function showImportStep(step) {
  var steps = ['select', 'preview', 'progress', 'summary'];
  steps.forEach(function (s) {
    var el = document.getElementById('import-step-' + s);
    if (el) el.classList.toggle('hidden', s !== step);
  });

  var cancelBtn = document.getElementById('import-cancel-btn');
  var confirmBtn = document.getElementById('import-confirm-btn');
  var closeBtn = document.getElementById('import-close-btn');

  if (cancelBtn) cancelBtn.classList.toggle('hidden', step === 'progress' || step === 'summary');
  if (confirmBtn) confirmBtn.classList.toggle('hidden', step !== 'preview');
  if (closeBtn) closeBtn.classList.toggle('hidden', step !== 'summary');
}

async function handleFileSelected(file) {
  if (!file) return;

  if (!window.csvImport) {
    showToast('Módulo de importación no disponible', 'error');
    return;
  }

  showImportStep('progress');
  document.getElementById('import-progress-text').textContent = 'Analizando archivo...';
  document.getElementById('import-progress-bar').style.width = '0%';

  try {
    var result = await window.csvImport.processFile(file);

    _importValidRows = result.validRows;
    _importInvalidRows = result.invalidRows;

    renderImportPreview(result);
    showImportStep('preview');
  } catch (err) {
    showToast(err.message || 'Error al procesar el archivo', 'error');
    showImportStep('select');
  }
}

function renderImportPreview(result) {
  // Contadores
  var validEl = document.getElementById('import-valid-count');
  var invalidEl = document.getElementById('import-invalid-count');
  if (validEl) validEl.innerHTML =
    '<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg> ' +
    result.validRows.length + ' válidos';
  if (invalidEl) invalidEl.innerHTML =
    '<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg> ' +
    result.invalidRows.length + ' con errores';

  // Columnas mapeadas
  var colsList = document.getElementById('import-columns-list');
  if (colsList) {
    var html = '';
    for (var orig in result.headerMap) {
      html += '<span class="inline-flex items-center rounded bg-success-50 dark:bg-success-300/10 px-2 py-0.5 text-[11px] font-medium text-success-300">' +
        escapeHtml(orig) + ' &rarr; ' + escapeHtml(result.headerMap[orig]) + '</span>';
    }
    if (result.unmappedHeaders.length > 0) {
      result.unmappedHeaders.forEach(function (h) {
        html += '<span class="inline-flex items-center rounded bg-bgray-100 dark:bg-darkblack-500 px-2 py-0.5 text-[11px] font-medium text-bgray-500">' +
          escapeHtml(h) + ' (ignorada)</span>';
      });
    }
    colsList.innerHTML = html;
  }

  // Tabla preview (hasta 20 filas)
  var previewFields = ['nombre_razon_social', 'identificador', 'email', 'telefono', 'estado'];
  var fieldLabels = { nombre_razon_social: 'Nombre', identificador: 'NIF/CIF', email: 'Email', telefono: 'Teléfono', estado: 'Estado' };

  var thead = document.getElementById('import-preview-thead');
  if (thead) {
    var headerHtml = '<tr>';
    headerHtml += '<th class="px-3 py-2 text-xs font-semibold text-bgray-500 dark:text-bgray-400">#</th>';
    previewFields.forEach(function (f) {
      headerHtml += '<th class="px-3 py-2 text-xs font-semibold text-bgray-500 dark:text-bgray-400">' + (fieldLabels[f] || f) + '</th>';
    });
    headerHtml += '<th class="px-3 py-2 text-xs font-semibold text-bgray-500 dark:text-bgray-400">Estado</th>';
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;
  }

  var tbody = document.getElementById('import-preview-tbody');
  if (tbody) {
    var bodyHtml = '';
    var allRows = [];

    result.validRows.slice(0, 20).forEach(function (r) {
      allRows.push({ row: r, isValid: true });
    });
    result.invalidRows.slice(0, 10).forEach(function (r) {
      allRows.push({ row: r, isValid: false });
    });

    allRows.sort(function (a, b) { return a.row.rowIndex - b.row.rowIndex; });

    allRows.slice(0, 20).forEach(function (item) {
      var r = item.row;
      var bgClass = item.isValid ? '' : 'bg-red-50/50 dark:bg-red-900/10';
      bodyHtml += '<tr class="border-b border-bgray-100 dark:border-darkblack-500 ' + bgClass + '">';
      bodyHtml += '<td class="px-3 py-2 text-xs text-bgray-500">' + r.rowIndex + '</td>';
      previewFields.forEach(function (f) {
        var val = r.data ? (r.data[f] || '') : '';
        bodyHtml += '<td class="px-3 py-2 text-xs text-bgray-900 dark:text-white">' + escapeHtml(val) + '</td>';
      });
      if (item.isValid) {
        bodyHtml += '<td class="px-3 py-2"><span class="inline-block h-2 w-2 rounded-full bg-green-500"></span></td>';
      } else {
        bodyHtml += '<td class="px-3 py-2" title="' + escapeHtml(r.errors.join('; ')) + '"><span class="inline-block h-2 w-2 rounded-full bg-red-500"></span></td>';
      }
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // Errores detallados
  var errSection = document.getElementById('import-errors-section');
  var errTbody = document.getElementById('import-errors-tbody');
  if (errSection && errTbody) {
    if (result.invalidRows.length > 0) {
      errSection.classList.remove('hidden');
      var errHtml = '';
      result.invalidRows.forEach(function (r) {
        errHtml += '<tr class="border-b border-red-100 dark:border-red-900/20">';
        errHtml += '<td class="px-3 py-1.5 text-red-700 dark:text-red-400 font-medium">' + r.rowIndex + '</td>';
        errHtml += '<td class="px-3 py-1.5 text-red-600 dark:text-red-400">' + escapeHtml(r.errors.join('; ')) + '</td>';
        errHtml += '</tr>';
      });
      errTbody.innerHTML = errHtml;
    } else {
      errSection.classList.add('hidden');
    }
  }

  // Botón confirmar
  var confirmBtn = document.getElementById('import-confirm-btn');
  if (confirmBtn) {
    var count = result.validRows.length;
    confirmBtn.textContent = 'Importar ' + count + ' contacto' + (count !== 1 ? 's' : '');
    confirmBtn.disabled = count === 0;
    confirmBtn.classList.remove('hidden');
  }
}

async function executeImport() {
  if (_importValidRows.length === 0) return;
  if (!window.importClientsBulk) {
    showToast('Función de importación no disponible', 'error');
    return;
  }

  showImportStep('progress');
  var progressText = document.getElementById('import-progress-text');
  var progressBar = document.getElementById('import-progress-bar');
  var total = _importValidRows.length;

  try {
    var result = await window.importClientsBulk(_importValidRows, {
      onProgress: function (processed, totalCount) {
        var pct = Math.round((processed / totalCount) * 100);
        if (progressText) progressText.textContent = 'Importando ' + processed + ' de ' + totalCount + '...';
        if (progressBar) progressBar.style.width = pct + '%';
      }
    });

    renderImportSummary(result);
    showImportStep('summary');

    // Refrescar tabla
    loadClients();

    if (result.insertedCount > 0) {
      showToast(result.insertedCount + ' contacto' + (result.insertedCount !== 1 ? 's' : '') + ' importado' + (result.insertedCount !== 1 ? 's' : '') + ' correctamente', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Error durante la importación', 'error');
    showImportStep('preview');
  }
}

function renderImportSummary(result) {
  var statsContainer = document.getElementById('import-summary-stats');
  if (statsContainer) {
    var html = '';

    html += '<div class="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3">';
    html += '<svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
    html += '<span class="text-sm font-semibold text-green-700 dark:text-green-400">' + result.insertedCount + ' contacto' + (result.insertedCount !== 1 ? 's' : '') + ' importado' + (result.insertedCount !== 1 ? 's' : '') + '</span>';
    html += '</div>';

    if (result.skippedDuplicates > 0) {
      html += '<div class="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-4 py-3">';
      html += '<svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
      html += '<span class="text-sm font-semibold text-amber-700 dark:text-amber-400">' + result.skippedDuplicates + ' omitido' + (result.skippedDuplicates !== 1 ? 's' : '') + ' por duplicado</span>';
      html += '</div>';
    }

    if (result.errorRows.length > 0) {
      html += '<div class="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3">';
      html += '<svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
      html += '<span class="text-sm font-semibold text-red-700 dark:text-red-400">' + result.errorRows.length + ' error' + (result.errorRows.length !== 1 ? 'es' : '') + ' de inserción</span>';
      html += '</div>';
    }

    statsContainer.innerHTML = html;
  }

  // Título/icono del resumen
  var titleEl = document.getElementById('import-summary-title');
  if (titleEl) {
    titleEl.textContent = result.insertedCount > 0 ? 'Importación completada' : 'Importación finalizada con errores';
  }

  // Tabla de errores de inserción
  var errContainer = document.getElementById('import-summary-errors');
  var errTbody = document.getElementById('import-summary-errors-tbody');
  if (errContainer && errTbody) {
    if (result.errorRows.length > 0) {
      errContainer.classList.remove('hidden');
      var errHtml = '';
      result.errorRows.forEach(function (e) {
        errHtml += '<tr class="border-b border-red-100 dark:border-red-900/20">';
        errHtml += '<td class="px-3 py-1.5 text-red-700 dark:text-red-400 font-medium">' + (e.row || '-') + '</td>';
        errHtml += '<td class="px-3 py-1.5 text-red-600 dark:text-red-400">' + escapeHtml(e.identificador || '-') + '</td>';
        errHtml += '<td class="px-3 py-1.5 text-red-600 dark:text-red-400">' + escapeHtml(e.reason || 'Error desconocido') + '</td>';
        errHtml += '</tr>';
      });
      errTbody.innerHTML = errHtml;
    } else {
      errContainer.classList.add('hidden');
    }
  }
}

// Inicializar listeners de importación
function initImportListeners() {
  var importBtn = document.getElementById('import-contacts-btn');
  var fileInput = document.getElementById('import-file-input');
  var dropzone = document.getElementById('import-dropzone');
  var overlay = document.getElementById('import-modal-overlay');
  var closeBtn = document.getElementById('import-modal-close');
  var cancelBtn = document.getElementById('import-cancel-btn');
  var confirmBtn = document.getElementById('import-confirm-btn');
  var closeSummaryBtn = document.getElementById('import-close-btn');
  var toggleErrorsBtn = document.getElementById('import-toggle-errors');

  if (importBtn) {
    importBtn.addEventListener('click', openImportModal);
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        handleFileSelected(this.files[0]);
      }
    });
  }

  if (dropzone) {
    dropzone.addEventListener('click', function () {
      fileInput && fileInput.click();
    });

    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.add('border-success-300', 'bg-success-50/30');
    });

    dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('border-success-300', 'bg-success-50/30');
    });

    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('border-success-300', 'bg-success-50/30');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  if (overlay) overlay.addEventListener('click', closeImportModal);
  if (closeBtn) closeBtn.addEventListener('click', closeImportModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeImportModal);
  if (closeSummaryBtn) closeSummaryBtn.addEventListener('click', closeImportModal);

  if (confirmBtn) {
    confirmBtn.addEventListener('click', executeImport);
  }

  if (toggleErrorsBtn) {
    toggleErrorsBtn.addEventListener('click', function () {
      var list = document.getElementById('import-errors-list');
      var arrow = this.querySelector('svg');
      if (list) {
        list.classList.toggle('hidden');
        if (arrow) arrow.classList.toggle('rotate-180');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initImportListeners);

// Hacer funciones globales
window.handleSearchClients = handleSearchClients;
window.openCreateClientModal = openCreateClientModal;
window.openEditClientModal = openEditClientModal;
window.closeClientModal = closeClientModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteClient = confirmDeleteClient;
window.toggleClientStatus = toggleClientStatus;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;

function exportContactsCSV() {
  if (!allClients || allClients.length === 0) {
    showToast('No hay contactos para exportar', 'error');
    return;
  }
  var headers = ['Nombre / Razón Social','NIF/CIF','Tipo Cliente','Email','Teléfono','Dirección','Ciudad','Provincia','Código Postal','País','Día Facturación','Estado','Total Facturado'];
  var rows = allClients.map(function(c) {
    return [
      c.nombre_razon_social || '',
      c.identificador || '',
      c.tipo_cliente === 'empresa' ? 'Empresa' : 'Autónomo',
      c.email || '',
      c.telefono || '',
      c.direccion || '',
      c.ciudad || '',
      c.provincia || '',
      c.codigo_postal || '',
      c.pais || '',
      c.dia_facturacion || '',
      c.estado || '',
      c._totalFacturado != null ? c._totalFacturado : ''
    ].map(function(v) {
      var s = String(v).replace(/"/g, '""');
      return '"' + s + '"';
    }).join(',');
  });
  var csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'contactos_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Contactos exportados correctamente', 'success');
}
window.exportContactsCSV = exportContactsCSV;
