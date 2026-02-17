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
