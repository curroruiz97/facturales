/**
 * Load Components Module
 * Carga dinámica de componentes de layout (sidebar y header)
 * desde archivos HTML centralizados
 */

/**
 * Detecta la ruta base según la ubicación de la página actual
 * @returns {string} Ruta base para acceder a la carpeta components
 */
function getBasePath() {
  const path = window.location.pathname;
  
  // Si estamos en una subcarpeta (invoices, billing, etc.)
  if (path.includes('/invoices/') || path.includes('/billing/')) {
    return '../';
  }
  
  // Si estamos en la raíz
  return './';
}

/**
 * Carga los componentes de layout (sidebar y header)
 * desde archivos HTML y los inyecta en el DOM
 */
async function loadComponents() {
  try {
    console.log('🔄 Cargando componentes de layout...');
    
    const basePath = getBasePath();
    const componentsPath = `${basePath}components/`;
    
    // Cargar ambos componentes en paralelo para mejor performance
    const [sidebarResponse, headerResponse] = await Promise.all([
      fetch(`${componentsPath}sidebar.html`),
      fetch(`${componentsPath}header-unified.html`)
    ]);
    
    // Verificar que las respuestas sean exitosas
    if (!sidebarResponse.ok) {
      throw new Error(`Error al cargar sidebar: ${sidebarResponse.status}`);
    }
    if (!headerResponse.ok) {
      throw new Error(`Error al cargar header: ${headerResponse.status}`);
    }
    
    // Obtener el HTML de ambos componentes
    const sidebarHTML = await sidebarResponse.text();
    const headerHTML = await headerResponse.text();
    
    // Insertar en el DOM
    const sidebarContainer = document.getElementById('sidebar-container');
    const headerContainer = document.getElementById('header-container');
    
    if (sidebarContainer) {
      sidebarContainer.innerHTML = sidebarHTML;
      console.log('✅ Sidebar cargado');
    } else {
      console.warn('⚠️ Contenedor #sidebar-container no encontrado');
    }
    
    if (headerContainer) {
      headerContainer.innerHTML = headerHTML;
      console.log('✅ Header cargado');
    } else {
      console.warn('⚠️ Contenedor #header-container no encontrado');
    }
    
    // Actualizar título del header según la página actual
    updatePageTitle();
    
    // Vincular theme toggle del sidebar (móvil) al mismo comportamiento que el del header
    initSidebarThemeToggle();
    
    // Vincular buscador global del header
    initHeaderSearch();
    
    console.log('✅ Componentes de layout cargados correctamente');
    
    // Disparar evento personalizado para notificar que los componentes están listos
    const event = new CustomEvent('componentsLoaded', { 
      detail: { sidebar: true, header: true } 
    });
    document.dispatchEvent(event);
    console.log('✅ Evento componentsLoaded disparado');
    
  } catch (error) {
    console.error('❌ Error al cargar componentes:', error);
    console.error('Asegúrate de estar ejecutando la aplicación desde un servidor local (no file://)');
  }
}

/**
 * Conecta el botón de tema del sidebar (visible en móvil) con la lógica de dark mode
 */
function initSidebarThemeToggle() {
  const btn = document.getElementById('sidebar-theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      html.classList.add('dark');
      localStorage.theme = 'dark';
    }
  });
}

/**
 * Actualiza el título del header según la ruta de la página actual
 */
function updatePageTitle() {
  const titleEl = document.getElementById('page-title');
  if (!titleEl) return;

  const path = window.location.pathname.replace(/\/$/, '');

  const pageTitles = {
    '': 'Panel de control',
    '/index.html': 'Panel de control',
    '/index': 'Panel de control',
    '/expenses.html': 'Transacciones',
    '/expenses': 'Transacciones',
    '/users.html': 'Contactos',
    '/users': 'Contactos',
    '/settings.html': 'Configuración',
    '/settings': 'Configuración',
    '/integrations.html': 'Integraciones',
    '/integrations': 'Integraciones',
    '/support-ticket.html': 'Soporte',
    '/support-ticket': 'Soporte',
    '/invoices/new.html': 'Emitir factura',
    '/invoices/new': 'Emitir factura',
    '/invoices/drafts.html': 'Borradores de facturas',
    '/invoices/drafts': 'Borradores de facturas',
    '/invoices/issued.html': 'Facturas emitidas',
    '/invoices/issued': 'Facturas emitidas',
    '/invoices/quote.html': 'Emitir presupuesto',
    '/invoices/quote': 'Emitir presupuesto',
    '/invoices/quote-drafts.html': 'Borradores de presupuestos',
    '/invoices/quote-drafts': 'Borradores de presupuestos',
    '/invoices/quote-issued.html': 'Presupuestos emitidos',
    '/invoices/quote-issued': 'Presupuestos emitidos',
  };

  const title = pageTitles[path] || pageTitles[path.replace('.html', '')] || 'Panel de control';
  titleEl.textContent = title;
}

/**
 * Buscador global del header: filtra listas en la página actual o navega a Transacciones/Contactos
 */
function initHeaderSearch() {
  const searchInput = document.getElementById('search');
  if (!searchInput) return;

  searchInput.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    const path = window.location.pathname;

    // En Transacciones: usar el buscador local
    if (path.includes('expenses')) {
      const localSearch = document.getElementById('transactionSearch');
      if (localSearch) {
        localSearch.value = query;
        localSearch.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (typeof window.handleSearchTransactions === 'function') window.handleSearchTransactions();
      return;
    }

    // En Contactos: usar el buscador local si existe
    if (path.includes('users')) {
      const localSearch = document.getElementById('users-search');
      if (localSearch) {
        localSearch.value = query;
        localSearch.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }

    // En Borradores
    if (path.includes('drafts')) {
      const localSearch = document.getElementById('drafts-search');
      if (localSearch) {
        localSearch.value = query;
        if (typeof window.handleSearchDrafts === 'function') window.handleSearchDrafts(query);
        return;
      }
    }

    // En Facturas emitidas
    if (path.includes('issued')) {
      const localSearch = document.getElementById('issued-search');
      if (localSearch) {
        localSearch.value = query;
        if (typeof window.handleSearchIssued === 'function') window.handleSearchIssued(query);
        return;
      }
    }

    // Desde cualquier otra página: navegar a Transacciones con parámetro de búsqueda
    window.location.href = (path.includes('/invoices/') ? '../' : './') + 'expenses.html?search=' + encodeURIComponent(query);
  });
}

/**
 * Inicializar cuando el DOM esté listo
 */
(function initLoadComponents() {
  if (document.readyState === 'loading') {
    // DOM aún cargando, esperar al evento
    document.addEventListener('DOMContentLoaded', loadComponents);
  } else {
    // DOM ya está listo, ejecutar inmediatamente
    loadComponents();
  }
})();
