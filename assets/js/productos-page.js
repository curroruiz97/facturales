/**
 * Productos Page Logic
 * Renderizado de tabla, tarjetas recientes, modal CRUD y paginación
 */

(function () {
  var allProducts = [];
  var currentProductId = null;
  var productToDelete = null;
  var _currentPage = 1;
  var _perPage = 10;

  // ========== Helpers ==========

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtEUR(v) {
    var n = parseFloat(v) || 0;
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  function fmtPct(v) {
    if (v === null || v === undefined) return 'N/A';
    return parseFloat(v).toFixed(0) + '%';
  }

  function taxLabel(code) {
    var map = {
      IVA_21: 'IVA 21%', IVA_10: 'IVA 10%', IVA_4: 'IVA 4%', IVA_0: 'IVA 0%',
      IGIC_7: 'IGIC 7%', IGIC_3: 'IGIC 3%', IGIC_0: 'IGIC 0%', EXENTO: 'Exento'
    };
    return map[code] || code;
  }

  function waitForDB() {
    return new Promise(function (resolve) {
      var tries = 0;
      var iv = setInterval(function () {
        if (window.productosDB || tries > 60) { clearInterval(iv); resolve(); }
        tries++;
      }, 100);
    });
  }

  // ========== Load ==========

  async function loadProducts() {
    await waitForDB();
    var result = await window.productosDB.getProducts();
    if (result.success) {
      allProducts = result.data;
    } else {
      allProducts = [];
      console.error('Error cargando productos:', result.error);
    }
    renderRecentProducts(allProducts);
    renderProductsTable(allProducts);
    renderPagination(allProducts.length);
    var countEl = document.getElementById('products-count');
    if (countEl) countEl.textContent = allProducts.length;
    updateProductsUsageBadge(allProducts.length);
  }

  async function updateProductsUsageBadge(currentCount) {
    var badge = document.getElementById('products-usage-badge');
    if (!badge) return;
    if (!window.planLimits) { badge.classList.add('hidden'); return; }
    try {
      var check = await window.planLimits.canCreateProduct();
      var limitEl = document.getElementById('products-usage-limit');
      var currentEl = document.getElementById('products-usage-current');
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

  // ========== Recent cards ==========

  function renderRecentProducts(products) {
    var container = document.getElementById('recent-products');
    if (!container) return;
    var recent = products.slice(0, 4);
    if (recent.length === 0) {
      container.innerHTML = '<p class="text-sm text-bgray-500 dark:text-bgray-400">No hay productos todavía.</p>';
      return;
    }
    var html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">';
    recent.forEach(function (p) {
      var pvp = window.productosDB.calcPVP(p.precio_venta, p.impuesto);
      html += '<div class="rounded-lg border border-bgray-200 bg-white p-4 dark:border-darkblack-400 dark:bg-darkblack-600">';
      html += '<h4 class="text-sm font-bold text-bgray-900 dark:text-white truncate">' + escapeHtml(p.nombre) + '</h4>';
      html += '<p class="text-xs text-bgray-500 dark:text-bgray-400 mt-0.5">REF ' + escapeHtml(p.referencia || '—') + '</p>';
      html += '<p class="text-xs text-bgray-500 dark:text-bgray-400 mt-0.5">PVP</p>';
      html += '<p class="text-base font-bold text-bgray-900 dark:text-white">' + fmtEUR(pvp) + '</p>';
      html += '<div class="flex items-center gap-2 mt-3">';
      html += '<button onclick="window._productosPage.openEdit(\'' + p.id + '\')" class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-bgray-200 text-bgray-500 hover:border-success-300 hover:text-success-300 dark:border-darkblack-400 transition" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      html += '<button onclick="window._productosPage.openDelete(\'' + p.id + '\')" class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-bgray-200 text-bgray-500 hover:border-red-300 hover:text-red-500 dark:border-darkblack-400 transition" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M10 11v6M14 11v6M15 7V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // ========== Table ==========

  function getPageProducts(products) {
    var start = (_currentPage - 1) * _perPage;
    return products.slice(start, start + _perPage);
  }

  function renderProductsTable(products) {
    var tbody = document.getElementById('products-table-body');
    if (!tbody) return;
    var page = getPageProducts(products);
    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-sm text-bgray-500 dark:text-bgray-400">No se encontraron productos</td></tr>';
      return;
    }
    var html = '';
    page.forEach(function (p) {
      var pvp = window.productosDB.calcPVP(p.precio_venta, p.impuesto);
      var margen = window.productosDB.calcMargen(p.precio_compra, p.precio_venta);
      html += '<tr class="border-b border-bgray-300 dark:border-darkblack-400">';
      html += '<td class="whitespace-nowrap py-4 pr-6"><div><span class="text-sm font-semibold text-bgray-900 dark:text-white">' + escapeHtml(p.nombre) + '</span>';
      if (p.descripcion) html += '<p class="text-xs text-bgray-500 dark:text-bgray-400 truncate max-w-[200px]">' + escapeHtml(p.descripcion) + '</p>';
      html += '</div></td>';
      html += '<td class="whitespace-nowrap px-6 py-4 text-sm text-bgray-900 dark:text-white">' + escapeHtml(p.referencia || '—') + '</td>';
      html += '<td class="whitespace-nowrap px-6 py-4 text-sm text-bgray-900 dark:text-white">' + fmtEUR(p.precio_compra) + '</td>';
      html += '<td class="whitespace-nowrap px-6 py-4 text-sm text-bgray-900 dark:text-white">' + fmtEUR(p.precio_venta) + '</td>';
      html += '<td class="whitespace-nowrap px-6 py-4 text-sm font-semibold ' + (margen !== null && margen >= 0 ? 'text-success-300' : 'text-red-500') + '">' + fmtPct(margen) + '</td>';
      html += '<td class="whitespace-nowrap px-6 py-4 text-sm text-bgray-900 dark:text-white">' + (p.descuento > 0 ? p.descuento + '%' : '—') + '</td>';
      html += '<td class="whitespace-nowrap px-6 py-4 text-sm font-bold text-bgray-900 dark:text-white">' + fmtEUR(pvp) + '</td>';
      html += '<td class="whitespace-nowrap py-4 pl-6 text-right"><div class="flex items-center justify-end gap-2">';
      html += '<button onclick="window._productosPage.openEdit(\'' + p.id + '\')" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bgray-200 text-bgray-500 hover:border-success-300 hover:text-success-300 dark:border-darkblack-400 transition" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      html += '<button onclick="window._productosPage.openDelete(\'' + p.id + '\')" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bgray-200 text-bgray-500 hover:border-red-300 hover:text-red-500 dark:border-darkblack-400 transition" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M10 11v6M14 11v6M15 7V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      html += '</div></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  // ========== Pagination ==========

  function renderPagination(total) {
    var container = document.getElementById('products-page-buttons');
    if (!container) return;
    var pages = Math.ceil(total / _perPage);
    if (pages <= 1) { container.innerHTML = ''; return; }
    var html = '';
    for (var i = 1; i <= pages; i++) {
      var active = i === _currentPage;
      html += '<button onclick="window._productosPage.goPage(' + i + ')" class="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition ' +
        (active ? 'bg-success-300 text-white' : 'text-bgray-600 hover:bg-bgray-100 dark:text-bgray-50 dark:hover:bg-darkblack-500') + '">' + i + '</button>';
    }
    container.innerHTML = html;
  }

  function goPage(n) {
    _currentPage = n;
    renderProductsTable(allProducts);
    renderPagination(allProducts.length);
  }

  // ========== Search ==========

  var _searchTimeout = null;
  function handleSearch(value) {
    clearTimeout(_searchTimeout);
    _searchTimeout = setTimeout(async function () {
      if (!value || !value.trim()) {
        renderProductsTable(allProducts);
        renderPagination(allProducts.length);
        return;
      }
      var term = value.trim().toLowerCase();
      var filtered = allProducts.filter(function (p) {
        return (p.nombre && p.nombre.toLowerCase().indexOf(term) !== -1) ||
               (p.referencia && p.referencia.toLowerCase().indexOf(term) !== -1);
      });
      _currentPage = 1;
      renderProductsTable(filtered);
      renderPagination(filtered.length);
    }, 200);
  }

  // ========== Modal: calculated fields ==========

  function updateCalculatedFields() {
    var precioVenta = parseFloat(document.getElementById('product-precio-venta')?.value) || 0;
    var precioCompra = parseFloat(document.getElementById('product-precio-compra')?.value) || 0;
    var impuesto = document.getElementById('product-impuesto')?.value || 'IVA_21';
    var pvp = window.productosDB.calcPVP(precioVenta, impuesto);
    var margen = window.productosDB.calcMargen(precioCompra, precioVenta);

    var pvpEl = document.getElementById('product-pvp');
    var margenEl = document.getElementById('product-margen');
    if (pvpEl) pvpEl.value = pvp.toFixed(2);
    if (margenEl) margenEl.value = margen !== null ? margen.toFixed(1) + '%' : 'N/A';
  }

  // ========== Modal: open / close ==========

  function openModal() {
    var modal = document.getElementById('product-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  }

  function closeModal() {
    var modal = document.getElementById('product-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    currentProductId = null;
    var form = document.getElementById('product-form');
    if (form) form.reset();
    updateCalculatedFields();
  }

  function openNewModal() {
    currentProductId = null;
    var title = document.getElementById('product-modal-title');
    if (title) title.textContent = 'Nuevo Producto';
    var btn = document.getElementById('product-save-btn');
    if (btn) btn.textContent = 'Guardar Producto';
    var form = document.getElementById('product-form');
    if (form) form.reset();
    updateCalculatedFields();
    openModal();
  }

  async function openEditModal(id) {
    currentProductId = id;
    var title = document.getElementById('product-modal-title');
    if (title) title.textContent = 'Editar Producto';
    var btn = document.getElementById('product-save-btn');
    if (btn) btn.textContent = 'Actualizar Producto';

    await waitForDB();
    var result = await window.productosDB.getProductById(id);
    if (!result.success) {
      if (window.showToast) window.showToast('No se pudo cargar el producto', 'error');
      return;
    }
    var p = result.data;
    document.getElementById('product-nombre').value = p.nombre || '';
    document.getElementById('product-referencia').value = p.referencia || '';
    document.getElementById('product-descripcion').value = p.descripcion || '';
    document.getElementById('product-precio-compra').value = p.precio_compra || 0;
    document.getElementById('product-precio-venta').value = p.precio_venta || 0;
    document.getElementById('product-impuesto').value = p.impuesto || 'IVA_21';
    document.getElementById('product-descuento').value = p.descuento || 0;
    updateCalculatedFields();
    openModal();
  }

  // ========== Delete modal ==========

  function openDeleteModal(id) {
    productToDelete = id;
    var modal = document.getElementById('delete-product-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  }

  function closeDeleteModal() {
    productToDelete = null;
    var modal = document.getElementById('delete-product-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    await waitForDB();
    var result = await window.productosDB.deleteProduct(productToDelete);
    closeDeleteModal();
    if (result.success) {
      if (window.showToast) window.showToast('Producto eliminado', 'success');
      loadProducts();
    } else {
      if (window.showToast) window.showToast(result.error || 'Error al eliminar', 'error');
    }
  }

  // ========== Submit ==========

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    var data = {
      nombre: document.getElementById('product-nombre')?.value,
      referencia: document.getElementById('product-referencia')?.value,
      descripcion: document.getElementById('product-descripcion')?.value,
      precio_compra: document.getElementById('product-precio-compra')?.value,
      precio_venta: document.getElementById('product-precio-venta')?.value,
      impuesto: document.getElementById('product-impuesto')?.value,
      descuento: document.getElementById('product-descuento')?.value
    };

    var saveBtn = document.getElementById('product-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }

    await waitForDB();
    var result;
    if (currentProductId) {
      result = await window.productosDB.updateProduct(currentProductId, data);
    } else {
      result = await window.productosDB.createProduct(data);
    }

    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = currentProductId ? 'Actualizar Producto' : 'Guardar Producto'; }

    if (result.success) {
      closeModal();
      if (window.showToast) window.showToast(currentProductId ? 'Producto actualizado' : 'Producto creado', 'success');
      loadProducts();
    } else {
      if (window.showToast) window.showToast(result.error || 'Error', 'error');
    }
  }

  // ========== Init ==========

  function init() {
    // Form
    var form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleSubmit);

    // Close modal buttons
    document.querySelectorAll('[data-action="close-product-modal"]').forEach(function (btn) {
      btn.addEventListener('click', closeModal);
    });
    document.querySelectorAll('[data-action="close-delete-product-modal"]').forEach(function (btn) {
      btn.addEventListener('click', closeDeleteModal);
    });

    // New product button
    var newBtn = document.getElementById('btn-new-product');
    if (newBtn) newBtn.addEventListener('click', openNewModal);

    // Calculated fields listeners
    ['product-precio-venta', 'product-precio-compra', 'product-impuesto', 'product-descuento'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateCalculatedFields);
        el.addEventListener('change', updateCalculatedFields);
      }
    });

    // Confirm delete
    var confirmBtn = document.getElementById('btn-confirm-delete-product');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmDelete);

    // Search
    var searchInput = document.getElementById('products-search');
    if (searchInput) searchInput.addEventListener('input', function () { handleSearch(this.value); });

    // Load data
    loadProducts();
  }

  // Expose
  window._productosPage = {
    openEdit: openEditModal,
    openDelete: openDeleteModal,
    goPage: goPage,
    reload: loadProducts
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
