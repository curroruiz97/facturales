/**
 * Global Search (Ctrl+K)
 * Buscador avanzado que busca en clientes, productos, facturas, presupuestos y transacciones.
 */
(function () {
  'use strict';

  var DEBOUNCE_MS = 300;
  var MAX_PER_CATEGORY = 5;
  var debounceTimer = null;
  var modalEl = null;
  var inputEl = null;
  var resultsEl = null;
  var activeIndex = -1;
  var currentResults = [];

  // Detectar ruta base
  function basePath() {
    var p = window.location.pathname;
    if (p.includes('/invoices/') || p.includes('/billing/')) return '../';
    return './';
  }

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(n) {
    if (n == null) return '';
    return Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }

  // ── Modal HTML ──
  function createModal() {
    if (modalEl) return;
    var div = document.createElement('div');
    div.id = 'global-search-modal';
    div.innerHTML =
      '<div class="gs-backdrop"></div>' +
      '<div class="gs-dialog">' +
        '<div class="gs-input-row">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="gs-icon"><circle cx="11" cy="11" r="7" stroke="#A0AEC0" stroke-width="2"/><path d="M20 20L16.65 16.65" stroke="#A0AEC0" stroke-width="2" stroke-linecap="round"/></svg>' +
          '<input id="gs-input" type="text" placeholder="Buscar clientes, facturas, productos..." autocomplete="off" />' +
          '<kbd class="gs-kbd">ESC</kbd>' +
        '</div>' +
        '<div id="gs-results" class="gs-results"></div>' +
      '</div>';
    document.body.appendChild(div);
    modalEl = div;
    inputEl = div.querySelector('#gs-input');
    resultsEl = div.querySelector('#gs-results');

    // Cerrar al pulsar backdrop
    div.querySelector('.gs-backdrop').addEventListener('click', close);

    // Input con debounce
    inputEl.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = inputEl.value.trim();
      if (q.length < 2) {
        resultsEl.innerHTML = '<div class="gs-empty">Escribe al menos 2 caracteres...</div>';
        currentResults = [];
        activeIndex = -1;
        return;
      }
      resultsEl.innerHTML = '<div class="gs-loading"><div class="gs-spinner"></div> Buscando...</div>';
      debounceTimer = setTimeout(function () { runSearch(q); }, DEBOUNCE_MS);
    });

    // Teclado dentro del modal
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); return; }
      if (e.key === 'Enter') { e.preventDefault(); activateSelection(); return; }
    });

    injectStyles();
  }

  // ── Abrir / Cerrar ──
  function open() {
    createModal();
    modalEl.classList.add('gs-open');
    inputEl.value = '';
    resultsEl.innerHTML = '<div class="gs-empty">Escribe al menos 2 caracteres...</div>';
    currentResults = [];
    activeIndex = -1;
    setTimeout(function () { inputEl.focus(); }, 50);
  }

  function close() {
    if (modalEl) modalEl.classList.remove('gs-open');
  }

  function isOpen() {
    return modalEl && modalEl.classList.contains('gs-open');
  }

  // ── Navegacion con teclado ──
  function moveSelection(dir) {
    if (!currentResults.length) return;
    activeIndex += dir;
    if (activeIndex < 0) activeIndex = currentResults.length - 1;
    if (activeIndex >= currentResults.length) activeIndex = 0;
    highlightActive();
  }

  function highlightActive() {
    var items = resultsEl.querySelectorAll('.gs-item');
    items.forEach(function (el, i) {
      el.classList.toggle('gs-active', i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function activateSelection() {
    if (activeIndex >= 0 && activeIndex < currentResults.length) {
      navigateTo(currentResults[activeIndex]);
    }
  }

  // ── Busqueda ──
  async function runSearch(query) {
    var q = query.toLowerCase();
    try {
      var results = await Promise.all([
        searchClients(q),
        searchProducts(q),
        searchInvoices(q),
        searchQuotes(q),
        searchTransactions(q)
      ]);
      var all = [].concat.apply([], results);
      currentResults = all;
      activeIndex = -1;
      renderResults(all, query);
    } catch (err) {
      console.error('Global search error:', err);
      resultsEl.innerHTML = '<div class="gs-empty">Error al buscar. Intenta de nuevo.</div>';
    }
  }

  // ── Consultas a Supabase ──
  function getSupabase() {
    return window.supabaseClient;
  }

  async function searchClients(q) {
    var sb = getSupabase();
    if (!sb) return [];
    var { data } = await sb
      .from('clientes')
      .select('id, nombre_razon_social, identificador, email, ciudad')
      .or('nombre_razon_social.ilike.%' + q + '%,identificador.ilike.%' + q + '%,email.ilike.%' + q + '%')
      .order('nombre_razon_social')
      .limit(MAX_PER_CATEGORY);
    if (!data) return [];
    return data.map(function (c) {
      return {
        category: 'Cliente',
        icon: 'client',
        title: c.nombre_razon_social,
        subtitle: [c.identificador, c.email, c.ciudad].filter(Boolean).join(' · '),
        url: basePath() + 'users.html?highlight=' + c.id,
        id: c.id
      };
    });
  }

  async function searchProducts(q) {
    var sb = getSupabase();
    if (!sb) return [];
    var { data } = await sb
      .from('productos')
      .select('id, nombre, referencia, precio_venta')
      .or('nombre.ilike.%' + q + '%,referencia.ilike.%' + q + '%')
      .order('nombre')
      .limit(MAX_PER_CATEGORY);
    if (!data) return [];
    return data.map(function (p) {
      return {
        category: 'Producto',
        icon: 'product',
        title: p.nombre,
        subtitle: [p.referencia, p.precio_venta != null ? formatMoney(p.precio_venta) : null].filter(Boolean).join(' · '),
        url: basePath() + 'productos.html?highlight=' + p.id,
        id: p.id
      };
    });
  }

  async function searchInvoices(q) {
    var sb = getSupabase();
    if (!sb) return [];
    var { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    var { data } = await sb
      .from('invoices')
      .select('id, invoice_number, client_name, total, status, issue_date')
      .eq('user_id', user.id)
      .or('invoice_number.ilike.%' + q + '%,client_name.ilike.%' + q + '%')
      .order('created_at', { ascending: false })
      .limit(MAX_PER_CATEGORY);
    if (!data) return [];
    return data.map(function (inv) {
      var statusLabel = inv.status === 'issued' ? 'Emitida' : inv.status === 'draft' ? 'Borrador' : inv.status;
      var page = inv.status === 'draft' ? 'invoices/drafts.html' : 'invoices/issued.html';
      return {
        category: 'Factura',
        icon: 'invoice',
        title: (inv.invoice_number || 'Sin numero') + ' - ' + (inv.client_name || ''),
        subtitle: [statusLabel, inv.issue_date, inv.total != null ? formatMoney(inv.total) : null].filter(Boolean).join(' · '),
        url: basePath() + page + '?highlight=' + inv.id,
        id: inv.id
      };
    });
  }

  async function searchQuotes(q) {
    var sb = getSupabase();
    if (!sb) return [];
    var { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    var { data } = await sb
      .from('quotes')
      .select('id, invoice_number, client_name, total, status, issue_date')
      .eq('user_id', user.id)
      .or('invoice_number.ilike.%' + q + '%,client_name.ilike.%' + q + '%')
      .order('created_at', { ascending: false })
      .limit(MAX_PER_CATEGORY);
    if (!data) return [];
    return data.map(function (qt) {
      var statusLabel = qt.status === 'issued' ? 'Emitido' : qt.status === 'draft' ? 'Borrador' : qt.status;
      var page = qt.status === 'draft' ? 'invoices/quote-drafts.html' : 'invoices/quote-issued.html';
      return {
        category: 'Presupuesto',
        icon: 'quote',
        title: (qt.invoice_number || 'Sin numero') + ' - ' + (qt.client_name || ''),
        subtitle: [statusLabel, qt.issue_date, qt.total != null ? formatMoney(qt.total) : null].filter(Boolean).join(' · '),
        url: basePath() + page + '?highlight=' + qt.id,
        id: qt.id
      };
    });
  }

  async function searchTransactions(q) {
    var sb = getSupabase();
    if (!sb) return [];
    var { data } = await sb
      .from('transacciones')
      .select('id, concepto, importe, tipo, fecha, categoria')
      .ilike('concepto', '%' + q + '%')
      .order('fecha', { ascending: false })
      .limit(MAX_PER_CATEGORY);
    if (!data) return [];
    return data.map(function (t) {
      var tipo = t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
      return {
        category: 'Transaccion',
        icon: 'transaction',
        title: t.concepto,
        subtitle: [tipo, t.fecha, t.importe != null ? formatMoney(t.importe) : null, t.categoria].filter(Boolean).join(' · '),
        url: basePath() + 'expenses.html?highlight=' + t.id,
        id: t.id
      };
    });
  }

  // ── Renderizado ──
  var ICONS = {
    client: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    product: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>',
    invoice: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
    quote: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
    transaction: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
  };

  var CATEGORY_COLORS = {
    Cliente: '#3b82f6',
    Producto: '#8b5cf6',
    Factura: '#ec8228',
    Presupuesto: '#10b981',
    Transaccion: '#f59e0b'
  };

  function renderResults(items, query) {
    if (!items.length) {
      resultsEl.innerHTML = '<div class="gs-empty">No se encontraron resultados para "<strong>' + esc(query) + '</strong>"</div>';
      return;
    }

    // Agrupar por categoria
    var groups = {};
    items.forEach(function (item) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    var html = '';
    var idx = 0;
    Object.keys(groups).forEach(function (cat) {
      var color = CATEGORY_COLORS[cat] || '#6b7280';
      html += '<div class="gs-category" style="color:' + color + '">' + esc(cat) + 's</div>';
      groups[cat].forEach(function (item) {
        var icon = ICONS[item.icon] || '';
        html += '<div class="gs-item" data-index="' + idx + '" style="--cat-color:' + color + '">' +
          '<span class="gs-item-icon" style="color:' + color + '">' + icon + '</span>' +
          '<div class="gs-item-text">' +
            '<span class="gs-item-title">' + highlightMatch(esc(item.title), query) + '</span>' +
            '<span class="gs-item-sub">' + esc(item.subtitle) + '</span>' +
          '</div>' +
          '<span class="gs-item-badge" style="background:' + color + '15;color:' + color + '">' + esc(item.category) + '</span>' +
        '</div>';
        idx++;
      });
    });

    resultsEl.innerHTML = html;

    // Click en resultados
    resultsEl.querySelectorAll('.gs-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var i = parseInt(el.dataset.index);
        if (currentResults[i]) navigateTo(currentResults[i]);
      });
      el.addEventListener('mouseenter', function () {
        activeIndex = parseInt(el.dataset.index);
        highlightActive();
      });
    });
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return text.replace(re, '<mark class="gs-mark">$1</mark>');
  }

  function navigateTo(item) {
    close();
    window.location.href = item.url;
  }

  // ── Atajo global Ctrl+K ──
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen()) close(); else open();
    }
    if (e.key === 'Escape' && isOpen()) {
      close();
    }
  });

  // ── Estilos ──
  function injectStyles() {
    if (document.getElementById('gs-styles')) return;
    var style = document.createElement('style');
    style.id = 'gs-styles';
    style.textContent =
      '#global-search-modal { display:none; position:fixed; inset:0; z-index:9999; }' +
      '#global-search-modal.gs-open { display:flex; align-items:flex-start; justify-content:center; padding-top:min(20vh,120px); }' +
      '.gs-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); animation:gsFadeIn .15s ease; }' +
      '.gs-dialog { position:relative; width:95%; max-width:640px; background:#fff; border-radius:16px; box-shadow:0 25px 60px rgba(0,0,0,0.2); overflow:hidden; animation:gsSlideIn .2s ease; }' +
      '.dark .gs-dialog { background:#1a1d2e; box-shadow:0 25px 60px rgba(0,0,0,0.5); }' +
      '.gs-input-row { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid #e5e7eb; }' +
      '.dark .gs-input-row { border-color:#2d3148; }' +
      '.gs-icon { flex-shrink:0; }' +
      '#gs-input { flex:1; border:none; outline:none; background:transparent; font-size:16px; color:#1f2937; font-family:inherit; }' +
      '.dark #gs-input { color:#f3f4f6; }' +
      '#gs-input::placeholder { color:#9ca3af; }' +
      '.gs-kbd { flex-shrink:0; padding:2px 8px; font-size:11px; font-family:inherit; background:#f3f4f6; color:#6b7280; border:1px solid #d1d5db; border-radius:6px; }' +
      '.dark .gs-kbd { background:#2d3148; color:#9ca3af; border-color:#3d4160; }' +
      '.gs-results { max-height:min(60vh,420px); overflow-y:auto; padding:8px; }' +
      '.gs-results::-webkit-scrollbar { width:6px; }' +
      '.gs-results::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:3px; }' +
      '.dark .gs-results::-webkit-scrollbar-thumb { background:#3d4160; }' +
      '.gs-empty { padding:32px 20px; text-align:center; color:#9ca3af; font-size:14px; }' +
      '.gs-loading { padding:32px 20px; text-align:center; color:#9ca3af; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px; }' +
      '.gs-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#ec8228; border-radius:50%; animation:gsSpin .6s linear infinite; }' +
      '.gs-category { padding:8px 12px 4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }' +
      '.gs-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; cursor:pointer; transition:background .12s; }' +
      '.gs-item:hover, .gs-item.gs-active { background:#f3f4f6; }' +
      '.dark .gs-item:hover, .dark .gs-item.gs-active { background:#252840; }' +
      '.gs-item-icon { flex-shrink:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:color-mix(in srgb, var(--cat-color) 10%, transparent); }' +
      '.gs-item-text { flex:1; min-width:0; display:flex; flex-direction:column; }' +
      '.gs-item-title { font-size:14px; font-weight:500; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
      '.dark .gs-item-title { color:#f3f4f6; }' +
      '.gs-item-sub { font-size:12px; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
      '.gs-item-badge { flex-shrink:0; font-size:10px; font-weight:600; padding:2px 8px; border-radius:6px; }' +
      '.gs-mark { background:#ec822833; color:inherit; border-radius:2px; padding:0 1px; }' +
      '@keyframes gsFadeIn { from{opacity:0} to{opacity:1} }' +
      '@keyframes gsSlideIn { from{opacity:0;transform:translateY(-12px)scale(.98)} to{opacity:1;transform:none} }' +
      '@keyframes gsSpin { to{transform:rotate(360deg)} }' +
      '@media(max-width:640px){ .gs-dialog{width:100%;max-width:100%;border-radius:0;margin-top:0;} #global-search-modal.gs-open{padding-top:0;align-items:flex-start;} }';
    document.head.appendChild(style);
  }

  // Exponer para que el header pueda abrir el buscador
  window.globalSearch = { open: open, close: close };
})();
