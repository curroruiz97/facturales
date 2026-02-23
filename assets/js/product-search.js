/**
 * Product Search Modal
 * Modal reutilizable para buscar y seleccionar productos desde facturas/presupuestos.
 * Uso: window.productSearch.open(callback) donde callback(product) recibe el producto seleccionado.
 */

(function () {
  var _callback = null;
  var _debounceTimer = null;
  var _modalInjected = false;

  var MODAL_HTML =
    '<div id="product-search-modal" class="fixed inset-0 z-[9999] hidden items-center justify-center overflow-y-auto transition-opacity duration-200" role="dialog" aria-modal="true">' +
      '<div class="absolute inset-0 bg-black/50 backdrop-blur-md" id="product-search-overlay"></div>' +
      '<div class="relative w-full max-w-lg mx-4 my-8">' +
        '<div class="rounded-2xl bg-white dark:bg-darkblack-600 shadow-2xl border-2 border-success-300 overflow-hidden">' +
          '<div class="flex items-center justify-between border-b border-bgray-200 dark:border-darkblack-400 px-6 py-4">' +
            '<h3 class="text-lg font-bold text-bgray-900 dark:text-white">Buscar producto</h3>' +
            '<button type="button" id="product-search-cancel" class="rounded-lg p-2 text-bgray-500 hover:bg-bgray-100 dark:hover:bg-darkblack-500 transition-colors" aria-label="Cerrar">' +
              '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="px-6 pt-4 pb-3">' +
            '<label class="mb-2 block text-xs font-semibold text-bgray-500 dark:text-bgray-400">Nombre del producto o referencia</label>' +
            '<div class="flex h-11 w-full items-center rounded-lg border border-bgray-200 bg-white px-3 focus-within:border-success-300 dark:border-darkblack-400 dark:bg-darkblack-500">' +
              '<input id="product-search-input" type="text" placeholder="Buscar..." class="w-full border-none bg-transparent text-sm text-bgray-900 dark:text-white placeholder:text-bgray-500 focus:outline-none" />' +
              '<svg class="ml-2 h-5 w-5 shrink-0 text-bgray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>' +
            '</div>' +
          '</div>' +
          '<div class="px-6 max-h-[300px] overflow-y-auto">' +
            '<table class="w-full">' +
              '<thead><tr class="border-b border-bgray-200 dark:border-darkblack-400">' +
                '<td class="py-2 text-xs font-semibold uppercase tracking-wider text-bgray-500 dark:text-bgray-400">Producto</td>' +
                '<td class="py-2 text-xs font-semibold uppercase tracking-wider text-bgray-500 dark:text-bgray-400">Referencia</td>' +
                '<td class="py-2 text-xs font-semibold uppercase tracking-wider text-bgray-500 dark:text-bgray-400 text-right">PVP</td>' +
              '</tr></thead>' +
              '<tbody id="product-search-results"></tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtEUR(v) {
    var n = parseFloat(v) || 0;
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  function injectModal() {
    if (_modalInjected) return;
    var div = document.createElement('div');
    div.innerHTML = MODAL_HTML;
    document.body.appendChild(div.firstElementChild);
    _modalInjected = true;

    document.getElementById('product-search-cancel').addEventListener('click', closeModal);
    document.getElementById('product-search-overlay').addEventListener('click', closeModal);
    document.getElementById('product-search-input').addEventListener('input', function () {
      var val = this.value;
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(function () { doSearch(val); }, 300);
    });
  }

  function openModal(callback, prefill) {
    injectModal();
    _callback = callback;
    var modal = document.getElementById('product-search-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    var input = document.getElementById('product-search-input');
    var initialQuery = (prefill && prefill.trim()) ? prefill.trim() : '';
    if (input) { input.value = initialQuery; input.focus(); }
    doSearch(initialQuery);
  }

  function closeModal() {
    var modal = document.getElementById('product-search-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    _callback = null;
  }

  function selectProduct(product) {
    if (_callback) _callback(product);
    closeModal();
  }

  async function doSearch(query) {
    var tbody = document.getElementById('product-search-results');
    if (!tbody) return;

    if (!window.productosDB) {
      tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-sm text-bgray-500">Cargando módulo de productos...</td></tr>';
      return;
    }

    var result = await window.productosDB.searchProducts(query);
    if (!result.success || !result.data.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-sm text-bgray-500 dark:text-bgray-400">Sin resultados</td></tr>';
      return;
    }

    var html = '';
    result.data.forEach(function (p, i) {
      var pvp = window.productosDB.calcPVP(p.precio_venta, p.impuesto);
      html += '<tr class="border-b border-bgray-100 dark:border-darkblack-500 cursor-pointer hover:bg-bgray-50 dark:hover:bg-darkblack-500 transition product-search-row" data-idx="' + i + '">';
      html += '<td class="py-3 pr-2"><span class="text-sm font-medium text-bgray-900 dark:text-white">' + escapeHtml(p.nombre) + '</span></td>';
      html += '<td class="py-3 px-2 text-sm text-bgray-600 dark:text-bgray-50">' + escapeHtml(p.referencia || '—') + '</td>';
      html += '<td class="py-3 pl-2 text-sm font-semibold text-bgray-900 dark:text-white text-right">' + fmtEUR(pvp) + '</td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;

    // Attach click listeners
    var rows = tbody.querySelectorAll('.product-search-row');
    rows.forEach(function (row) {
      row.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        var product = result.data[idx];
        if (product) selectProduct(product);
      });
    });
  }

  window.productSearch = {
    open: openModal,
    close: closeModal
  };
})();
